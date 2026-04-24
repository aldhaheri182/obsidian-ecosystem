# Layer 46 — Entropy Engine

**Core innovation:** Alpha decay trajectory to absolute zero.

Every deployed strategy is continuously tracked on a decay trajectory. The Entropy Engine projects the date at which each strategy's alpha will statistically be indistinguishable from zero, given current market behavior. Strategies approaching entropy are rotated out before they turn negative.

## Acceptance Criteria

- Per-strategy entropy forecast is published weekly.
- Retirement trigger is automatic when projected alpha < 0 at the 80% confidence bound.
- Retired strategies' entropy curves are archived as Principles for future research.
