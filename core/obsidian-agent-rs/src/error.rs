// ============================================================================
// core/obsidian-agent-rs/src/error.rs
//
// Authorized by: M0 plan §"Build order" step 3.
// ============================================================================

//! Error types for the obsidian-agent-rs crate.

use thiserror::Error;

/// Errors that can arise in agent lifecycle, context setup, and supervision.
///
/// Agent-internal errors during `run()` should use the agent's own error
/// types and bubble up as `AgentError::Runtime`.
#[derive(Debug, Error)]
pub enum AgentError {
    /// Bus-layer error (signing, verification, NATS I/O).
    #[error(transparent)]
    Bus(#[from] obsidian_bus::BusError),

    /// Filesystem I/O error when loading a keypair or preparing the agent's
    /// ledger directory.
    #[error("agent I/O error: {0}")]
    Io(#[from] std::io::Error),

    /// Configuration supplied to the supervisor was invalid (e.g. duplicate
    /// agent_id, empty metadata field).
    #[error("supervisor configuration error: {0}")]
    Config(String),

    /// Lifecycle transition rejected — see `lifecycle` module.
    #[error("invalid lifecycle transition: {from:?} -> {to:?}")]
    InvalidTransition {
        /// Source state.
        from: crate::lifecycle::Lifecycle,
        /// Attempted destination state.
        to: crate::lifecycle::Lifecycle,
    },

    /// The agent's `run()` returned an error. The supervisor restarts the
    /// agent after backoff.
    #[error("agent runtime error: {0}")]
    Runtime(String),

    /// The agent panicked. The supervisor restarts after backoff.
    #[error("agent panicked: {0}")]
    Panicked(String),

    /// The agent was shut down due to too many restarts in a short window.
    #[error("agent '{agent_id}' exceeded restart budget ({restarts} in {window_secs}s)")]
    RestartBudgetExceeded {
        /// Which agent.
        agent_id: String,
        /// How many restarts were observed.
        restarts: u32,
        /// Over what window.
        window_secs: u64,
    },
}

/// Crate-local result alias.
pub type Result<T> = std::result::Result<T, AgentError>;
