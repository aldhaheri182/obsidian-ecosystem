# City 8: Chronos — Time & Synchronization

Chronos is the master clock. Every timestamp in the ecosystem derives from Chronos's GPS-disciplined time source. Without Chronos, causal ordering breaks, replay determinism fails, and the system cannot function.

## Agents

- `time-oracle` (Rust): Maintains GPS-disciplined NTP/PTP master clock. Publishes `chronos.time.oracle` at exactly 1Hz with nanosecond-precision HLC timestamps.
- `event-sequencer` (Rust): Assigns global sequence numbers using Hybrid Logical Clocks. Every event in the ecosystem carries an HLC stamp.
- `latency-analyzer` (Rust): Measures end-to-end latency: data ingest → signal → order → fill. Publishes latency histograms.
- `clock-drift-corrector` (Rust): Detects agents with clock skew exceeding 1ms. Alerts Hephaestus to resync.

## C-Suite

- `ceo-chronos` (Python, LLM-powered)
- `cto-chronos`: Time infrastructure.

## Visual Metaphor

A clock tower city with a massive central timepiece, pendulum mechanisms, atomic clock iconography, and precise gear assemblies.

## Command Center Chamber (MV)

- Accent color: Pure White `#FFFFFF`.
- Interior: Giant pendulum (sphere on a rod) swinging. Clock faces on the walls.
- Agents (2): Clockwork-themed outfits (brass gears on chest), observing the pendulum.
- Animations: Pendulum swings with simulated physics; clock hands move.
- Props: pendulum, 3 wall clocks.
