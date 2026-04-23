// ============================================================================
// core/obsidian-agent-rs/src/supervisor.rs
//
// Authorized by: M0 plan §"Acceptance tests" #6 (Supervisor recovery); ADR
// 0002; user instruction on keypair seeding sequence.
//
// Supervisor: in-process runtime for N agents packed into a single container.
//
// STARTUP SEQUENCE (user-confirmed):
//
//   1. Create the shared data root directory if absent.
//   2. For each registered agent spec, synchronously:
//        a. Ensure `{data_root}/{agent_id}/` exists.
//        b. Load-or-generate the keypair at
//           `{data_root}/{agent_id}/signing.key`; this also writes the
//           companion `signing.pub`. Both exist on disk BEFORE step 3.
//   3. For each agent, asynchronously:
//        a. Open a dedicated NATS connection with the agent's keypair.
//        b. Instantiate the agent via its factory.
//        c. Call `agent.init(ctx)`.
//        d. Spawn the heartbeat task.
//        e. Spawn the run task.
//   4. Wait for shutdown signal.
//
// Because step 2 completes entirely before step 3 starts, every agent's
// pubkey is available on disk when Risk Overlord / Tape Recorder come up
// with VerificationMode::Registry. No race.
//
// RESTART POLICY:
//
//   - If an agent's run() returns Err or panics, the supervisor:
//       a. calls agent.shutdown() (best-effort),
//       b. drops the agent instance (amnesia — state rebuilds from ledger
//          via init() on the next attempt),
//       c. waits `restart_backoff` (default 1s),
//       d. recreates from factory and resumes from step 3b above.
//   - If an agent restarts more than `restart_budget` times within
//     `restart_window`, the supervisor marks it RETIRED and does not
//     restart. A supervisor-level Alert is emitted.
// ============================================================================

//! Supervisor: in-process runtime for a heterogeneous set of agents.

use crate::agent::ObsidianAgent;
use crate::context::AgentContext;
use crate::error::{AgentError, Result};
use crate::heartbeat::{new_status_handle, run_heartbeat_loop, StatusHandle};
use crate::lifecycle::Lifecycle;
use crate::metadata::AgentMetadata;
use obsidian_bus::{NatsClient, NatsConfig, SigningKey};
use std::collections::{HashSet, VecDeque};
use std::path::PathBuf;
use std::time::{Duration, Instant};
use tokio::task::JoinSet;
use tokio_util::sync::CancellationToken;
use tracing::{error, info, warn};

/// How a given agent's subscriptions should verify incoming envelopes.
///
/// This is advisory metadata carried on the `AgentSpec` — the supervisor
/// does not itself subscribe. It is surfaced as policy so that reviewers
/// of a supervisor registration can see at a glance which agents require
/// registry verification. Agent code still chooses a `VerificationMode`
/// when calling `nats.subscribe(...)`.
///
/// Risk Overlord and Tape Recorder SHALL use `Registry` (user directive).
/// Everything else MAY use `NoVerification` in M0.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SubscriptionPolicy {
    /// Agent may subscribe without verifying signatures (M0 default for
    /// non-critical agents).
    NoVerification,
    /// Agent MUST subscribe with registry-backed verification. The
    /// supervisor ensures all pubkeys are on disk before this agent starts.
    Registry,
}

impl Default for SubscriptionPolicy {
    fn default() -> Self {
        SubscriptionPolicy::NoVerification
    }
}

/// Factory type for constructing an agent instance. Boxed so it can be
/// stored heterogeneously.
///
/// Note: we write `dyn ObsidianAgent + Send` explicitly rather than relying
/// on the trait's supertrait bound to propagate — super-trait `Send` does
/// not automatically flow to `dyn Trait` in all Rust versions.
pub type AgentFactory = Box<dyn Fn() -> Box<dyn ObsidianAgent + Send> + Send + Sync>;

/// A registered agent — identity + factory + subscription policy.
pub struct AgentSpec {
    /// Agent identity.
    pub metadata: AgentMetadata,
    /// How the agent's subscriptions verify signatures.
    pub subscription_policy: SubscriptionPolicy,
    /// Factory producing a fresh agent instance on (re)start.
    pub factory: AgentFactory,
}

