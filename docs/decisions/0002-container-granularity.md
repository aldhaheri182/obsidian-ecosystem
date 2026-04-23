# ADR 0002 — Container Granularity

**Status:** Accepted (M0).
**Date:** 2026-04-24.
**Authorizing sections:** spec Part 6.3–6.4, M0 plan §"In-scope components".

## Context

The maximal specification implies one Kubernetes Deployment (therefore one container) per agent. With 150+ agents, this means 150+ pods on the target architecture. For a single-VM docker-compose MVP, that is infeasible — and even at cluster scale, per-agent containers buy isolation the project does not need at the cost of memory, bus subscription overhead, and operational complexity.

## Decision

In M0 and for the foreseeable single-VM deployment, **the unit of containerization is the city (or in Aletheia's case, a language-homogeneous half-city)**. Agents are concurrent tasks inside a per-container supervisor process.

Specifically for M0:

- `aletheia-core` (Rust process) hosts `collector-equities-csv` + `risk-overlord` as tokio tasks.
- `aletheia-logic` (Python process) hosts `momentum-signal` + `signal-blender` + `paper-executor` as asyncio tasks.

The logical agent identity is preserved: each agent has its own `agent_id`, its own ledger, its own NATS subscriptions, its own heartbeat stream. The bus and the UI cannot distinguish an agent-per-container deployment from an agent-as-task deployment.

## Rationale

- **Physical footprint:** 150 containers × ~100 MB base overhead ≈ 15 GB of pure runtime overhead. On a 64 GB VM that is non-trivial; on a laptop it is prohibitive.
- **Isolation cost:** Per-agent containers give OS-level isolation. For M0, in-process task isolation (caught exceptions + supervisor restart) is sufficient. Real isolation requirements apply only to `risk-overlord` (fate-of-the-firm) and potentially to `tape-recorder` (captures everything).
- **Deployment complexity:** Per-agent deployments generate per-agent ConfigMaps, Secrets, ServiceAccounts, NetworkPolicies. Per-city deployments collapse this by roughly 10×.
- **Reversibility:** The trait-based abstraction means any individual agent can be extracted to its own container or pod later without touching consumers. We have already earmarked `risk-overlord` as a probable M5+ extraction.

## Consequences

- Each city container runs a supervisor (tokio `JoinSet` in Rust, asyncio `TaskGroup` in Python) that restarts failed agent tasks within 5 s and logs every restart to the tape.
- Ledgers are still per-agent — each agent task opens its own RocksDB instance under `./ledger-data/{agent_id}/`. A container crash does not corrupt another agent's ledger.
- The `obsidian-agent-rs` and `obsidian-agent-py` crates provide the supervisor abstraction. Writing a new agent does not require knowing about the supervisor.
- When a specific agent needs hard resource guarantees (CPU pinning, dedicated memory, latency isolation), we extract it to its own container behind the same interface. This is an M5+ concern.
