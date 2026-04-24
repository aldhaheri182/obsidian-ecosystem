# 2. GLOBAL ARCHITECTURE OVERVIEW

## 2.1 System Layers

The system is organized into seven architectural layers, each with distinct responsibilities and technology choices.

```
┌──────────────────────────────────────────────────────────┐
│              OWNER OBSERVATORY (Visualization UI)         │
│    Svelte 5 + PixiJS 8 + Three.js + NATS WebSocket        │
├──────────────────────────────────────────────────────────┤
│           GLOBAL EXECUTIVE COMMITTEE                      │
│    Global CEO │ Global CFO │ Global CRO                   │
│    Python executive agents, LLM-powered synthesis only    │
├──────────────────────────────────────────────────────────┤
│                   11 CITIES                               │
│    Aletheia | Mnemosyne | Prometheus | Hephaestus        │
│    Themis | Agora | Iris | Chronos                        │
│    Narcissus | Eris | Janus                               │
│    Each city: C-Suite board + department heads            │
│    + employee agents (150+ total)                         │
├──────────────────────────────────────────────────────────┤
│               AGENT RUNTIME (Docker containers)           │
│    Rust agents for latency-critical paths                 │
│    Python agents for ML, signals, and executives          │
│    TypeScript/Svelte for visualization bridge             │
├──────────────────────────────────────────────────────────┤
│              MESSAGE BUS (NATS + JetStream)               │
│    Pub/sub topics, queue groups, request-reply            │
│    WebSocket gateway for browser visualization            │
├──────────────────────────────────────────────────────────┤
│              MEMORY FABRIC (6 specialized stores)         │
│    Immutable Ledger (RocksDB + S3)                        │
│    Knowledge Graph (Neo4j / Apache AGE)                   │
│    Vector Store (Qdrant / pgvector)                       │
│    Working Memory (Redis Cluster)                         │
│    Time-Series Store (ClickHouse)                         │
│    Blob Store (MinIO / S3)                                │
├──────────────────────────────────────────────────────────┤
│           DATA INGESTION (Collector agents)               │
│    Polygon.io | Alpaca | Interactive Brokers              │
│    Refinitiv | Satellite | Shipping | Weather | Social    │
└──────────────────────────────────────────────────────────┘
```

## 2.2 City Interconnection Map

The eleven cities are not isolated services. They form an interconnected federation with defined communication pathways.

```
Aletheia ←→ Mnemosyne (signals query knowledge, publish principles)
Aletheia ←→ Prometheus (strategies tested, results flow back)
Aletheia ←→ Agora (orders sent externally, fills returned)
Aletheia ←→ Chronos (timestamps verified)
Aletheia ←→ Iris (performance telemetry)
Mnemosyne ←→ Prometheus (research stored, queried)
Mnemosyne ←→ All cities (all agents query knowledge)
Hephaestus ←→ All cities (manages infrastructure)
Themis ←→ All cities (compliance oversight)
Narcissus ←→ All cities (observes, simulates, proposes architecture)
Eris ←→ Aletheia (adversarial testing, firewalled)
Janus ←→ Agora (physical data ingest and actuation)
```

## 2.3 The Nexus Overworld

At the visualization layer, the cities are rendered as distinct nodes on a 2D planet map. Roads connect them — curving paths with glowing traffic representing message volume. Advancement Orbs travel along great-circle arcs from one city to another. City health is visible as colored auras. The Owner zooms from orbit down to individual cities, then to buildings, then to agents, then to individual memory nodes.
