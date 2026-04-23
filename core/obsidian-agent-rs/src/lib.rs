// ============================================================================
// core/obsidian-agent-rs/src/lib.rs
//
// Authorized by: M0 plan §"Build order" step 3; ADR 0002.
//
// obsidian-agent-rs — base trait, context, lifecycle, supervisor for every
// Rust agent.
//
// INTENDED USE:
//
//   1. Implement `ObsidianAgent` for your agent struct.
//   2. Register an `AgentSpec` with a `Supervisor` in your binary's main().
//   3. `supervisor.run().await` blocks until SIGINT/SIGTERM or a fatal
//      supervisor-level error.
//
// THREADING MODEL (per ADR 0002):
//
//   - One tokio runtime per container.
//   - Each agent runs as its own tokio task spawned by the supervisor.
//   - Each agent task owns its own `NatsClient` with its own Ed25519 keypair;
//     no two agents in a container share a key.
//   - The supervisor spawns a sidecar heartbeat task per agent that publishes
//     `system.heartbeat.{agent_id}` at 1 Hz regardless of the agent's own
//     activity (so a stuck agent's stuckness is visible via missing heartbeats).
//   - On agent run-loop failure or panic, the supervisor drops the instance,
//     waits a small backoff, and recreates it from its factory. State is NOT
//     preserved across restarts — an agent's init() must reconstruct from the
//     ledger (when obsidian-ledger is integrated, M1+).
//
// KEYPAIR + REGISTRY SEEDING (per user instruction):
//
//   On `supervisor.run()`, BEFORE any agent task is spawned, the supervisor
//   walks every registered `AgentSpec` and calls `SigningKey::load_or_generate`
//   on the agent's expected keypair path. This materializes both
//   `signing.key` (private, 0600) and `signing.pub` (public, world-read)
//   for every agent under the shared data root. The result: when the Risk
//   Overlord or Tape Recorder come up with `VerificationMode::Registry`,
//   every pubkey they could possibly need is already on disk. No race.
// ============================================================================

#![deny(missing_docs)]
#![forbid(unsafe_code)]

//! Base runtime for Rust agents: trait, context, supervisor, lifecycle,
//! heartbeat.

pub mod agent;
pub mod context;
pub mod error;
pub mod heartbeat;
pub mod lifecycle;
pub mod metadata;
pub mod supervisor;

pub use agent::ObsidianAgent;
pub use context::AgentContext;
pub use error::{AgentError, Result};
pub use lifecycle::Lifecycle;
pub use metadata::AgentMetadata;
pub use supervisor::{AgentSpec, Supervisor, SupervisorConfig, SubscriptionPolicy};

// Re-export the bus and proto surface so agents don't need to depend on
// obsidian-bus directly. This keeps the agent crates' Cargo.toml short.
pub use obsidian_bus::proto;
pub use obsidian_bus::{
    BusError, EnvelopeBuilder, NatsClient, PublishOpts, SigningKey, Subscription,
    VerificationMode, VerifyingKey,
};
