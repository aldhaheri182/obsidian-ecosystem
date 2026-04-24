# 8. COMPLETE AGENT DIRECTORY — ALL 150+ AGENTS

The full, unabridged agent directory lives at [`../agents/DIRECTORY.md`](../agents/DIRECTORY.md). This section reproduces its tables by area.

## 8.1 Executive Agents (12)

| Agent ID | City | Language | Role |
|:---------|:-----|:---------|:-----|
| `global-ceo` | GEC | Python | Global Chief Executive Officer |
| `global-cfo` | GEC | Python | Global Chief Financial Officer |
| `global-cro` | GEC | Python | Global Chief Risk Officer |
| `ceo-aletheia` | Aletheia | Python | City CEO |
| `ceo-mnemosyne` | Mnemosyne | Python | City CEO |
| `ceo-prometheus` | Prometheus | Python | City CEO |
| `ceo-hephaestus` | Hephaestus | Python | City CEO |
| `ceo-themis` | Themis | Python | City CEO |
| `ceo-agora` | Agora | Python | City CEO |
| `ceo-iris` | Iris | Python | City CEO |
| `ceo-chronos` | Chronos | Python | City CEO |
| `ceo-narcissus` | Narcissus | Python | City CEO |

## 8.2 Aletheia Agents — Collectors (6)

| Agent ID | Language | Input | Output Topic |
|:---------|:---------|:------|:-------------|
| `collector-us-equities` | Rust | Polygon.io WS | `aletheia.data.us_equities.{symbol}` |
| `collector-futures` | Rust | CME/ICE via broker | `aletheia.data.futures.{symbol}` |
| `collector-fx` | Rust | OANDA/IB | `aletheia.data.fx.{pair}` |
| `collector-options` | Rust | OPRA via broker | `aletheia.data.options.{symbol}` |
| `collector-crypto` | Rust | Coinbase/Binance | `aletheia.data.crypto.{symbol}` |
| `corporate-actions` | Python | Refinitiv feed | `aletheia.data.corporate_actions.{symbol}` |

## 8.3 Aletheia Agents — Signals (7 types, multiple instances)

| Agent ID Pattern | Language | Strategy | Output Topic |
|:-----------------|:---------|:---------|:-------------|
| `momentum-signal-*` | Python | Time-series and cross-sectional momentum | `aletheia.trading_floor.momentum_lab.momentum.alpha` |
| `mean-reversion-signal-*` | Python | Bollinger, RSI, intraday mean-reversion | `aletheia.trading_floor.meanrev_lab.meanrev.alpha` |
| `carry-signal-*` | Python | FX carry, futures roll yield | `aletheia.trading_floor.carry_lab.carry.alpha` |
| `vol-arb-signal-*` | Python | Implied vs historical volatility | `aletheia.trading_floor.vol_lab.vol_arb.alpha` |
| `stat-arb-signal-*` | Python | Cointegration, PCA baskets | `aletheia.trading_floor.statarb_lab.stat_arb.alpha` |
| `sentiment-signal` | Python | FinBERT NLP on news/social | `aletheia.trading_floor.sentiment_lab.sentiment.alpha` |
| `flow-signal` | Python | Options flow, dark pool, order book | `aletheia.trading_floor.flow_lab.flow.alpha` |

## 8.4 Aletheia Agents — Processors (3)

| Agent ID | Language | Function |
|:---------|:---------|:---------|
| `signal-blender` | Python | Weighted ensemble of all active signals → `aletheia.portfolio.blended_alpha` |
| `regime-detector` | Python | HMM/Deep classifier of market state → `aletheia.portfolio.regime` |
| `correlation-monitor` | Python | 60-day rolling correlation matrix |

## 8.5 Aletheia Agents — Allocators (3)

| Agent ID | Language | Function |
|:---------|:---------|:---------|
| `portfolio-optimizer` | Python | Constrained optimization → `aletheia.portfolio.desired_positions` |
| `capital-allocator` | Python | Dynamic sub-allocation to strategy families |
| `void-agent` | Python | Permanent cash advocate |

## 8.6 Aletheia Agents — Executors (3)

| Agent ID | Language | Function |
|:---------|:---------|:---------|
| `order-router` | Rust | Venue selection, order generation |
| `execution-slicer` | Rust | TWAP/VWAP slicing with Dark Forest randomization |
| `fill-monitor` | Rust | Implementation shortfall, execution quality |

## 8.7 Aletheia Agents — Guardians (3)

| Agent ID | Language | Function | Latency Budget |
|:---------|:---------|:---------|:---------------|
| `risk-overlord` | Rust | Position monitoring, hard limit enforcement | <100ms from breach to override |
| `circuit-breaker` | Rust | Rapid loss detection | <50ms |
| `leverage-monitor` | Rust | Gross/net leverage, margin tracking | <100ms |

## 8.8 Aletheia Agents — C-Suite (7)

| Agent ID | Role |
|:---------|:-----|
| `ceo-aletheia` | City CEO |
| `cro-aletheia` | Chief Risk Officer |
| `cfo-aletheia` | Chief Financial Officer |
| `cso-aletheia` | Chief Strategy Officer |
| `cto-aletheia` | Chief Technology Officer |
| `cco-aletheia` | Chief Compliance Officer |
| `cdo-aletheia` | Chief Data Officer |

## 8.9 Mnemosyne Agents (9)

