# City 2: Mnemosyne — Memory & Knowledge Management

Mnemosyne is the custodian of all knowledge in the ecosystem. It houses the Great Library, where published principles are stored as Gold Nodes. It performs causal auditing of agent reasoning. It manages the summarization pipeline that compresses raw events into episodes, patterns, and principles.

## Districts

- **Great Library.** Towering shelves of glowing memory nodes. Searchable via natural language through the Semantic Search Agent. The central dome glows steady solar gold.
- **Archive Vaults.** Deep underground storage for raw ledger snapshots. Cold, dark, silent.
- **Causal Audit Chamber.** Where the Causal Auditor tests the statistical validity of claimed causal links. Permutation tests, counterfactual simulations, and multiple-hypothesis corrections are performed here.
- **Memory Decay Observatory.** Tracks the half-life of all knowledge nodes. Identifies principles that are becoming obsolete.

## Agent Inventory

- `memory-keeper-*` (Python, sharded per agent): Interface to Neo4j graph, Qdrant vectors, and RocksDB ledgers. Responds to read/write queries from all agents.
- `archivist` (Python): Manages S3 archival and retrieval of snapshotted ledgers.
- `causal-auditor` (Python): Statistical validation of claimed causal relationships. Permutation tests, Granger causality, instrumental variable analysis.
- `summarizer-L1` (Python): Compresses raw events into episodes (minutes to hours).
- `summarizer-L2` (Python): Compresses episodes into patterns (days to weeks).
- `summarizer-L3` (Python): Compresses patterns into principles (months to years). Uses LLM for natural language synthesis.
- `knowledge-graph-maintainer` (Python): Ensures referential integrity, optimizes indexes, removes orphan nodes.
- `vector-index-builder` (Python): Periodically re-indexes new reflections and news articles.
- `semantic-search-agent` (Python): Responds to natural language queries from any agent. Hybrid search: vector similarity + keyword + graph traversal.

## C-Suite

- `ceo-mnemosyne` (Python, LLM-powered)
- `chief-archivist`: Unique role replacing CRO — manages archival strategy and data retention.
- `cdo-mnemosyne`: Data quality and ontology governance.

## Visual Metaphor

An ancient library city with a central golden dome, towering shelves of glowing nodes extending deep underground, reading rooms with soft illumination, and causal links visible as constellation-like webs between nodes.

## Command Center Chamber (MV)

- Accent color: Solar Gold `#FFD166`.
- Interior: Central semi-sphere dome (radius 0.6) with a glowing golden orb inside. Wall shelves with rows of tiny book-boxes on brackets.
- Agents (4): Robed archivists (long oval bodies) that float slightly above the floor and orbit the dome.
- Animations: Dome orb pulses brightness; agents gently bob and orbit.
- Props: dome, orb, 20 tiny shelf boxes.
