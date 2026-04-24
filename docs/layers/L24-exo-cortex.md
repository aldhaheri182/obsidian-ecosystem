# Layer 24 — Exo-Cortex

**Core innovation:** Globally distributed low-latency sensors.

## Scope

A distributed sensory mesh — micro-collectors deployed at points of low network distance to exchanges, data providers, and news venues — feeding the main ecosystem with sub-millisecond observations.

## Components

- **Edge Nodes**: Small Rust binaries co-located in colo facilities adjacent to NYSE, NASDAQ, CME, LSE, HKEX, JPX, CBOE, OPRA. Each node is a collector-agent replica.
- **Global Mesh Router**: NATS leaf-node cluster stitching edge nodes into the home cluster with mTLS.
- **Sensor Fusion Agent**: Reconciles near-identical packets from multiple edge nodes, produces a single canonical observation annotated with provenance and latency metadata.

## Acceptance Criteria

- Edge-to-core latency p99 < 10 ms per node.
- Fusion agent resolves duplicates with no double-counting.
- Per-venue packet loss alert if > 0.1% in any rolling minute.
- Graceful degradation: if an edge node drops, fallback to remaining nodes with recorded gap.
