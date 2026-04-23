// ============================================================================
// core/obsidian-agent-rs/src/agent.rs
//
// Authorized by: spec Part 5.2 (Agent Base Template); ADR 0002.
// ============================================================================

//! The `ObsidianAgent` trait.

use crate::context::AgentContext;
use crate::lifecycle::Lifecycle;
use crate::metadata::AgentMetadata;
use async_trait::async_trait;

/// The contract every Rust agent must satisfy.
///
/// ## Invocation order under the supervisor
///
/// 1. Agent is constructed (by the factory registered on `AgentSpec`).
/// 2. Supervisor calls `init(&mut self, &ctx)`. Agent SHOULD:
///    - subscribe to all topics it cares about,
///    - reconstruct any long-lived state from its ledger (M1+),
///    - prepare internal buffers and connections.
///    On success `init` returns `Ok(())`. On failure the supervisor
///    classifies the agent as `Error` and retries after backoff.
/// 3. Supervisor calls `run(&mut self, &ctx)`. This is the agent's
///    main loop. It SHOULD:
///    - loop on its subscriptions,
///    - `select!` against `ctx.shutdown.cancelled()` so shutdown is
///      prompt,
///    - return `Ok(())` ONLY when shutdown was observed.
///    If `run` returns `Err`, the supervisor calls `shutdown` then restarts
///    (new instance) after backoff.
/// 4. On normal or restart-triggered termination, supervisor calls
///    `shutdown(&mut self, &ctx)`. Agents SHOULD flush pending work,
///    close external resources, and not publish new messages.
///
/// ## `status()` is advisory
///
/// The supervisor's lifecycle tracking (`Lifecycle`) is authoritative for
/// restart decisions. The agent's `status()` method feeds the Heartbeat
/// message's `status` field, so operators (and later the Iris anomaly
/// detector) see what the agent *thinks* it is doing. A healthy agent
/// should return `Lifecycle::Active`; a self-identified-sick agent can
/// return `Lifecycle::Error` which triggers an alert without requiring a
/// crash.
#[async_trait]
pub trait ObsidianAgent: Send + 'static {
    /// Return immutable metadata for the agent. Supervisors call this at
    /// registration time and again during heartbeat emission.
    fn metadata(&self) -> &AgentMetadata;

    /// One-time setup before the main loop. Default: noop.
    async fn init(&mut self, _ctx: &AgentContext) -> crate::Result<()> {
        Ok(())
    }

    /// Main loop. Must return when `ctx.shutdown.cancelled().await`
    /// completes.
    async fn run(&mut self, ctx: &AgentContext) -> crate::Result<()>;

    /// One-time teardown. Default: noop. Called once after `run` exits,
    /// on both graceful shutdown and restart paths.
    async fn shutdown(&mut self, _ctx: &AgentContext) -> crate::Result<()> {
        Ok(())
    }

    /// Current self-reported status. Default: `Active`.
    fn status(&self) -> Lifecycle {
        Lifecycle::Active
    }
}