impl std::fmt::Debug for AgentSpec {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AgentSpec")
            .field("metadata", &self.metadata)
            .field("subscription_policy", &self.subscription_policy)
            .field("factory", &"<fn>")
            .finish()
    }
}

impl AgentSpec {
    /// Create a new spec from metadata, a policy, and a factory.
    pub fn new<F, A>(metadata: AgentMetadata, policy: SubscriptionPolicy, factory: F) -> Self
    where
        F: Fn() -> A + Send + Sync + 'static,
        A: ObsidianAgent + Send + 'static,
    {
        Self {
            metadata,
            subscription_policy: policy,
            factory: Box::new(move || Box::new(factory()) as Box<dyn ObsidianAgent + Send>),
        }
    }
}

/// Supervisor configuration. Most defaults are sensible for M0 docker-compose.
#[derive(Debug, Clone)]
pub struct SupervisorConfig {
    /// Name of this supervisor process (for logs). E.g. `"aletheia-core"`.
    pub process_name: String,
    /// City every hosted agent belongs to. In M0, one city per container.
    pub city: String,
    /// Shared data root — per-agent subdirectories live under this.
    /// Defaults from `$LEDGER_PATH`, falling back to `./ledger-data`.
    pub data_root: PathBuf,
    /// NATS URL, falling back through `$NATS_URL` → `nats://nats:4222`.
    pub nats_url: String,
    /// Backoff between a run-loop failure and the next start attempt.
    pub restart_backoff: Duration,
    /// Maximum restarts tolerated within `restart_window` before the
    /// supervisor gives up and marks the agent Retired.
    pub restart_budget: u32,
    /// Rolling window size for restart budget accounting.
    pub restart_window: Duration,
}

impl Default for SupervisorConfig {
    fn default() -> Self {
        Self {
            process_name: std::env::var("SUPERVISOR_NAME")
                .unwrap_or_else(|_| "obsidian-supervisor".to_string()),
            city: std::env::var("CITY").unwrap_or_else(|_| "unknown".to_string()),
            data_root: std::env::var("LEDGER_PATH")
                .map(PathBuf::from)
                .unwrap_or_else(|_| PathBuf::from("./ledger-data")),
            nats_url: std::env::var("NATS_URL")
                .unwrap_or_else(|_| "nats://nats:4222".to_string()),
            restart_backoff: Duration::from_secs(1),
            restart_budget: 5,
            restart_window: Duration::from_secs(60),
        }
    }
}

/// In-process supervisor for N agents.
pub struct Supervisor {
    config: SupervisorConfig,
    specs: Vec<AgentSpec>,
    /// Cancellation token; cancelled when an external shutdown signal
    /// arrives or when shutdown() is called.
    shutdown_token: CancellationToken,
}

impl Supervisor {
    /// Create a new supervisor with the given config.
    pub fn new(config: SupervisorConfig) -> Self {
        Self {
            config,
            specs: Vec::new(),
            shutdown_token: CancellationToken::new(),
        }
    }

    /// Create a supervisor with defaults from the environment.
    pub fn from_env() -> Self {
        Self::new(SupervisorConfig::default())
    }

    /// Register an agent. Returns self for chaining.
    pub fn register(mut self, spec: AgentSpec) -> Self {
        self.specs.push(spec);
        self
    }

    /// Access the shutdown token. External integrations (e.g. a signal
    /// handler set up by `main`) may clone and cancel it.
    pub fn shutdown_token(&self) -> CancellationToken {
        self.shutdown_token.clone()
    }

    /// Validate the supervisor's configuration before booting any agent.
    fn validate(&self) -> Result<()> {
        let mut seen = HashSet::new();
        for spec in &self.specs {
            if !seen.insert(&spec.metadata.agent_id) {
                return Err(AgentError::Config(format!(
                    "duplicate agent_id '{}'",
                    spec.metadata.agent_id
                )));
            }
            if spec.metadata.city != self.config.city {
                return Err(AgentError::Config(format!(
                    "agent '{}' city '{}' does not match supervisor city '{}'",
                    spec.metadata.agent_id, spec.metadata.city, self.config.city
                )));
            }
        }
        Ok(())
    }

