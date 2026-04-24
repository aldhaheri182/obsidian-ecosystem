# Acceptance Test Suite — canonical catalog

## M0 (6 tests — all currently CLOSED on GitHub)

1. **Ledger Immutability** — `scripts/tamper-ledger.py` runs three attacks (RocksDB key mutation, file byte mutation, file replacement). `verify_chain` must detect all three.
2. **Replay Determinism** — Run fixture end-to-end. Snapshot ledger hashes. Wipe. Replay Tape via gRPC. Ledger hashes must be bit-identical.
3. **Risk Overlord Latency** — Inject 1000 synthetic drawdown breaches. p99 wall-clock from breach publish to `risk.override.all` publish must be < 100 ms.
4. **Heartbeat Ring** — Boot all 8 containers. Within 10 s, `system.heartbeat.*` must contain one message per expected agent (6 in M0).
5. **End-to-End Trade** — 1-day AAPL CSV fixture → at least one Alpaca paper order → at least one fill → ledger entries per stage → UI animates the trade.
6. **Supervisor Recovery** — Kill momentum-signal task → supervisor restarts within 5 s → agent replays ledger → rejoins heartbeat ring.

## M1 additions

- Memory Fabric boot: Postgres+Timescale+AGE, Neo4j, Qdrant, MinIO healthy.
- Knowledge-Graph API round-trip: publish Principle → semantic search retrieves it.
- Stack reboot preserves ledger and graph.

## M2 additions

- 30 consecutive paper-trading days, zero risk breach, zero Tape data loss.
- Multi-signal blend, regime detection exercised, full Risk Bunker drills.

## M3 additions

- Vault-issued NATS JWTs; filesystem registry retired.
- Zero NoVerification subscriptions on production paths.
- Owner directive via UI propagates to Aletheia CEO → worker agents; full Tape trace.

## M4 additions

- Autonomous Principle publication with full statistical audit trail (CPCV + DSR + PBO).
- Causal Auditor detects a seeded spurious causation.

## M5 additions

- End-to-end cross-city message flow verified under chaos.
- External broker connected via Agora (paper → real).
- Compliance check on every order.
- Quarterly Eris war game completed.

## M6 additions

- Every Layer 23–39 has a passing test in `tests/layers/` and a runbook in `docs/runbooks/`.

## M7 additions

- All 526 advancements implemented / tested / or explicitly deferred with rationale.
- 30 consecutive days unattended operation in paper mode.
- Silent Vault remains empty.
- Paper-to-live gate (see `../whitepaper/18-gating.md`) satisfied.

## MV additions (3D Command Center)

- 11 chambers visible with distinct interiors and colors.
- Agents as fully-modeled 3D characters with walking / idle / gesture.
- Connection lines pulse and flow.
- Click-city zoom-and-panel.
- Top bar, right sidebar, bottom timeline functional.
- 30+ FPS on mid-range GPU.
- No console errors or warnings.

## Global suites

- Unit: Rust > 90%, Python > 85%, TS > 80% coverage.
- Chaos: agent kills, NATS partitions, DB outage, flash crash.
- Adversarial: Chimera data, Eris war games, injected envelopes.
- Performance: 10k msg/s collector, < 1 ms signal processing, < 10 ms tape write p99, < 500 ms NATS→UI.
