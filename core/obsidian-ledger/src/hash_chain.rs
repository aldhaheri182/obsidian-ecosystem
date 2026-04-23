// ============================================================================
// core/obsidian-ledger/src/hash_chain.rs
// Authorized by: ADR 0003.
//
// The canonical byte representation used for BOTH hashing AND signing an
// entry is CBOR of a struct containing exactly the fields we want to cover
// (sequence, previous_hash, unsigned). The signature field is excluded by
// construction (it's the output of the signing operation, not an input).
//
// We define a dedicated `Digestable` struct so the serialization contract is
// written down in code and cannot drift from the `LedgerEntry` shape silently.
// ============================================================================

//! Hash-chain + signing byte canonicalization for ledger entries.

use crate::entry::{LedgerEntry, UnsignedEntry};
use crate::error::{LedgerError, Result};
use serde::Serialize;
use sha3::{Digest, Sha3_256};

/// The exact byte shape that participates in the chain hash AND the signature.
///
/// ORDER MATTERS: serde_cbor emits fields in struct-declaration order in
/// canonical mode, so we pin the layout deliberately.
#[derive(Serialize)]
struct Digestable<'a> {
    sequence: u64,
    #[serde(with = "serde_bytes")]
    previous_hash: &'a [u8],
    unsigned: &'a UnsignedEntry,
}

/// Return the canonical bytes covered by the signature and included in the
/// chain hash of entry `i+1`.
pub fn canonical_bytes(sequence: u64, previous_hash: &[u8], unsigned: &UnsignedEntry) -> Result<Vec<u8>> {
    let d = Digestable { sequence, previous_hash, unsigned };
    Ok(serde_cbor::to_vec(&d)?)
}

/// Compute the SHA3-256 hash used as the `previous_hash` of the next entry.
pub fn compute_chain_hash(entry: &LedgerEntry) -> Result<[u8; 32]> {
    let bytes = canonical_bytes(entry.sequence, &entry.previous_hash, &entry.unsigned)?;
    let mut h = Sha3_256::new();
    h.update(&bytes);
    Ok(h.finalize().into())
}

/// Compute the chain hash for a yet-to-be-appended entry.
pub fn compute_chain_hash_unsigned(
    sequence: u64,
    previous_hash: &[u8],
    unsigned: &UnsignedEntry,
) -> Result<[u8; 32]> {
    let bytes = canonical_bytes(sequence, previous_hash, unsigned)?;
    let mut h = Sha3_256::new();
    h.update(&bytes);
    Ok(h.finalize().into())
}

/// Verify that the `previous_hash` stored on `next` matches the computed chain
/// hash of `prev`.
pub fn verify_link(prev: &LedgerEntry, next: &LedgerEntry) -> Result<()> {
    let expected = compute_chain_hash(prev)?;
    if next.previous_hash.as_slice() != expected.as_slice() {
        return Err(LedgerError::ChainIntegrity {
            sequence: next.sequence,
            reason: "previous_hash does not match hash of previous entry".into(),
        });
    }
    Ok(())
}
