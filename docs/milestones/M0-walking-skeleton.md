# Milestone 0 — Walking Skeleton

**Status:** Active.
**Target duration:** 2 weeks of focused work.
**Parent spec:** `docs/specification.md` (the maximal architectural specification).

## Purpose

Produce an end-to-end loop through every architectural layer of the Obsidian Ecosystem, using the smallest possible implementation at each layer, with the **exact interfaces, topic names, and data schemas** that will be used in production. Every subsequent milestone is additive; nothing in M0 is throwaway.

This document is the contract. Every file committed in M0 must cite the section of `docs/specification.md` that authorizes it, and must conform to the constraints here.

## Non-goals

- Real market data feeds (Polygon, Refinitiv, etc.) — M0 uses a bundled CSV fixture.
- The full Memory Fabric (Postgres, Neo4j, Qdrant, MinIO) — M0 uses only the Ledger and ClickHouse for the Tape.
- LLM-powered executive reasoning — M0's `executive.global.ceo.directive` topic has a stub subscriber that logs and acknowledges.
- The Research city (Prometheus), the Memory city (Mnemosyne), and all other cities — M0 ships a single-city slice of Aletheia.
- Advancement catalog features of any tier.
- Vault, Istio, Consul, Prometheus/Grafana, ArgoCD. `docker compose logs` is the observability layer for M0.
- TWAP/VWAP slicing, smart order routing. Paper Executor submits simple limit orders.
- Multi-symbol universe. AAPL only.

## In-scope components

### Infrastructure (3 containers)

| Container | Purpose | Resource cap |
|---|---|---|
| `nats` | NATS 2.11 + JetStream + WebSocket gateway on :8080 | 512 MB |
| `redis` | Working memory (positions, heartbeats, current regime) | 1 GB |
| `clickhouse` | Tape archive + time-series (fills, P&L) | 2 GB |

### Core services (2 containers)

| Container | Language | Purpose | Resource cap |
|---|---|---|---|
| `chronos` | Rust | Time Oracle (HLC timestamps at 1 Hz on `chronos.time.oracle`) | 256 MB |
| `tape-recorder` | Rust | Subscribes to `>`, batches to ClickHouse; exposes gRPC Replay | 512 MB |

### Aletheia city (2 containers)

| Container | Language | Agents hosted as internal tasks | Resource cap |
|---|---|---|---|
| `aletheia-core` | Rust | `collector-equities-csv`, `risk-overlord` | 512 MB |
| `aletheia-logic` | Python | `momentum-signal`, `signal-blender`, `paper-executor` | 512 MB |

### UI (1 container)

| Container | Language | Purpose | Resource cap |
|---|---|---|---|
| `visualization` | TypeScript / Svelte | Static SPA served by nginx; connects to NATS WS | 256 MB |

**Total M0 footprint:** 8 containers, ~5.5 GB RAM. Fits comfortably on the 64 GB Linux VM with headroom.

## Message bus

- **Broker:** NATS 2.11 with JetStream enabled.
- **Envelope:** `proto/envelope.proto`, signed with Ed25519 (see `docs/decisions/0003-ledger-hash-chain.md` for signing vs hash-chain rationale).
- **Nonce:** 16 random bytes per message, covered by the signature, to prevent cross-session replay attacks.
- **Topic namespace:** `{city}.{district}.{building}.{agent_role}.{action}` (see `docs/decisions/0004-topic-naming.md`).
- **M0-frozen topics:**
  - `aletheia.data.us_equities.{symbol}`
  - `aletheia.trading_floor.momentum.alpha`
  - `aletheia.portfolio.blended_alpha`
  - `aletheia.execution.order_request`
  - `aletheia.execution.fill_report`
  - `risk.override.all`
  - `system.heartbeat.{agent_id}`
  - `chronos.time.oracle`
  - `executive.global.ceo.directive` (stub subscriber only)

## Memory

