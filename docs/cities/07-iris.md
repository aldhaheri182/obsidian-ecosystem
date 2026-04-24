# City 7: Iris — Observation & Telemetry

Iris is the ecosystem's sensory organ turned inward. It monitors every agent, every city, every database, and every network link. It detects anomalies, predicts failures, and dispatches alerts.

## Agents

- `health-monitor` (Python): Collects Prometheus metrics, agent heartbeats, latency data. Computes SLO compliance.
- `anomaly-detector` (Python): ML-based anomaly detection on system metrics (Isolation Forest, LSTM autoencoders).
- `predictive-maintenance` (Python): Predicts disk fill, memory exhaustion, certificate expiry. Schedules maintenance windows.
- `alert-dispatcher` (Python): Routes alerts to the Owner (Telegram, Email, Slack) and to relevant city CTOs.

## Adaptive Owner Interface (Layer 29)

Iris monitors the Owner's interaction patterns and adapts the UI:

- Tracks attention patterns to restructure dashboard layout.
- Detects stress patterns (rapid clicking, frequent checking during drawdowns) and surfaces calming data.
- Evolves from technical detail to high-level strategic framing as the Owner demonstrates comprehension.

## C-Suite

- `ceo-iris` (Python, LLM-powered)
- `cto-iris`: Telemetry infrastructure.

## Visual Metaphor

An observatory with telescopes pointed at every other city, warning sirens, health bars floating over buildings, and an early warning radar sweeping the horizon.

## Command Center Chamber (MV)

- Accent color: Deep Amethyst `#7209B7`.
- Interior: Radar screen (rotating line on a circle). Floating "eye" triangles that scan the room.
- Agents (3): Dark uniforms with purple visors, standing at attention.
- Animations: Radar line rotates; eyes pulsate.
- Props: 1 radar dish, 2 floating eye triangles.
