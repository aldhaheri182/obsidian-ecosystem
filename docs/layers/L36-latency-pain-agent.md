# Layer 36 — Latency Pain Agent

**Core innovation:** Suffering-driven infrastructure optimization.

A dedicated agent whose only job is to complain when the ecosystem's latency worsens. Its "pain score" is a function of measured end-to-end latency vs baseline; the score is published and becomes a Hephaestus priority signal.

## Mechanisms

- Reads Chronos latency-analyzer histograms.
- Publishes `iris.pain.latency` at 1 Hz with a scalar pain score.
- Pain > threshold forces Hephaestus to raise rebalancing / node-scaling priority.

## Acceptance Criteria

- Pain correlates positively with measured end-to-end latency at r > 0.95.
- Sustained high pain produces at least one Hephaestus intervention within 15 minutes.
