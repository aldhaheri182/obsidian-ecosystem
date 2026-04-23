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
`docs/specification.md` for the long-horizon architectural spec.

## Repository layout

See [Part 2 of the specification](docs/specification.md) for the full layout. In short:

- `proto/` — Protobuf message schemas (the wire contract)
- `core/` — foundational crates and services (ledger, bus, tape, time)
- `agents/` — agent implementations, organized by language and city
- `cities/` — per-city container/compose configurations
- `visualization/` — Svelte + PixiJS observatory UI
- `tests/` — integration, chaos, and fixtures
- `docs/` — specification, milestones, decisions, runbooks

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
