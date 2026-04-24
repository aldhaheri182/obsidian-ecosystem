# Layer 32 — Idea Genealogy

**Core innovation:** Full intellectual lineage traceability.

Every Principle, Pattern, Signal, and Order in the system carries an explicit causal-ancestor chain — not just the immediate cause, but the complete lineage back to originating observations. This enables truly deep audit: "why did we buy AAPL on 2026-04-24 at 14:32:05?" resolves to a tree of every observation, inference, and regime-classification that influenced that decision.

## Mechanism

- `CITES` and `CAUSES` edges in the Knowledge Graph form the canonical lineage.
- A dedicated `idea-genealogist` agent computes and caches lineage DAGs nightly.
- Tape replay reproduces the lineage exactly.

## Acceptance Criteria

- Arbitrary principle → full lineage DAG query returns in < 500 ms.
- Cycles are detected and flagged.
- Dashboard view renders lineage as an interactive tree.
