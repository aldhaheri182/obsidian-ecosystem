// ============================================================================
// core/obsidian-ledger/src/error.rs
// Authorized by: M0 plan §"Build order" step 5.
// ============================================================================

//! Error types for the obsidian-ledger crate.

use thiserror::Error;

/// All errors that may arise from the ledger.
#[derive(Debug, Error)]
pub enum LedgerError {
    /// RocksDB I/O error.
    #[error("rocksdb: {0}")]
    RocksDb(#[from] rocksdb::Error),

    /// Filesystem I/O error.
    #[error("I/O: {0}")]
    Io(#[from] std::io::Error),

    /// CBOR encode / decode error.
    #[error("cbor: {0}")]
    Cbor(#[from] serde_cbor::Error),

    /// A chain invariant has been violated. Almost certainly a tamper event.
    #[error("chain integrity violated at sequence {sequence}: {reason}")]
    ChainIntegrity {
        /// The first sequence where the violation is observed.
        sequence: u64,
        /// Human-readable reason.
        reason: String,
    },

    /// Ed25519 signature failed verification.
    #[error("signature invalid at sequence {sequence}")]
    SignatureInvalid {
        /// The sequence whose signature failed verification.
        sequence: u64,
    },

    /// Attempt to append out of order. Should be impossible via the public API.
    #[error("sequence out of order: expected {expected}, got {got}")]
    SequenceOutOfOrder {
        /// The sequence the ledger was expecting next.
        expected: u64,
        /// The sequence we were asked to append.
        got: u64,
    },

    /// The ledger's metadata column family is corrupt or unreadable.
    #[error("ledger metadata missing or corrupt: {0}")]
    Metadata(String),

    /// Bus-layer error (signing key loading).
    #[error(transparent)]
    Bus(#[from] obsidian_bus::BusError),
}

/// Crate-local result alias.
pub type Result<T> = std::result::Result<T, LedgerError>;
