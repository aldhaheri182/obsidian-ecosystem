# 17. ACCEPTANCE TEST SUITE

Full suite catalogued at [`../acceptance/TEST_SUITE.md`](../acceptance/TEST_SUITE.md).

## 17.1 M0 Tests (6 tests)

1. **Ledger Immutability**: `scripts/tamper-ledger.py` attempts three tampering attacks (direct RocksDB mutation, file byte modification, file replacement). `verify_chain` must detect all three.

2. **Replay Determinism**: Run the CSV fixture through the pipeline to completion. Snapshot all agent ledger hashes. Wipe state. Replay the Tape via gRPC. Verify every agent's ledger hash matches the original run exactly.

3. **Risk Overlord Latency**: Inject 1,000 synthetic position states that breach the 15% drawdown limit. Measure wall-clock time from breach publish to `risk.override.all` publication. p99 must be <100ms.

4. **Heartbeat Ring**: Boot all 8 containers. Within 10 seconds, `system.heartbeat.*` must contain one message per expected agent (6 agents in M0).

5. **End-to-End Trade**: Run the 1-day AAPL CSV fixture. Verify at least one order is submitted to Alpaca paper, at least one fill is returned, ledger entries exist for each stage, and the UI animates the trade.

6. **Supervisor Recovery**: Chaos test: kill the momentum-signal task inside the `aletheia-logic` container. Supervisor must restart it within 5 seconds. Agent must replay its ledger and rejoin the heartbeat ring.

## 17.2 Later Milestone Tests

- **Unit Tests**: >90% coverage for Rust crates, >85% for Python packages, >80% for TypeScript.
- **Chaos Tests**: Random agent kills, NATS partition, database outage, low-entropy input, simulated flash crash.
- **Adversarial Tests**: Chimera-generated data, Eris war games, adversarial message injection.
- **Performance Benchmarks**: 10,000 msg/s collector throughput, <1ms signal processing, <10ms tape write p99, <500ms NATS-to-UI latency.