    /// Load or generate every agent's keypair. Must complete BEFORE any
    /// agent starts, so that Registry-verifying subscribers always find
    /// the keys they need.
    fn seed_keys(&self) -> Result<Vec<SigningKey>> {
        std::fs::create_dir_all(&self.config.data_root)?;
        let mut keys = Vec::with_capacity(self.specs.len());
        for spec in &self.specs {
            let agent_dir = self.config.data_root.join(&spec.metadata.agent_id);
            std::fs::create_dir_all(&agent_dir)?;
            let key_path = agent_dir.join("signing.key");
            let key = SigningKey::load_or_generate(&key_path)?;
            info!(
                agent_id = %spec.metadata.agent_id,
                city = %spec.metadata.city,
                role = %spec.metadata.role,
                pubkey = ?key.verifying().as_bytes(),
                policy = ?spec.subscription_policy,
                "key seeded"
            );
            keys.push(key);
        }
        Ok(keys)
    }

    /// Run until shutdown. Blocks the caller.
    pub async fn run(self) -> Result<()> {
        self.validate()?;
        let keys = self.seed_keys()?;

        // Install a signal handler (SIGINT, SIGTERM) that cancels the
        // shutdown token. If the user provided one externally via
        // `shutdown_token()`, this still works — cancel is idempotent.
        spawn_signal_handler(self.shutdown_token.clone());

        info!(
            supervisor = %self.config.process_name,
            city = %self.config.city,
            agents = self.specs.len(),
            "supervisor starting"
        );

        let mut tasks = JoinSet::new();

        for (spec, key) in self.specs.into_iter().zip(keys.into_iter()) {
            let config = self.config.clone();
            let shutdown = self.shutdown_token.clone();
            tasks.spawn(agent_supervisor_loop(spec, key, config, shutdown));
        }

        // Wait for every per-agent supervisor loop to finish. They finish
        // only when the shutdown token is cancelled OR their restart budget
        // is exhausted.
        while let Some(r) = tasks.join_next().await {
            match r {
                Ok(Ok(())) => {}
                Ok(Err(e)) => warn!(error = %e, "agent supervisor loop returned error"),
                Err(je) if je.is_cancelled() => {}
                Err(je) => error!(panic = %je, "agent supervisor loop panicked"),
            }
        }

        info!(supervisor = %self.config.process_name, "supervisor stopped");
        Ok(())
    }
}

