# ============================================================================
# Makefile — top-level build and operations
#
# Authorized by: spec Part 2 (Repository Structure), M0 plan §"Exit criteria".
#
# This Makefile is the operator UI for the Ecosystem. It wraps docker-compose
# for day-to-day operation and delegates to cargo / pytest / npm for tests.
#
# Targets are deliberately short and memorable — operators use them dozens of
# times a day during M0.
# ============================================================================

# --- config ---
COMPOSE      ?= docker compose
PY           ?= python3
CARGO        ?= cargo
NPM          ?= npm

# Any variable set in .env is propagated by docker-compose automatically.

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show available targets.
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# =====================================================================
# Lifecycle
# =====================================================================

.PHONY: up
up: ## Bring the full M0 stack up in the background.
	$(COMPOSE) up -d --build

.PHONY: down
down: ## Tear down all containers (preserves volumes).
	$(COMPOSE) down

.PHONY: nuke
nuke: ## Tear down AND wipe all volumes. Irreversible. Use with care.
	$(COMPOSE) down -v
	rm -rf ledger-data/ rocksdb-data/ clickhouse-data/ redis-data/ nats-data/

.PHONY: logs
logs: ## Tail the combined logs of every service.
	$(COMPOSE) logs -f --tail=50

# =====================================================================
# Build
# =====================================================================

.PHONY: build
build: build-rust build-py build-viz ## Build everything.

.PHONY: build-rust
build-rust: ## Build all Rust crates.
	$(CARGO) build --workspace --release

.PHONY: build-py
build-py: ## Install all Python agent dependencies.
	$(PY) -m pip install -U pip
	$(PY) -m pip install -e core/obsidian-agent-py
	$(PY) -m pip install -e agents/python/momentum-signal
	$(PY) -m pip install -e agents/python/signal-blender
	$(PY) -m pip install -e agents/python/paper-executor

.PHONY: build-viz
build-viz: ## Build the visualization SPA.
	cd visualization && $(NPM) ci && $(NPM) run build

# =====================================================================
# Tests
# =====================================================================

.PHONY: test
test: test-rust test-py test-acceptance ## Run all tests (unit + integration).

.PHONY: test-rust
test-rust: ## Run Rust unit tests with workspace coverage.
	$(CARGO) test --workspace

.PHONY: test-py
test-py: ## Run Python unit tests.
	$(PY) -m pytest core/obsidian-agent-py/tests agents/python/ -q

.PHONY: test-acceptance
test-acceptance: ## Run the 6 M0 acceptance tests (requires `make up`).
	$(PY) -m pytest tests/integration tests/chaos -v

# =====================================================================
# M0 operational targets (referenced in the spec)
# =====================================================================

.PHONY: replay
replay: ## Replay a prior day from the Tape. Usage: make replay DATE=2023-03-13
	$(PY) scripts/replay-day.py --date=$(DATE)

.PHONY: tamper
tamper: ## Attempt ledger tampering; expect failure.
	$(PY) scripts/tamper-ledger.py

.PHONY: seed
seed: ## Populate tests/fixtures with the bundled CSV.
	$(PY) scripts/seed-csv.py

# =====================================================================
# Protobuf
# =====================================================================

.PHONY: proto
proto: protos-rs protos-py ## Regenerate Protobuf bindings for every language.

.PHONY: protos-rs
protos-rs: ## Regenerate Rust proto bindings (build.rs drives prost-build).
	$(CARGO) build -p obsidian-bus

.PHONY: protos-py
protos-py: ## Regenerate Python proto bindings into core/obsidian-agent-py/obsidian_agent/_proto/.
	$(PY) -m pip install -q 'grpcio-tools>=1.60,<2' || true
	mkdir -p core/obsidian-agent-py/obsidian_agent/_proto
	$(PY) -m grpc_tools.protoc -Iproto \
		--python_out=core/obsidian-agent-py/obsidian_agent/_proto \
		--pyi_out=core/obsidian-agent-py/obsidian_agent/_proto \
		proto/envelope.proto proto/market_data.proto proto/signal.proto \
		proto/order.proto proto/risk.proto proto/heartbeat.proto
	@echo "--- generated files ---" && ls core/obsidian-agent-py/obsidian_agent/_proto/

.PHONY: protos-viz
protos-viz: ## Regenerate visualization proto bindings.
	cd visualization && $(NPM) run gen:proto

# =====================================================================
# Lint / format
# =====================================================================

.PHONY: fmt
fmt: ## Format Rust, Python, TypeScript.
	$(CARGO) fmt --all
	$(PY) -m ruff format core agents tests scripts
	cd visualization && $(NPM) run fmt

.PHONY: lint
lint: ## Lint Rust, Python, TypeScript.
	$(CARGO) clippy --workspace --all-targets -- -D warnings
	$(PY) -m ruff check core agents tests scripts
	cd visualization && $(NPM) run lint
