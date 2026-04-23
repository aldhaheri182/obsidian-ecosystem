// ============================================================================
// core/obsidian-agent-rs/src/context.rs
//
// Authorized by: M0 plan §"Build order" step 3; ADR 0002.
//
// AgentContext — what the supervisor hands to an agent at init/run time.
// Dependency-injected so agents don't reach into globals, env vars, or
// directly into the filesystem for things the supervisor should own.
// ============================================================================

//! `AgentContext`: dependency bundle passed to every agent method.

use crate::metadata::AgentMetadata;
use obsidian_bus::NatsClient;
use std::path::PathBuf;
use std::time::Instant;
use tokio_util::sync::CancellationToken;

/// Everything an agent needs from the outside world.
///
/// Cheaply cloneable (internal state is `Arc`ed or `Clone` already).
#[derive(Clone)]
pub struct AgentContext {
    /// Identity of the agent this context belongs to.
    pub metadata: AgentMetadata,

    /// Pre-connected NATS client, signed with this agent's own keypair.
    /// Publish/subscribe goes through here; `NatsClient` does the envelope
    /// wrapping + signing + serialization. Publishes from this client are
    /// reflected in `messages_published()` below.
    pub nats: NatsClient,

    /// Directory this agent may read/write freely for ledger, signing
    /// material, and scratch state. Created by the supervisor before boot.
    /// `{data_root}/{agent_id}/`
    pub ledger_dir: PathBuf,

    /// Root directory that contains every agent's ledger subdirectory.
    /// Passed to `FilesystemRegistry::new(...)` when an agent subscribes
    /// with `VerificationMode::Registry`.
    pub registry_root: PathBuf,

    /// Monotonic wall-clock boot time — used by the heartbeat loop to
    /// compute `uptime_seconds`.
    pub boot_time: Instant,

    /// Shutdown signal. Agents' `run()` loops MUST poll this (via
    /// `select!` against `shutdown.cancelled()`) and return promptly.
    pub shutdown: CancellationToken,
}

impl AgentContext {
    /// Seconds elapsed since the supervisor booted this agent task.
    pub fn uptime_seconds(&self) -> u64 {
        self.boot_time.elapsed().as_secs()
    }

    /// Read the number of messages the agent's `NatsClient` has published.
    ///
    /// Source of truth is the `NatsClient`'s internal atomic counter, so
    /// this reflects every successful publish regardless of where in the
    /// agent code the publish happened.
    pub fn messages_published(&self) -> u64 {
        self.nats.messages_published()
    }

    /// Wait until the supervisor signals shutdown.
    ///
    /// Convenience wrapper; equivalent to `self.shutdown.cancelled().await`.
    pub async fn await_shutdown(&self) {
        self.shutdown.cancelled().await;
    }

    /// Whether shutdown has been requested.
    pub fn is_shutdown(&self) -> bool {
        self.shutdown.is_cancelled()
    }
}