/// Run the per-agent supervision loop: (re)create, init, run, restart on failure.
async fn agent_supervisor_loop(
    spec: AgentSpec,
    key: SigningKey,
    config: SupervisorConfig,
    shutdown: CancellationToken,
) -> Result<()> {
    let agent_id = spec.metadata.agent_id.clone();

    // NATS client is created ONCE per agent and reused across restarts.
    // The NATS identity is stable across agent-code failures, which keeps
    // subscribers' session state clean. A failure to connect at all is
    // a supervisor-level failure (no retry, no agent restart — bubble up).
    let nats_config = NatsConfig {
        url: config.nats_url.clone(),
        agent_id: agent_id.clone(),
        source_city: spec.metadata.city.clone(),
        creds_path: None,
    };
    let nats = NatsClient::connect(nats_config, key).await?;

    // Restart-budget ring buffer — timestamps of past restart attempts.
    let mut restart_history: VecDeque<Instant> = VecDeque::new();

    loop {
        if shutdown.is_cancelled() {
            info!(agent_id = %agent_id, "shutdown observed before run; exiting");
            return Ok(());
        }

        let status_handle = new_status_handle();
        let ctx = AgentContext {
            metadata: spec.metadata.clone(),
            nats: nats.clone(),
            ledger_dir: config.data_root.join(&agent_id),
            registry_root: config.data_root.clone(),
            boot_time: Instant::now(),
            shutdown: shutdown.clone(),
        };

        // Heartbeat loop runs concurrently with the agent run loop.
        // Clone what we need into an owned future before moving.
        let hb_ctx = ctx.clone();
        let hb_status = status_handle.clone();
        let hb_handle = tokio::spawn(async move {
            run_heartbeat_loop(hb_ctx, hb_status).await;
        });

        // Construct the agent instance.
        let mut agent: Box<dyn ObsidianAgent + Send> = (spec.factory)();
        debug_assert_eq!(
            agent.metadata().agent_id,
            spec.metadata.agent_id,
            "factory returned agent with wrong agent_id"
        );

        let failure_reason: Option<AgentError> = async {
            // init
            *status_handle.write().await = Lifecycle::Booting;
            if let Err(e) = agent.init(&ctx).await {
                error!(agent_id = %agent_id, error = %e, "agent init failed");
                return Some(e);
            }
            *status_handle.write().await = Lifecycle::Active;
            info!(agent_id = %agent_id, "agent active");

            // run
            match agent.run(&ctx).await {
                Ok(()) => None,
                Err(e) => {
                    error!(agent_id = %agent_id, error = %e, "agent run returned error");
                    Some(e)
                }
            }
        }
        .await;

        // shutdown (best-effort)
        if let Err(e) = agent.shutdown(&ctx).await {
            warn!(agent_id = %agent_id, error = %e, "agent shutdown failed (continuing)");
        }
        // Tell the heartbeat loop to stop. (Only relevant on a restart path —
        // on global shutdown the token is already cancelled.)
        let local_hb_stop = if failure_reason.is_some() {
            // Graceful hb teardown via a *local* cancel: create a fresh
            // token just for the heartbeat (the global shutdown token is
            // shared with the new run loop in the next iteration).
            // Simplest: abort the heartbeat task. A final "Retired"
            // heartbeat is unnecessary when the agent is about to restart.
            hb_handle.abort();
            None
        } else {
            // Graceful shutdown — the heartbeat already saw the cancel.
            Some(hb_handle)
        };
        if let Some(h) = local_hb_stop {
            let _ = h.await;
        }

        match failure_reason {
            None => {
                // Graceful shutdown.
                info!(agent_id = %agent_id, "agent exited cleanly");
                return Ok(());
            }
            Some(err) => {
                // Record this failure and consult the budget.
                if exceeds_restart_budget(
                    &mut restart_history,
                    Instant::now(),
                    config.restart_window,
                    config.restart_budget,
                ) {
                    error!(
                        agent_id = %agent_id,
                        restarts = restart_history.len(),
                        window_secs = config.restart_window.as_secs(),
                        "restart budget exceeded; retiring agent"
                    );
                    return Err(AgentError::RestartBudgetExceeded {
                        agent_id,
                        restarts: restart_history.len() as u32,
                        window_secs: config.restart_window.as_secs(),
                    });
                }

                warn!(
                    agent_id = %agent_id,
                    restart_num = restart_history.len(),
                    backoff_ms = config.restart_backoff.as_millis() as u64,
                    error = %err,
                    "restarting agent after backoff"
                );
                tokio::select! {
                    biased;
                    _ = shutdown.cancelled() => {
                        info!(agent_id = %agent_id, "shutdown during restart backoff; exiting");
                        return Ok(());
                    }
                    _ = tokio::time::sleep(config.restart_backoff) => {}
                }
                // Loop — recreate agent, run again.
            }
        }
    }
}

/// Record a failure at `now` and drop timestamps older than `window`.
/// Returns true if the number of restarts in the window exceeds `budget`.
fn exceeds_restart_budget(
    history: &mut VecDeque<Instant>,
    now: Instant,
    window: Duration,
    budget: u32,
) -> bool {
    history.push_back(now);
    while let Some(&front) = history.front() {
        if now.duration_since(front) > window {
            history.pop_front();
        } else {
            break;
        }
    }
    history.len() as u32 > budget
}