| Agent ID | Language | Function |
|:---------|:---------|:---------|
| `memory-keeper-*` | Python | Neo4j/Qdrant/Ledger interface (sharded) |
| `archivist` | Python | S3 archival and retrieval |
| `causal-auditor` | Python | Statistical causation validation |
| `summarizer-L1` | Python | Raw → Episode compression |
| `summarizer-L2` | Python | Episode → Pattern compression |
| `summarizer-L3` | Python | Pattern → Principle compression (LLM) |
| `knowledge-graph-maintainer` | Python | Graph integrity, indexes |
| `vector-index-builder` | Python | Embedding pipeline |
| `semantic-search` | Python | Natural language query engine |

## 8.10 Prometheus Agents (7)

| Agent ID | Language | Function |
|:---------|:---------|:---------|
| `hypothesis-generator` | Python (LLM) | Strategy idea formulation |
| `backtest-runner` | Python (Ray/Dask) | Parallel backtesting with CPCV |
| `dream-explorer` | Python | Dream Room session management |
| `paper-replicator` | Python (LLM) | Academic paper replication |
| `adversarial-tester` | Python | Edge case and fragility discovery |
| `overfitting-detector` | Python | DSR, PBO, FWER computation |
| `feature-ideation` | Python | New feature suggestions |

## 8.11 Hephaestus Agents (7)

| Agent ID | Language | Function |
|:---------|:---------|:---------|
| `orchestrator` | Python | Kubernetes pod management |
| `resource-balancer` | Python | Cluster utilization optimization |
| `security-sentinel` | Python | Intrusion detection, Falco integration |
| `latency-optimizer` | Python | Ping mesh, route optimization |
| `data-pipeline-monitor` | Python | Collector health monitoring |
| `backup-recovery` | Python | Velero backups, Motherseed Protocol |
| `dependency-auditor` | Python | CVE scanning, version tracking |

## 8.12 Themis Agents (6)

| Agent ID | Language | Function |
|:---------|:---------|:---------|
| `rule-enforcer` | Python | Per-jurisdiction trading rule checks |
| `legal-auditor` | Python | Regulatory report generation |
| `ethics-watchdog` | Python | Ethical constraint evaluation |
| `regulatory-monitor` | Python | Regulatory change detection |
| `filing-agent` | Python | Automated regulatory filing |
| `whistleblower-receptionist` | Python | Anonymous internal reporting |

## 8.13 Agora Agents (7)

| Agent ID | Language | Function |
|:---------|:---------|:---------|
| `api-gateway` | Rust | gRPC-to-NATS bridge |
| `broker-interface-alpaca` | Python | Alpaca API integration |
| `broker-interface-ibkr` | Python | Interactive Brokers API integration |
| `data-vendor-negotiator` | Python | Vendor relationship management |
| `stargate-immigration` | Python | External agent registration |
| `external-agent-quarantine-monitor` | Python | Sandbox observation |
| `news-feed-ingestor` | Python | News normalization pipeline |

## 8.14 Iris Agents (4)

| Agent ID | Language | Function |
|:---------|:---------|:---------|
| `health-monitor` | Python | SLO computation, metric collection |
| `anomaly-detector` | Python | ML-based anomaly detection |
| `predictive-maintenance` | Python | Failure prediction, maintenance scheduling |
| `alert-dispatcher` | Python | Multi-channel alert routing |

## 8.15 Chronos Agents (4)

| Agent ID | Language | Function | Precision |
|:---------|:---------|:---------|:----------|
| `time-oracle` | Rust | GPS-disciplined master clock, HLC | Nanosecond |
| `event-sequencer` | Rust | HLC assignment, causal ordering | Nanosecond |
| `latency-analyzer` | Rust | End-to-end latency measurement | Microsecond |
| `clock-drift-corrector` | Rust | Skew detection and correction | Millisecond |

## 8.16 Narcissus Agents (5)

| Agent ID | Language | Function |
|:---------|:---------|:---------|
| `digital-twin-synchronizer` | Python | Real-time twin state mirroring |
| `architecture-proposal` | Python (LLM) | Structural improvement suggestions |
| `simulation-validator` | Python | Change-impact simulation |
| `self-healing-deployer` | Python | Autonomous infrastructure deployment |
| `paradox-guard` | Python | Recursion depth monitoring |

## 8.17 Eris Agents (mirror of Aletheia signals and guardians)

All Aletheia Signal Agents and Guardian Agents have inverse counterparts in Eris. These are deployed in an isolated namespace with no access to real capital.

## 8.18 Janus Agents (4)

| Agent ID | Language | Function |
|:---------|:---------|:---------|
| `iot-ingestor` | Python | IoT sensor data ingestion |
| `satellite-imagery-processor` | Python (CV) | Satellite image analysis |
| `human-expert-interface` | Python | Paid expert query API |
| `physical-actuator-controller` | Python | Sandboxed physical asset control |

## 8.19 Special/Meta Agents (7)

| Agent ID | Language | Function |
|:---------|:---------|:---------|
| `tape-recorder` | Rust | All-message archival to ClickHouse and S3 |
| `mirror-agent` | Python | System self-impact estimation |
| `reaper-agent` | Python | Agent performance monitoring and retirement |
| `void-agent` | Python | Permanent cash advocacy |
| `feature-ideation-agent` | Python | New feature discovery and suggestion |
| `code-generation-agent` | Python | Boilerplate agent code generation |
| `motherseed-coordinator` | Python | Civilization migration orchestration |
