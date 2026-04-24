# Memory Fabric — Full architecture

Canonical source for the six-store federation that constitutes the ecosystem's memory.

See: whitepaper §5, Mnemosyne city spec, L28 (Memetic Immune), L31 (Temporal Seal), L32 (Idea Genealogy), L35 (Immortality Vault), L38 (Paradox Integration), L47 (Motherseed), L49 (Silent Vault).

## Stores

| Store | Tech | Purpose |
|:------|:-----|:--------|
| Immutable Event Ledger | Custom Rust (RocksDB + S3) | Append-only, hash-chained, replayable |
| Knowledge Graph | Neo4j 5.22 / Apache AGE 1.5 | Entities, relationships, causal links |
| Vector Store | Qdrant 1.11 / pgvector 0.7 | Semantic embeddings |
| Working Memory | Redis 7.4 Cluster | Current positions, heartbeats |
| Time-Series | ClickHouse 24.8 | Market data, P&L, latency, perf |
| Blob | MinIO / S3 | Checkpoints, replays, snapshots |

## Hash-chain construction

```
Genesis:  hash(0) = SHA3-256("OBSIDIAN_GENESIS")
Entry N:  hash(N) = SHA3-256(hash(N-1) || CBOR(entry_N_sans_hash))
```

## Immutability test

`scripts/tamper-ledger.py` attempts:
1. Direct RocksDB key-value mutation.
2. File-level byte modification.
3. Full file replacement.

`verify_chain` MUST detect all three.

## Decay

Per-node-type half-life. Query lenses:
- Short lens: current trading signals.
- Mid lens: weekly pattern review.
- Flat lens: historical research.

## Summarization levels

| Level | Horizon | Producer |
|:------|:--------|:---------|
| L1 Episode | minutes → hours | `summarizer-L1` |
| L2 Pattern | days → weeks | `summarizer-L2` |
| L3 Principle | months → years | `summarizer-L3` (LLM) |

## Archival & durability

- Local RocksDB per agent.
- Daily snapshot to S3/MinIO.
- Hourly Merkle roots anchored to public chains (L31 Temporal Seal).
- Motherseed (L47) packages everything for migration.

## Gold Nodes

Published principles are `Principle` nodes with status `GOLD`. They are the ecosystem's shared, load-bearing knowledge; they decay slowly and persist even when cited evidence moves.

## Silent Vault (L49)

A single Gold Node whose `body` is permanently empty. No agent can write to it; only the Owner, via signed directive + cooldown. Its presence is a design humility; it waits.