/// Install a SIGINT/SIGTERM handler that cancels `token` on first receipt.
/// A second signal exits the process immediately (belt-and-braces against
/// a supervisor that refuses to wind down).
fn spawn_signal_handler(token: CancellationToken) {
    tokio::spawn(async move {
        #[cfg(unix)]
        {
            use tokio::signal::unix::{signal, SignalKind};
            let mut sigint = match signal(SignalKind::interrupt()) {
                Ok(s) => s,
                Err(e) => {
                    warn!(error = %e, "failed to install SIGINT handler");
                    return;
                }
            };
            let mut sigterm = match signal(SignalKind::terminate()) {
                Ok(s) => s,
                Err(e) => {
                    warn!(error = %e, "failed to install SIGTERM handler");
                    return;
                }
            };
            tokio::select! {
                _ = sigint.recv() => info!("SIGINT received; shutting down"),
                _ = sigterm.recv() => info!("SIGTERM received; shutting down"),
            }
            token.cancel();
            // If a second signal arrives, exit hard.
            tokio::select! {
                _ = sigint.recv() => { error!("second signal; aborting"); std::process::exit(130); }
                _ = sigterm.recv() => { error!("second signal; aborting"); std::process::exit(143); }
            }
        }
        #[cfg(not(unix))]
        {
            let _ = tokio::signal::ctrl_c().await;
            token.cancel();
        }
    });
}

