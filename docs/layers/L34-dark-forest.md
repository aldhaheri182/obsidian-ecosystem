# Layer 34 — Dark Forest Protocol

**Core innovation:** Adversarial market camouflage.

The ecosystem assumes the market is a "dark forest" populated by hostile algorithmic predators. Every externally visible action is randomized, staggered, or camouflaged to deny adversaries a usable fingerprint.

## Techniques

- **Slice randomization** — execution-slicer randomizes slice sizes ±15% and timings ±jitter.
- **Venue rotation** — same-size orders rotate across venues to avoid reading.
- **Decoy orders** — small order-spray to muddy inference (strictly within Themis boundaries; never crosses into manipulation).
- **Model shuffling** — multiple signal agents with equivalent goals but different internals, round-robin for tie-breaks.

## Acceptance Criteria

- Themis review confirms no technique crosses into spoofing, layering, or wash-trading.
- Adversarial fingerprinting test: a simulated adversary cannot predict slice timing with > 55% accuracy over 10k trades.
