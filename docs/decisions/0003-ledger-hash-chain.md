# ADR 0003 — Ledger Hash Chain and Signing

**Status:** Accepted (M0).
**Date:** 2026-04-24.
**Authorizing sections:** spec Part 5.1.

## Context

The Immutable Event Ledger is the substrate for every agent's memory. If the chain can be silently altered, replay fidelity collapses, causal audits become suspect, and the entire trust model of the ecosystem fails. Conversely, the ledger is on the hot path — every observation, inference, and action produces an entry. The scheme must be both tamper-evident and fast enough to not bottleneck a signal agent.

## Decision

Every `LedgerEntry` is:

1. **CBOR-encoded** at rest (`serde_cbor`), not Protobuf. CBOR is compact, schemaless-enough to evolve, and — critically — produces canonical encodings suitable for hashing.
2. **Hash-chained** via SHA3-256: `hash(i) = SHA3-256(previous_hash || canonical_CBOR(entry_i_without_hash_and_signature))`. Genesis entry has `previous_hash = [0u8; 32]`.
3. **Signed per-entry** with Ed25519 over the same byte range the chain hash covers, using the agent's keypair.
4. **Stored** in RocksDB under keys `be_u64(sequence_number)`, with a separate column family for agent metadata (genesis details, public key, chain head).

`verify_chain()` walks the RocksDB keyspace in order and verifies both the hash linkage and every per-entry signature. It is correct to run it on every agent boot; for large ledgers it is `O(n)` but only reads.

## Rationale

- **CBOR over Protobuf at rest:** Protobuf's wire format is not canonical — the order of unknown fields and proto3 default values break byte-equality, which breaks hashing. CBOR with `serde_cbor` in canonical mode is byte-stable across writers. The cost of two encodings (Protobuf on the bus, CBOR in the ledger) is small and lets each encoding be used where it's actually good.
- **SHA3 over SHA-2:** Both are secure. SHA3 is used because its Keccak permutation is standard for newer trust-minimized systems and because `sha3` in Rust is dependency-light and audit-clean.
- **Signing per-entry, not per-chunk:** Per-entry signing makes it impossible to splice valid but reordered entries; it is verifiable without needing a trusted position reference. The Ed25519 signing cost (~50 μs) is negligible compared to the I/O cost of a RocksDB write.
- **RocksDB over SQLite/LMDB/custom:** RocksDB has stable, performant Rust bindings; column families cleanly separate metadata from the chain; snapshot export is well-documented.

## Consequences

- The ledger can be verified offline by anyone with the agent's public key.
- Archived ledgers in object storage (S3/MinIO, M1+) remain verifiable from the archive without network access to the originating node.
- Any tamper attempt that modifies an entry without re-signing is detected by signature verification. Any tamper attempt that re-signs requires the agent's private key. Key compromise is handled at the identity layer (M3+).
- **Performance budget:** The ledger `append()` path must remain under 2 ms p99. This is enforced by a benchmark in `core/obsidian-ledger/benches/append.rs` (written in M0).