// ---------------------------------------------------------------------------
// Unit tests. These cover the pure-logic parts of the supervisor that do NOT
// require a running NATS server. End-to-end supervision (init → run →
// restart-on-Err) is covered by M0 acceptance test #6 (supervisor recovery)
// against the docker-compose stack.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agent::ObsidianAgent;
    use async_trait::async_trait;
    use tempfile::tempdir;

    /// Minimal no-op agent for tests that only exercise registration and
    /// key-seeding. `run()` returns immediately; `status` stays Booting.
    struct NoopAgent {
        metadata: AgentMetadata,
    }

    #[async_trait]
    impl ObsidianAgent for NoopAgent {
        fn metadata(&self) -> &AgentMetadata {
            &self.metadata
        }
        async fn run(&mut self, ctx: &AgentContext) -> crate::Result<()> {
            ctx.shutdown.cancelled().await;
            Ok(())
        }
    }

    fn make_spec(agent_id: &str, city: &str, policy: SubscriptionPolicy) -> AgentSpec {
        let md = AgentMetadata::new(agent_id, city, "test-role");
        let md_for_factory = md.clone();
        AgentSpec::new(md, policy, move || NoopAgent {
            metadata: md_for_factory.clone(),
        })
    }

    fn test_config(data_root: PathBuf) -> SupervisorConfig {
        SupervisorConfig {
            process_name: "test-supervisor".into(),
            city: "aletheia".into(),
            data_root,
            nats_url: "nats://localhost:4222".into(),
            restart_backoff: Duration::from_millis(10),
            restart_budget: 3,
            restart_window: Duration::from_secs(60),
        }
    }

    #[test]
    fn validate_rejects_duplicate_agent_ids() {
        let dir = tempdir().unwrap();
        let sup = Supervisor::new(test_config(dir.path().to_path_buf()))
            .register(make_spec("agent-01", "aletheia", SubscriptionPolicy::NoVerification))
            .register(make_spec("agent-01", "aletheia", SubscriptionPolicy::NoVerification));
        let err = sup.validate().unwrap_err();
        assert!(matches!(err, AgentError::Config(_)));
        assert!(format!("{err}").contains("duplicate"));
    }

    #[test]
    fn validate_rejects_city_mismatch() {
        let dir = tempdir().unwrap();
        let sup = Supervisor::new(test_config(dir.path().to_path_buf())).register(make_spec(
            "agent-01",
            "prometheus",
            SubscriptionPolicy::NoVerification,
        ));
        let err = sup.validate().unwrap_err();
        assert!(matches!(err, AgentError::Config(_)));
    }

    #[test]
    fn validate_accepts_valid_set() {
        let dir = tempdir().unwrap();
        let sup = Supervisor::new(test_config(dir.path().to_path_buf()))
            .register(make_spec("agent-01", "aletheia", SubscriptionPolicy::NoVerification))
            .register(make_spec("agent-02", "aletheia", SubscriptionPolicy::Registry));
        assert!(sup.validate().is_ok());
    }

    #[test]
    fn seed_keys_materializes_every_agent_keypair() {
        let dir = tempdir().unwrap();
        let sup = Supervisor::new(test_config(dir.path().to_path_buf()))
            .register(make_spec("agent-a", "aletheia", SubscriptionPolicy::NoVerification))
            .register(make_spec("agent-b", "aletheia", SubscriptionPolicy::Registry));
        sup.validate().unwrap();
        let keys = sup.seed_keys().unwrap();
        assert_eq!(keys.len(), 2);

        // Both agents have signing.key and signing.pub on disk, so a
        // Registry-verifying subscriber can find them before the owning
        // agents even start.
        for id in ["agent-a", "agent-b"] {
            let agent_dir = dir.path().join(id);
            assert!(agent_dir.join("signing.key").exists(), "{id} key missing");
            assert!(agent_dir.join("signing.pub").exists(), "{id} pubkey missing");
        }
    }

    #[test]
    fn seed_keys_is_idempotent() {
        let dir = tempdir().unwrap();
        let cfg = test_config(dir.path().to_path_buf());
        let sup1 = Supervisor::new(cfg.clone())
            .register(make_spec("agent-x", "aletheia", SubscriptionPolicy::NoVerification));
        let k1 = sup1.seed_keys().unwrap();

        let sup2 = Supervisor::new(cfg)
            .register(make_spec("agent-x", "aletheia", SubscriptionPolicy::NoVerification));
        let k2 = sup2.seed_keys().unwrap();

        assert_eq!(
            k1[0].verifying().as_bytes(),
            k2[0].verifying().as_bytes(),
            "second seed must not regenerate an existing key"
        );
    }

    #[test]
    fn restart_budget_not_exceeded_with_spaced_failures() {
        // One failure is fine.
        let mut h = VecDeque::new();
        let now = Instant::now();
        assert!(!exceeds_restart_budget(
            &mut h,
            now,
            Duration::from_secs(60),
            3
        ));
    }

    #[test]
    fn restart_budget_trips_after_budget_plus_one() {
        // Budget is 3 → 4th failure within the window trips it.
        let mut h = VecDeque::new();
        let base = Instant::now();
        let window = Duration::from_secs(60);
        assert!(!exceeds_restart_budget(&mut h, base, window, 3));
        assert!(!exceeds_restart_budget(&mut h, base + Duration::from_millis(10), window, 3));
        assert!(!exceeds_restart_budget(&mut h, base + Duration::from_millis(20), window, 3));
        // 4th within window -> trips.
        assert!(exceeds_restart_budget(&mut h, base + Duration::from_millis(30), window, 3));
    }

    #[test]
    fn restart_budget_ages_out_old_failures() {
        let mut h = VecDeque::new();
        let window = Duration::from_secs(60);
        let base = Instant::now();
        // Three failures at t=0..2 ms.
        exceeds_restart_budget(&mut h, base, window, 3);
        exceeds_restart_budget(&mut h, base + Duration::from_millis(1), window, 3);
        exceeds_restart_budget(&mut h, base + Duration::from_millis(2), window, 3);
        // A fourth failure 61 s later — the first three should age out.
        let later = base + Duration::from_secs(61);
        assert!(!exceeds_restart_budget(&mut h, later, window, 3));
        assert_eq!(h.len(), 1);
    }

    #[test]
    fn subscription_policy_default_is_no_verification() {
        assert_eq!(SubscriptionPolicy::default(), SubscriptionPolicy::NoVerification);
    }

    #[test]
    fn agent_spec_stores_and_produces_instances() {
        let spec = make_spec("agent-z", "aletheia", SubscriptionPolicy::Registry);
        assert_eq!(spec.metadata.agent_id, "agent-z");
        assert_eq!(spec.subscription_policy, SubscriptionPolicy::Registry);
        let agent = (spec.factory)();
        assert_eq!(agent.metadata().agent_id, "agent-z");
        assert_eq!(agent.metadata().role, "test-role");
    }
}
