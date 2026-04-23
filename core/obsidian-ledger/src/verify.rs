// ============================================================================
// core/obsidian-ledger/src/verify.rs
// Authorized by: M0 plan §"Acceptance tests" #1 (Ledger immutability).
// ============================================================================

//! Chain verification.

use crate::entry::LedgerEntry;

/// Result of `Ledger::verify_chain`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ChainStatus {
    /// Every entry verifies and every link matches.
    Ok {
        /// Number of entries verified.
        entries: u64,
    },
    /// The chain is broken at `sequence`. `reason` describes the first
    /// detected violation.
    Broken {
        /// The first sequence where the break is observed.
        sequence: u64,
        /// Human-readable description.
        reason: String,
    },
}

impl ChainStatus {
    /// Did verification succeed?
    pub fn is_ok(&self) -> bool {
        matches!(self, ChainStatus::Ok { .. })
    }
}

/// Represent a break for logging / tamper test harnesses.
pub fn describe_break(entry: &LedgerEntry, reason: &str) -> ChainStatus {
    ChainStatus::Broken { sequence: entry.sequence, reason: reason.to_string() }
}
