# Layer 35 — Immortality Vault

**Core innovation:** Permanently preserved agent personalities.

When the Reaper retires an agent, its complete state — ledger, model weights, memory graph view, reflection history — is frozen in the Immortality Vault. Agents are never deleted; they are archived, and can be resurrected (Layer 7.2 Lifecycle) as new instances.

## Acceptance Criteria

- Every retired agent has a fully restorable vault entry.
- Vault size audit: no vault entry has missing components (ledger, weights, graph view, reflections).
- Resurrection test: a resurrected agent must heartbeat within 30 s and replay its full history without error.
