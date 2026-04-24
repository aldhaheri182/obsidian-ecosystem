# 21. APPENDICES

## Appendix A: Environment Variables

| Variable | Description | Required For |
|:---------|:------------|:-------------|
| `AGENT_ID` | Unique agent identifier | All agents |
| `CITY` | City name | All agents |
| `NATS_URL` | NATS connection string | All agents |
| `LEDGER_PATH` | Local RocksDB storage path | All agents |
| `REDIS_URL` | Redis connection string | Aletheia, Mnemosyne |
| `NEO4J_URI` | Neo4j bolt URI | Mnemosyne |
| `QDRANT_URL` | Qdrant gRPC URL | Mnemosyne |
| `CLICKHOUSE_URL` | ClickHouse HTTP URL | Tape, Iris |
| `LOG_LEVEL` | Logging level | All agents |
| `ALPACA_API_KEY` | Alpaca paper API key | Paper Executor |
| `ANTHROPIC_API_KEY` | Anthropic API key | Executive agents (M6+) |

## Appendix B: Colors in Protobuf Enums

The `MessageType` enum uses protobuf best practices: every value has a unique number starting from 1 (not 0), and all values are prefixed with `MESSAGE_TYPE_` to avoid naming collisions in generated code. The zero value is `MESSAGE_TYPE_UNSPECIFIED = 0` to prevent the default-value footgun where an unset field silently reads as a valid message type.

## Appendix C: Frozen Decisions

These architectural decisions are permanent and will not be reversed:

| Decision | Choice | Rationale |
|:---------|:-------|:----------|
| Languages | Rust + Python + TypeScript only | Go dropped to reduce toolchain complexity |
| Container granularity | City-level; agents as tasks | Balances isolation with operational simplicity |
| Ledger hash | SHA3-256 chain over CBOR | Mature, fast, quantum-resistant-ish |
| Wire encoding | Protobuf on NATS; CBOR in ledger | Protobuf for throughput; CBOR for hash-stable storage |
| IDs | UUID v7 | Time-sortable, globally unique |
| Topic naming | `{city}.{district}.{building}.{agent_role}.{action}` | Hierarchical, legible, extensible |
| Prices | int64 fixed-point ×10⁶ USD cents | Prevents floating-point drift |
| Signing | Canonical protobuf → Ed25519 | Deterministic across languages |
| Clocks | Hybrid Logical Clocks | Causal ordering without GPS dependency for every agent |
| M0 broker | Alpaca paper | Free, simple API, zero capital risk |
| M0 data | Bundled CSV fixture | Deterministic, free, repeatable |
