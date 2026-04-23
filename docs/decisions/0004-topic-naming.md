# ADR 0004 — NATS Topic Naming Convention

**Status:** Accepted (M0).
**Date:** 2026-04-24.
**Authorizing sections:** spec Part 4.3, Appendix C.

## Context

NATS topics form the public API of the ecosystem. They are consumed by subscribers without introspection of the Envelope payload. Naming must be legible, filterable with NATS wildcards, and stable across milestones so subscribers do not need to be rewritten as the system grows.

## Decision

All topics follow the pattern:

```
{scope}.{sub_scope_1}.{sub_scope_2}.…
```

Where scope is one of:

- `{city}` — a lowercase city name (e.g. `aletheia`, `mnemosyne`).
- `system` — cross-cutting concerns (heartbeats, alerts, configuration).
- `risk` — risk overrides are cross-city; the Risk Overlord is in Aletheia but overrides may eventually be published from any Guardian.
- `executive` — executive communications.
- `advancement` — advancement orbs and related governance.
- `chronos` — time oracle publications (NOT `aletheia.chronos.*`, because time is a system primitive).

Within a city, the canonical form is:

```
{city}.{district}.{building}.{agent_role}.{action}
```

Districts and buildings are those named in the corresponding city section of the spec (e.g. Aletheia's `trading_floor`, `execution_desk`, `portfolio_control`, `risk_bunker`). Some topics intentionally elide the district when the publication is city-wide (`aletheia.portfolio.blended_alpha` rather than `aletheia.portfolio_control.central_desk.blender.blended_alpha`) to keep the common case ergonomic. The full form is reserved for topics that benefit from wildcard subscription (e.g. every signal in the Momentum Lab: `aletheia.trading_floor.momentum_lab.>`).

## Rules

1. All components lowercase, `snake_case`.
2. No variable-length identifiers (e.g. `agent_id`) in the topic path for topics intended for broad consumption. `agent_id` appears only in `system.heartbeat.{agent_id}` and in ledger-internal bookkeeping, where the wildcard `system.heartbeat.>` is the useful subscription.
3. Symbol names are uppercase when they appear (`aletheia.data.us_equities.AAPL`) because symbols are case-sensitive external identifiers.
4. The Tape Recorder subscribes to `>` and captures everything. There is no "private" topic.
5. Topic changes are breaking changes and require an ADR.

## M0-frozen topics (binding)

See `docs/milestones/M0-walking-skeleton.md` §"Message bus" for the authoritative list.
