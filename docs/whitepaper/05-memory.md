# 5. THE MEMORY FABRIC — COMPLETE ARCHITECTURE

## 5.1 Multi-Store Architecture

The Memory Fabric is not a single database. It is a federation of six specialized stores, each optimized for a different memory modality. Agents access memory through a unified API layer, but the underlying stores are chosen based on access patterns.

| Store | Technology | Purpose | Access Pattern |
|:------|:-----------|:--------|:---------------|
| **Immutable Event Ledger** | Custom Rust (RocksDB local, S3 archive) | Every event, observation, inference, action, reflection, and dream | Append-only, hash-chained, replayable |
| **Knowledge Graph** | Neo4j 5.22 / Apache AGE 1.5 | Entities, relationships, causal links, principles, and structured knowledge | Graph traversals, causal chain queries |
| **Vector Store** | Qdrant 1.11 / pgvector 0.7 | Semantic embeddings of reflections, news, signals, and unstructured text | Approximate nearest neighbor, semantic search |
| **Working Memory** | Redis 7.4 Cluster | Current positions, real-time signals, agent heartbeats, risk limits | Sub-millisecond read/write, TTL-based expiry |
| **Time-Series Store** | ClickHouse 24.8 | Market data, signal outputs, P&L, agent performance metrics, latency | Columnar compression, range queries, aggregations |
| **Blob Store** | MinIO (dev) / Amazon S3 (prod) | Model checkpoints, replay files, ledger snapshots, large artifacts | Infrequent access, high durability |

## 5.2 The Immutable Event Ledger

Every agent possesses a personal ledger. This is the foundational memory primitive — the atom of persistence in the ecosystem. Without the ledger, there is no replay, no audit, no memory, and no trust.

### Entry Schema

```json
{
  "entry_id": "018f3a2c-7b1e-7e8f-9a0b-1c2d3e4f5a6b",
  "previous_hash": "a3b2c1d4e5f6...",
  "timestamp": "2026-04-24T14:32:05.231482000Z",
  "entry_type": "OBSERVATION|INFERENCE|ACTION|MESSAGE_RECEIVED|MESSAGE_SENT|REFLECTION|DREAM|ERROR|STATE_CHANGE",
  "payload": { /* type-specific CBOR-encoded data */ },
  "causal_links": ["entry_id_1", "entry_id_2"],
  "confidence": 0.72,
  "model_version": "mom_v2.4",
  "signature": "ed25519_signature_over_all_above"
}
```

- `entry_id` is UUID v7.
- `previous_hash` is SHA3-256 of the previous entry.
- `timestamp` is ISO 8601 with nanoseconds.
- `causal_links` record what caused this entry.
- `confidence` is 0.0 to 1.0.
- `model_version` records which model version produced this.
- `signature` is an Ed25519 signature over all fields above it.

### Hash Chain Construction

```
Genesis: hash(0) = SHA3-256([]byte("OBSIDIAN_GENESIS"))
Entry 1: hash(1) = SHA3-256(hash(0) || CBOR(entry_1_without_hash))
Entry 2: hash(2) = SHA3-256(hash(1) || CBOR(entry_2_without_hash))
...
Entry N: hash(N) = SHA3-256(hash(N-1) || CBOR(entry_N_without_hash))
```

### Ledger API

```rust
pub trait Ledger: Send + Sync {
    /// Append a new entry. Returns the entry ID on success.
    async fn append(&self, entry: LedgerEntry) -> Result<EntryId>;

    /// Retrieve a specific entry by ID.
    async fn get(&self, id: &EntryId) -> Result<LedgerEntry>;

    /// Stream all entries in a time range.
    async fn replay(&self, from: Timestamp, to: Timestamp) -> Result<impl Stream<Item = LedgerEntry>>;

    /// Verify the entire chain. Returns whether the chain is intact.
    async fn verify_chain(&self) -> Result<ChainStatus>;

    /// Export a snapshot tarball for archival.
    async fn snapshot(&self, dest: &Path) -> Result<()>;
}
```

### Immutability Enforcement

- RocksDB is opened with compaction-only writes.
- `append` is the only public writer.
- The acceptance test `tamper-ledger.py` attempts three attack vectors:
  1. Direct RocksDB key-value mutation.
  2. File-level byte modification.
  3. Full file replacement.
- `verify_chain` must detect all three.

## 5.3 The Knowledge Graph

The Knowledge Graph uses Neo4j (or Apache AGE on PostgreSQL for simpler deployment) to store all structured knowledge: what entities exist, how they relate, and what causal links connect them.

### Node Types

| Node Label | Properties | Description |
|:-----------|:-----------|:------------|
| `Agent` | agent_id, city, role, status, created_at, retired_at | Every agent in the ecosystem |
| `Instrument` | symbol, asset_class, exchange, currency, sector | Every tradable instrument |
| `Signal` | signal_id, agent_id, symbol, type, direction, confidence, timestamp | Every signal output |
| `Order` | order_id, symbol, side, quantity, price, status, timestamp | Every order |
| `Event` | event_id, type, description, severity, timestamp | Significant market or system events |
| `Principle` | principle_id, title, abstract, confidence, status, published_at | Distilled knowledge |
| `Regime` | regime_id, name, volatility_regime, correlation_regime, timestamp | Market state classification |
| `MemoryNode` | node_id, agent_id, summary, embedding_id, importance_score | Compressed memory unit |

### Relationship Types

| Relationship | Properties | Description |
|:-------------|:-----------|:------------|
| `CAUSES` | confidence, evidence_count, p_value | X caused Y |
| `CORRELATES_WITH` | coefficient, p_value, window_days | X and Y move together |
| `PRECEDES` | time_delta_ms | X happened before Y |
| `CONTRADICTS` | resolution_status | X and Y cannot both be true |
| `PUBLISHED_BY` | timestamp | Agent published this knowledge |
| `CITES` | timestamp | This knowledge references prior knowledge |
| `BELONGS_TO_CITY` | — | Agent is assigned to this city |

## 5.4 Hierarchical Memory Summarization

Raw events at seconds/minutes granularity are progressively compressed into higher-level understanding through three summarization levels:

**Level 1 — Episodes (minutes to hours).** Clusters of raw events that form a coherent story. "AAPL rose 0.5% on high volume, then reversed after a negative headline." Generated by the L1 Summarizer Agent during agent Sleep Mode.

**Level 2 — Patterns (days to weeks).** Recurring structures with statistical significance. "Momentum signals in semiconductor stocks outperform during the first week of earnings season." Generated by the L2 Summarizer Agent.

**Level 3 — Principles (months to years).** Distilled causal laws. "Momentum edge decays by 40% when VIX exceeds 30 across all technology subsectors." Generated by the L3 Summarizer Agent using LLM synthesis. Principles are published to the Great Library as Gold Nodes.

## 5.5 Memory Decay

All knowledge has a half-life. The decay system ensures that agents weight recent, relevant information more heavily than ancient, potentially obsolete information.

**Decay Parameters:**
- `half_life`: Configurable per node type (e.g., market observations decay fast; structural principles decay slowly).
- `recency_boost`: Multiplier applied to recently accessed nodes.
- `causal_importance`: Nodes that explain many outcomes persist longer — they are "load-bearing" knowledge.

**Decay Lenses.** Queries to the Knowledge Graph specify a "decay lens" — a time-weighting function that determines how ancient knowledge is weighted. An agent querying for current trading signals uses a short half-life lens. An agent conducting historical research uses a flat lens.
