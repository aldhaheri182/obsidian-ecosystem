# Milestone 1 — Memory Fabric

**Status:** IN PROGRESS — phase M1.0 (Foundations) shipped 2026-04-24; phases M1.1–M1.5 open.
**Parent issue:** #22 (umbrella tracker, remains open until M1.5 acceptance suite passes).
**Cross-cutting trackers:** #142 (six-store federation), #145 (message schemas).
**Authorizing spec:** whitepaper §5 (Memory Fabric), §10 (Mnemosyne city), `docs/acceptance/TEST_SUITE.md` M1 section.

## Why M1 was decomposed

Issue #22 specifies a single delivery containing nine new agents, four
new infrastructure containers, full embedding pipeline, causal auditor,
hierarchical summarization, archivist with restore drill, and
modifications to every existing M0 agent. Shipping that as one
indivisible milestone is unrealistic and obscures progress. M1 is
therefore split into six phases, each with its own GitHub issue and a
deliverable that is testable in isolation.

`#22` remains the umbrella tracker and closes only when all phase
acceptance tests pass and `docs/acceptance/TEST_SUITE.md`'s M1 row is
satisfied (Memory Fabric boot, KG round-trip, restart preservation).

## Phase map

| Phase | GitHub | Deliverable | Acceptance |
|---|---|---|---|
| M1.0 — Foundations | (this doc) | `core/obsidian-graph` Python pkg (KnowledgeGraph + VectorStore + BlobArchive + schemas), `agents/python/memory-keeper` (KNOWLEDGE_PUBLICATION→Neo4j stub + REFLECTION→Qdrant placeholder + daily ledger archival to MinIO), four new docker-compose services (postgres+TimescaleDB, neo4j, qdrant, minio), Supervisor TypeError fix | 2 hermetic unit tests (archive excludes secrets, supervisor wires) — landed 2026-04-24, hotfix 2026-04-25 |
| M1.1 — Real embeddings + semantic search | new sub-issue | `agents/python/vector-index-builder` (sentence-transformers `bge-small-en-v1.5`, no external calls); `agents/python/semantic-search` agent listening on `mnemosyne.great_library.search`; replace memory-keeper's `[0]*1024` placeholder with real embedding | KnowledgePublication round-trip: publish on `mnemosyne.great_library.knowledge_graph.publication`, semantic-search retrieves it via natural-language query with cosine ≥ 0.8 |
| M1.2 — Causal Auditor | new sub-issue | `agents/python/causal-auditor` agent: subscribes `aletheia.trading_floor.>` and `aletheia.portfolio.>`, runs permutation test + partial-correlation control on each Signal's `causal_links`, publishes `mnemosyne.causal_audit.report` with p-value | Synthetic shuffled-noise signal triggers report within 60 s with p < 0.01 |
| M1.3 — Archivist + restore drill | new sub-issue | Promote `memory-keeper`'s archival job into a separate `archivist-01` agent process; add `scripts/restore-from-minio.py`; pre-restore `verify_chain()` gate (refuse to overwrite local on bad chain) | `make nuke && scripts/restore-from-minio.py` reconstructs every agent's ledger from MinIO; `verify_chain()` passes for all agents |
| M1.4 — Summarizer-L1 (deterministic templates) | new sub-issue | `agents/python/summarizer-l1` agent: nightly clusters contiguous same-agent ledger entries into "episodes", emits text via deterministic templates (no LLM) on `mnemosyne.summaries.l1.{agent_id}` | One non-empty L1 summary per agent for the prior 24 h after one synthetic-day fixture replay |
| M1.5 — Existing-agent retrofits + no-regression | new sub-issue | Every M0 agent: rebuild state from ledger on `init()`, populate `Signal.causal_links` with real entry_ids, write a `REFLECTION` entry on `shutdown()`, advance live `Heartbeat.ledger_head_hash` | All 6 M0 acceptance tests still pass; tape-recorder shows REFLECTION entries from each agent on graceful shutdown; heartbeat hash is non-empty and monotonically advances |

## What landed in M1.0 (commit map)

```
1b02e70 M1: memory-keeper agent + daily ledger-archival job
dc47bf4 M1: Memory Fabric foundations — 4 new stores + obsidian-graph API
cde3143 ledger: fix serde_bytes + E0716 borrow to make crate compile fresh
```

Plus a 2026-04-25 hotfix commit (this PR / commit set):

- `agents/python/memory-keeper/src/memory_keeper/__main__.py` — `Supervisor(cfg, [spec])` → `Supervisor(cfg).register(spec)` (TypeError at boot regression).
- `agents/python/memory-keeper/tests/test_entrypoint_wires.py` — guards the wiring.

## Out-of-scope for M1 (deferred)

- LLM-based summarization (Summarizer-L2 / L3) — M4 Mnemosyne+Prometheus.
- Memetic Immune System (cascade detection over the Knowledge Graph) — M6, layer L28.
- Temporal Seal (hourly Merkle root anchored to a public chain) — M6, layer L31.
- Idea Genealogy GC across cited principles — M6, layer L32.
- Embedding via external APIs (OpenAI / Anthropic) — never; M1 commits to local `bge-small` only.
- Apache AGE evaluation — M2 ADR decides AGE-vs-Neo4j after 30 days of M1 telemetry.

## Exit criteria

M1 (umbrella #22) is complete when:

1. M1.1–M1.5 are merged and their phase acceptance tests pass on the macOS host.
2. `docs/acceptance/TEST_SUITE.md` M1 row passes:
   - Memory Fabric boot — `make up` brings postgres/timescale, neo4j, qdrant, minio to healthy.
   - KG round-trip — publish a Principle, semantic-search retrieves it (M1.1 acceptance).
   - Stack reboot preserves ledger and graph — `make down && make up` does not lose any prior-day data.
3. All six M0 acceptance tests still pass after the M1 retrofits land.
4. ADR-0005 written: AGE vs Neo4j decision (kept-both vs kept-one).
5. This document is updated with a "Completed" section listing the phase commit SHAs.

## Risks

- **`memory-keeper` is currently the only Mnemosyne agent.** All KNOWLEDGE_PUBLICATION traffic and all REFLECTION traffic funnels through it; if it dies the fabric stops growing. M1.3 mitigates by spinning archival out into `archivist-01`; M1.1 adds `semantic-search-01`. Per-agent sharding stays deferred to M2.
- **Embeddings are a placeholder zero vector until M1.1 lands.** Any cosine search before M1.1 will return arbitrary results. Document this in `agents/python/memory-keeper/agent.py` (already marked).
- **No KnowledgePublication protobuf yet.** M1.0 stubs accept envelopes by `MessageType=9` but parse no payload. M1.1 must define the payload proto and update `proto/` (closes #145).

## Next milestone

M2 — Aletheia MVP (Trading MVP). Issue #23. Begins after M1.5 acceptance.
