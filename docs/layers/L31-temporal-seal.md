# Layer 31 — Temporal Seal

**Core innovation:** Quantum-resistant blockchain-anchored memory.

## Scope

Periodic anchoring of ledger-root hashes to a public blockchain so that the ecosystem's memory is tamper-evident even against a future attacker with advanced (including quantum-adjacent) capabilities.

## Mechanism

- Every hour, compute Merkle-root of all city ledger heads.
- Submit root to a rotating set of public chains (Bitcoin OP_RETURN, Ethereum calldata, optionally Arweave for cost).
- Anchoring tx hashes + Merkle proofs stored in Mnemosyne.

## Acceptance Criteria

- Any historical ledger state can be proven intact via on-chain evidence + local Merkle proof.
- Post-quantum hash choice documented in ADR (e.g., SHA3-256 + dual SHA-256 during transition).
- Dashboard shows last-sealed timestamp and next scheduled seal.
