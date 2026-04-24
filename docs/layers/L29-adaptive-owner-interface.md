# Layer 29 — Adaptive Owner Interface

**Core innovation:** UI that learns from Owner behavior.

## Scope

Iris monitors the Owner's interaction patterns and adapts the UI in three dimensions:

- **Attention patterns** — restructure dashboard layout so frequently-consulted panels are always on-top.
- **Stress patterns** — during drawdowns, detect rapid clicking and frequent refreshes, and surface calming data (long-run stats, historical parallel drawdowns, Themis compliance confirmation).
- **Comprehension evolution** — as the Owner demonstrates mastery, gradually shift from technical detail (Sharpe, DSR, PBO) to high-level strategic framing (narrative summaries, long-horizon outlook).

## Acceptance Criteria

- All UI adaptations are reversible and owner-toggleable from a single settings panel.
- Adaptation logs are part of the Tape and auditable.
- An adaptation that the Owner reverses twice in a week is permanently disabled.
