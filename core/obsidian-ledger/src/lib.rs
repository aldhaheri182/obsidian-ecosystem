// ============================================================================
// core/obsidian-ledger/src/lib.rs
//
// Authorized by: M0 plan §"Build order" step 5; ADR 0003.
//
// obsidian-ledger — the immutable, cryptographically hash-chained ledger that
// every agent writes every observation, inference, and action into. This is
// the most critical crate in the system; if the chain breaks, everything
// downstream (replay, causal audit, trust) collapses.
//
// API surface:
//   - `LedgerEntry` + `EntryType` — the canonical in-memory record.
//   - `Ledger` — the append-only RocksDB-backed store.
//   - `ChainStatus` — result of `verify_chain()`.
//
// Guarantees:
//   - Append-only: no `delete`, no `update`. The only public write method is
//     `append`. RocksDB column families are opened in a way that enforces it.
//   - Hash-chained: `previous_hash(i+1) = SHA3-256(previous_hash(i) ||
//     CBOR(entry_i_sans_hash_and_signature))`. Genesis entry has
//     `previous_hash = [0u8; 32]`.
//   - Per-entry Ed25519 signature over the same byte range.
//   - Byte-stable: CBOR in canonical mode; the same logical entry produces the
//     same bytes across writers (including across serde_cbor versions within
//     the same major).
//
// NOT IN M0:
//   - MinIO / S3 archival (M1).
//   - Snapshot-from-tarball restore (M1).
//   - Causal-link graph queries — queries just return entries; graph traversal
//     lives in Mnemosyne (M1+).
// ============================================================================

#![deny(missing_docs)]
#![forbid(unsafe_code)]

//! Immutable, hash-chained, Ed25519-signed event ledger.

pub mod entry;
pub mod error;
pub mod hash_chain;
pub mod ledger;
pub mod replay;
pub mod verify;

pub use entry::{EntryId, EntryType, LedgerEntry, UnsignedEntry};
pub use error::{LedgerError, Result};
pub use ledger::{Ledger, LedgerConfig, RocksLedger};
pub use verify::ChainStatus;

/// Canonical byte range used to construct the signature of a `LedgerEntry`.
/// Exposed for use by tamper-test harnesses that need to produce a
/// maliciously-signed entry with the same canonicalization the real writer
/// uses. Not part of the stable agent API.
pub fn hash_chain_bytes_for_test(entry: &LedgerEntry) -> Vec<u8> {
    hash_chain::canonical_bytes(entry.sequence, &entry.previous_hash, &entry.unsigned)
        .expect("canonical serialization should not fail for a well-formed entry")
}