- **Per-agent Ledger:** RocksDB on a bind-mounted host volume (`./ledger-data/{agent_id}/`). CBOR-encoded entries, SHA3-256 hash chain. See `core/obsidian-ledger/`.
- **Working memory:** Redis. Key patterns:
  - `position:aletheia:{symbol}` — current position (JSON).
  - `heartbeat:{agent_id}` — last heartbeat timestamp (TTL 10 s).
  - `risk:limit:{type}` — current hard limits (static in M0; dynamic in M3).
- **Tape:** ClickHouse table `tape` (see Section 5.5 of the spec).
- **Deferred:** Postgres, Neo4j, Qdrant, MinIO.

## Data flow

```
fixture CSV (AAPL 1-min bars)
  │
  ▼
[collector-equities-csv] ──► aletheia.data.us_equities.AAPL
                                  │
                                  ▼
                         [momentum-signal] ──► aletheia.trading_floor.momentum.alpha
                                  │
                                  ▼
                         [signal-blender] ──► aletheia.portfolio.blended_alpha
                                  │
                                  ▼
                         [paper-executor] ──► aletheia.execution.order_request
                                  │       (Alpaca paper API)
                                  ▼
                         [paper-executor] ──► aletheia.execution.fill_report

Parallel:  [risk-overlord] watches positions + orders; publishes risk.override.all on breach.
Parallel:  [tape-recorder] writes every message to ClickHouse.tape.
Parallel:  every agent publishes system.heartbeat.{agent_id} at 1 Hz.
```

## Acceptance tests

M0 ships only when all six pass on the Linux VM.

