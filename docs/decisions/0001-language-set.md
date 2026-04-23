# ADR 0001 — Language Set

**Status:** Accepted (M0).
**Date:** 2026-04-24.
**Authorizing sections:** spec Part 1.4.

## Context

The original specification listed four implementation languages: Rust, Python, Go, and TypeScript. For a solo-developer, multi-year project, each additional language imposes non-trivial cost: toolchain, dependency management, CI configuration, mental context switching, test frameworks, debugging idioms, and ecosystem fluency maintenance.

## Decision

The Obsidian Ecosystem uses three languages:

1. **Rust** — latency-critical paths: ledger, bus helpers, tape recorder, time oracle, collectors, execution router, risk overlord, API gateway, circuit breakers.
2. **Python** — reasoning paths: signal agents, ML, portfolio optimization, executive synthesis, memory keepers, causal inference, orchestration, broker adapters.
3. **TypeScript (Svelte + PixiJS)** — visualization only.

**Go is removed from the stack.**

## Rationale

- Every role the spec assigned to Go is trivially covered by Python (broker adapters, orchestration, health monitoring, API gateway) or Rust (high-throughput HTTP, which `axum` handles as well as Go's stdlib).
- Python broker SDKs (`alpaca-py`, `ib_insync`, `ccxt`) are first-class; Go equivalents are community-maintained and lag.
- A solo developer's cognitive bandwidth is the binding constraint, not CPU.

## Consequences

- No `agents/go/` directory. Any temptation to reintroduce Go must pass a superseding ADR.
- The Kubernetes orchestrator (when it exists, M5+) will use the official Python Kubernetes client rather than Go operators.
- API gateway (M4+) is written in Rust with `axum`, using the same `obsidian-bus` and `obsidian-ledger` crates the rest of the Rust codebase uses.
