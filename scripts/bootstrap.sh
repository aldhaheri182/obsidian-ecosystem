#!/usr/bin/env bash
# scripts/bootstrap.sh
# Idempotent setup: create ledger-data/ bind mount with safe permissions,
# copy .env.example to .env if missing, pull base images.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> ledger-data volume"
mkdir -p ledger-data
# Docker containers run as uid 10001 (see Dockerfiles). Make the dir writable.
chmod 0777 ledger-data || true

echo "==> .env"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "   created .env from .env.example — edit ALPACA_API_KEY / ALPACA_API_SECRET before 'make up'"
fi

echo "==> pulling base images"
docker compose pull nats redis clickhouse || true

echo "==> done."
