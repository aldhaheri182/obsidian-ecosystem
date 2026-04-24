# 16. REPOSITORY STRUCTURE

```
obsidian-ecosystem/
├── README.md
├── LICENSE
├── Makefile
├── docker-compose.yml
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
├── docs/
│   ├── WHITEPAPER.md            # canonical index
│   ├── COMMAND_CENTER.md        # 3D Interactive Command Center spec (MV)
│   ├── whitepaper/              # 21 whitepaper section files
│   ├── cities/                  # 11 full city specs
│   ├── layers/                  # 27 advanced-layer specs (L23–L49)
│   ├── advancements/            # 6 tier catalogs (Tiny/Small/Medium/Big/Mega/Layers)
│   ├── agents/DIRECTORY.md      # 150+ agents
│   ├── memory/FABRIC.md
│   ├── risk/FRAMEWORK.md
│   ├── ui/CINEMATIC_SPEC.md
│   ├── schemas/MESSAGE_SCHEMAS.md
│   ├── acceptance/TEST_SUITE.md
│   ├── gaps/FORTY_TWO_CATEGORIES.md
│   ├── decisions/               # ADRs
│   │   ├── 0001-language-set.md
│   │   ├── 0002-container-granularity.md
│   │   ├── 0003-ledger-hash-chain.md
│   │   └── 0004-topic-naming.md
│   ├── milestones/
│   │   └── M0-walking-skeleton.md
│   ├── features/FEATURES.md
│   └── runbooks/
├── proto/
│   ├── envelope.proto
│   ├── market_data.proto
│   ├── signal.proto
│   ├── order.proto
│   ├── risk.proto
│   ├── heartbeat.proto
│   ├── executive.proto
│   └── knowledge.proto
├── core/
│   ├── obsidian-ledger/
│   ├── obsidian-bus/
│   ├── obsidian-agent-rs/
│   ├── obsidian-agent-py/
│   ├── tape-recorder/
│   └── time-oracle/
├── agents/
│   ├── rust/
│   │   ├── collector-equities-csv/
│   │   ├── risk-overlord/
│   │   └── execution-router/
│   └── python/
│       ├── momentum-signal/
│       ├── signal-blender/
│       ├── paper-executor/
│       └── executive-agents/
├── cities/
│   ├── aletheia/
│   ├── mnemosyne/
│   ├── prometheus/
│   ├── hephaestus/
│   ├── themis/
│   ├── agora/
│   ├── iris/
│   ├── chronos/
│   ├── narcissus/
│   ├── eris/
│   └── janus/
├── infrastructure/
│   ├── kubernetes/
│   ├── terraform/
│   └── monitoring/
├── visualization/                # v1 — Svelte + PixiJS + Three.js (current)
│   ├── src/
│   └── package.json
├── command-center/               # MV — Next.js 14 + React Three Fiber (rebuild)
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── store/
│   │   ├── data/
│   │   └── types/
│   └── package.json
├── tests/
│   ├── integration/
│   ├── e2e/
│   ├── chaos/
│   └── fixtures/
│       └── aapl_2023-03-15_1min.csv
└── scripts/
    ├── bootstrap.sh
    ├── tamper-ledger.py
    └── replay-day.sh
```
