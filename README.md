# Obsidian Ecosystem

A learning civilization for financial markets. Architecture: event-sourced, message-bus-based, multi-agent autonomous R&D and trading system.

This is **not** a single trading strategy. It is a factory that discovers, validates, deploys, and retires strategies continuously, with strict statistical discipline and a hard-gated paper-to-live migration path.

## Status

**M0 — Walking Skeleton: CLOSED (code-frozen 2026-04-24).**

All 15 components and all 6 acceptance-test scripts have landed across 10
commits on `main`. First-boot verification happens on the owner's macOS
host; runtime fixes land as hotfix commits.

Next milestone: **M1 — Memory Fabric** (GitHub issue #22). NOT started
without owner go-ahead.

See `docs/milestones/M0-walking-skeleton.md` for the M0 record. See
`docs/WHITEPAPER.md` for the long-horizon architectural spec (v1.0 — Final).

## Deep index — the entire specification

**Master whitepaper:** [`docs/WHITEPAPER.md`](docs/WHITEPAPER.md) — abstract, TOC, final note.

**Sectional whitepaper (21 files):** [`docs/whitepaper/`](docs/whitepaper/)
- [01-philosophy](docs/whitepaper/01-philosophy.md) · [02-architecture](docs/whitepaper/02-architecture.md) · [03-cities](docs/whitepaper/03-cities.md) · [04-hierarchy](docs/whitepaper/04-hierarchy.md) · [05-memory](docs/whitepaper/05-memory.md) · [06-bus](docs/whitepaper/06-bus.md) · [07-agent-runtime](docs/whitepaper/07-agent-runtime.md) · [08-agent-directory](docs/whitepaper/08-agent-directory.md) · [09-advancements](docs/whitepaper/09-advancements.md) · [10-layers](docs/whitepaper/10-layers.md) · [11-ui](docs/whitepaper/11-ui.md) · [12-schemas](docs/whitepaper/12-schemas.md) · [13-risk](docs/whitepaper/13-risk.md) · [14-roadmap](docs/whitepaper/14-roadmap.md) · [15-stack](docs/whitepaper/15-stack.md) · [16-repo](docs/whitepaper/16-repo.md) · [17-acceptance](docs/whitepaper/17-acceptance.md) · [18-gating](docs/whitepaper/18-gating.md) · [19-gaps](docs/whitepaper/19-gaps.md) · [20-glossary](docs/whitepaper/20-glossary.md) · [21-appendices](docs/whitepaper/21-appendices.md)

**Per-city specs (11):** [`docs/cities/`](docs/cities/) — one file per city, districts + agents + C-suite + visual metaphor + Command Center chamber.

**Per-layer specs (L10–L49):** [`docs/layers/`](docs/layers/) — one file per conceptual layer beyond the eight base cities.

**Cross-cutting:**
- [`docs/agents/DIRECTORY.md`](docs/agents/DIRECTORY.md) — all 150+ agents.
- [`docs/memory/FABRIC.md`](docs/memory/FABRIC.md) — memory architecture.
- [`docs/risk/FRAMEWORK.md`](docs/risk/FRAMEWORK.md) — Risk Overlord + circuit breakers.
- [`docs/ui/CINEMATIC_SPEC.md`](docs/ui/CINEMATIC_SPEC.md) — v1 visualization.
- [`docs/COMMAND_CENTER.md`](docs/COMMAND_CENTER.md) — MV 3D Interactive Command Center (Next.js + React Three Fiber rebuild).
- [`docs/schemas/MESSAGE_SCHEMAS.md`](docs/schemas/MESSAGE_SCHEMAS.md) — every bus message.
- [`docs/acceptance/TEST_SUITE.md`](docs/acceptance/TEST_SUITE.md) — M0→M8 + MV acceptance.
- [`docs/gaps/FORTY_TWO_CATEGORIES.md`](docs/gaps/FORTY_TWO_CATEGORIES.md) — 42 deep architecture gaps.
- [`docs/advancements/`](docs/advancements/) — Tiny / Small / Medium / Big / Mega / Layers tier catalogs (526 advancements).

## Repository layout

- `proto/` — Protobuf message schemas (the wire contract).
- `core/` — foundational crates and services (ledger, bus, tape, time).
- `agents/` — agent implementations, organized by language and city.
- `cities/` — per-city container/compose configurations.
- `visualization/` — Svelte + PixiJS + Three.js observatory UI (v1).
- `command-center/` — Next.js 14 + React Three Fiber rebuild (MV).
- `tests/` — integration, chaos, and fixtures.
- `docs/` — the complete spec: whitepaper + cities + layers + advancements + gaps + agents + memory + risk + ui + schemas + acceptance + decisions + runbooks.

## Build principles

1. **Interface first, implementation second.** The protos and agent traits define the system before any substantive code is written.
2. **Ledger is sacred.** Every observation, inference, and action is appended to a cryptographically chained, immutable ledger.
3. **Tape everything.** The Tape Recorder subscribes to every NATS subject and archives every message. Any day can be replayed.
4. **Risk Overlord owns the kill switch.** No code path can bypass it. p99 override latency < 100ms.
5. **Paper until proven.** No path from code to live capital exists until the Section 0.2 acceptance criteria and Section 25 test suite are met.

## Languages

- **Rust** — ledger, bus, tape, time, execution, risk, collectors, API gateway
- **Python** — signals, ML, optimizers, executives, memory keepers, brokers
- **TypeScript / Svelte / PixiJS** — visualization only

Go has been deliberately removed; see `docs/decisions/0001-language-set.md`.

## Development (macOS)

Requires: **Docker Desktop ≥ 4.30** (set memory to ≥ 8 GB), OrbStack, or
colima. The containers are all Linux under the hood.

```sh
./scripts/bootstrap.sh    # host checks, ledger-data volume, .env, image pull
# edit .env and set ALPACA_API_KEY + ALPACA_API_SECRET (paper-api.alpaca.markets only)
make up                   # bring up the full M0 stack
make test-acceptance      # run all 6 acceptance tests
make replay DATE=2023-03-13
make tamper               # attempt ledger tampering; expect failure
make down                 # tear down
```

## License

TBD.
