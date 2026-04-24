# Agent Directory — 150+ agents across 11 cities

Complete enumeration. Mirrors whitepaper §8 and supersedes it on conflict.

See also: `../cities/` for the full per-city agent inventory with districts, C-suites, and visual metaphors.

## Totals

| Area | Count |
|:-----|:------|
| Executive (GEC + City CEOs) | 12 |
| Aletheia (collectors + signals + processors + allocators + executors + guardians + C-suite) | ≥ 32 (signal agents run in multiple instances, so real count is higher) |
| Mnemosyne | 9 (memory-keepers sharded, so real count is higher) |
| Prometheus | 7 |
| Hephaestus | 7 |
| Themis | 6 |
| Agora | 7 |
| Iris | 4 |
| Chronos | 4 |
| Narcissus | 5 |
| Eris | full Aletheia mirror |
| Janus | 4 |
| Special / Meta | 7 (tape-recorder, mirror-agent, reaper, void, feature-ideation, code-generation, motherseed-coordinator) |

## Latency-Critical Agents (Rust)

| Agent | Budget |
|:------|:-------|
| `risk-overlord` | < 100 ms p99 breach → override |
| `circuit-breaker` | < 50 ms |
| `leverage-monitor` | < 100 ms |
| `order-router` | < 1 ms per order |
| `execution-slicer` | < 1 ms per slice decision |
| `fill-monitor` | < 10 ms |
| `collector-*` | 10 k msg/s, < 1 ms internal |
| `time-oracle` | 1 Hz ± < 1 µs jitter |
| `event-sequencer` | nanosecond HLC |
| `latency-analyzer` | microsecond histograms |
| `clock-drift-corrector` | millisecond skew detection |
| `tape-recorder` | p99 write < 10 ms |

## Special / Meta Agents

- `tape-recorder` — all-message archival to ClickHouse + S3 (Rust).
- `mirror-agent` — estimates self-impact (Python).
- `reaper-agent` — retires underperformers (Python).
- `void-agent` — permanent cash advocate (Python).
- `feature-ideation-agent` — new-feature discovery (Python).
- `code-generation-agent` — boilerplate agent code (Python).
- `motherseed-coordinator` — civilization migration orchestration (L47; Python).