1. **Ledger immutability.** `scripts/tamper-ledger.py` attempts three attacks (direct RocksDB write, raw file edit, file replacement). `verify_chain()` must detect each; normal `append()` must succeed.
2. **Replay determinism.** Run the AAPL fixture end-to-end; snapshot every agent's ledger hash. Wipe state. Replay from the Tape via `tape-recorder` gRPC. Final ledger hashes must match bit-for-bit.
3. **Risk Overlord latency.** Injection harness fires 1,000 synthetic breaches. p99 wall-clock from breach publication to `risk.override.all` publication must be **< 100 ms**.
4. **Heartbeat ring.** Within 10 s of `docker compose up`, exactly 6 distinct agents publish on `system.heartbeat.*`: `collector-equities-csv-01`, `momentum-signal-01`, `signal-blender-01`, `paper-executor-01`, `risk-overlord-01`, `time-oracle-01`. (Tape recorder itself does not count as an "agent" for M0; it's infrastructure.)
5. **End-to-end trade.** Replay the fixture day. At least one order must be submitted to Alpaca paper, at least one fill returned, ledger entries present for every stage, and the UI must animate the message packets in real time.
6. **Supervisor recovery.** Kill the `momentum-signal` task inside the `aletheia-logic` container. The in-process supervisor must restart it within 5 s. The new instance must reconstruct its state from its ledger. Heartbeat ring must re-form.

## Design decisions frozen in M0 (do not re-litigate)

| Decision | Choice | Rationale file |
|---|---|---|
| Language set | Rust + Python + TypeScript (no Go) | `0001-language-set.md` |
| Container granularity | City-level; agents are tasks inside a process | `0002-container-granularity.md` |
| Ledger hashing | SHA3-256 chain over CBOR; Ed25519 per-entry signature | `0003-ledger-hash-chain.md` |
| Topic naming | `{city}.{district}.{building}.{agent_role}.{action}` | `0004-topic-naming.md` |
| ID format | UUID v7 for all message and entry IDs | — |
| Wire encoding | Protobuf on NATS, CBOR in ledger | — |
| Time | HLC (hybrid logical clock), seeded from Chronos | — |
| Broker | Alpaca paper | — |
| Data source | Bundled CSV fixture, committed to `tests/fixtures/` | — |

## Build order (authoritative)

1. `proto/*.proto` — wire contract
2. `core/obsidian-bus/` — envelope, signing, NATS wiring
3. `core/obsidian-agent-rs/` — Rust base agent trait + supervisor
4. `core/obsidian-agent-py/` — Python base class mirroring the trait
5. `core/obsidian-ledger/` — RocksDB, hash chain, replay, verify, full tests
6. `core/tape-recorder/` — subscriber + ClickHouse writer + gRPC replay
7. `core/time-oracle/` — HLC publisher
8. `agents/rust/collector-equities-csv/` — CSV reader → `MarketData`
9. `agents/python/momentum-signal/` — SMA(20/50) crossover
10. `agents/python/signal-blender/` — passthrough for M0
11. `agents/python/paper-executor/` — Alpaca paper submit + fill listener
12. `agents/rust/risk-overlord/` — position monitor + circuit breaker
13. `visualization/` — Svelte + PixiJS single-city view
14. `tests/` — all six acceptance tests
15. `docker-compose.yml` + `scripts/bootstrap.sh` + `Makefile`

## Out-of-scope for M0 (do not write)

- Any file under `cities/mnemosyne/`, `cities/prometheus/`, or any city besides `aletheia/`.
- Any Rust or Python file whose purpose appears only in spec sections 9.4–9.8 (Allocator beyond trivial blender, complex signal types beyond SMA).
- Anything referencing the Advancement Catalog (Section 20 / Appendix A).
- Anything referencing Layers 23–49 (Section 21).
- Any LLM calls, including the Executive arbitration protocol.

Violations of this list in M0 commits must be reverted.

## Exit criteria

M0 is complete when:

1. All six acceptance tests pass on the Linux VM under CI.
2. `make up` brings the full stack to green (all 6 agents heartbeat; UI connects).
3. `make replay` reproduces a prior day with bit-identical ledger hashes.
4. `make tamper` demonstrates `verify_chain` rejects every tampering attempt.
5. This document is updated with a "Completed" section listing the commit SHAs of the passing run.

## Completed — code-frozen 2026-04-24

**Status:** closed by owner at code-freeze. Not verified on the Linux VM.
Runtime issues discovered during first-boot verification land as hotfix
commits on `main`; this milestone is not reopened.

### Commit map (all on `main`, origin `aldhaheri182/obsidian-ecosystem`)

```
d7cb4f6 tests: six M0 acceptance test scripts
db2131f infra: docker-compose.yml + Dockerfiles + bootstrap scripts
a0906ba visualization/: M0 Owner Observatory (Svelte + PixiJS single-city)
9af7856 agents: momentum-signal, signal-blender, paper-executor, risk-overlord
5cfad1e core/tape-recorder + core/time-oracle + collector-equities-csv
78255e2 core/obsidian-ledger: immutable, hash-chained, Ed25519-signed ledger
64b6a94 core/obsidian-agent-py: Python mirror of the Rust agent runtime
00e70bb core/obsidian-agent-rs: ObsidianAgent trait + supervisor + lifecycle
012b097 core/obsidian-bus: canonical envelope, Ed25519 signing, NATS wiring
fb9ce06 M0 foundation: plan, ADRs, protos, workspace scaffolding
```

### What landed

- All 15 components in the build order above.
- All 6 acceptance-test scripts.
- Full `docker-compose.yml` + Dockerfiles for every service.
- Bootstrap, seed-csv, tamper-ledger, and replay-day scripts.
- One bundled AAPL fixture (`tests/fixtures/aapl_2023-03-13_1min.csv`).

### What did NOT land in M0 (intentional, deferred to later milestones)

See "Out-of-scope for M0" above. Nothing from that list is in the tree.

### What is NOT verified

Exit criteria #1-#4 above require a Linux VM with Docker. They have not
been run. First-boot issues are expected and will be fixed via hotfix
commits. The milestone is closed administratively at owner direction.

### Next milestone

M1 — Memory Fabric. **Do not start M1 without explicit owner authorization.**
M1's tracker is GitHub issue #22.

Upon completion, M1 (Memory Fabric) begins against the interfaces established here. No M0 component should need to change for M1.
