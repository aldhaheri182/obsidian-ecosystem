#!/usr/bin/env bash
# scripts/bootstrap.sh
# Idempotent setup for macOS + Docker Desktop / OrbStack / colima.
# Creates ledger-data/ bind mount, copies .env.example to .env if missing,
# pulls base images, checks that the Docker VM has enough memory.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Host detection.
uname_s="$(uname -s)"
echo "==> host: $uname_s"
if [ "$uname_s" = "Darwin" ]; then
  echo "    macOS detected. Ensure Docker Desktop (Settings -> Resources -> Memory >= 8 GB)"
  echo "    or OrbStack (default 8 GB is fine) is running before 'make up'."
fi

# Docker availability.
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found on PATH. Install Docker Desktop, OrbStack, or colima." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon not reachable. Start Docker Desktop / OrbStack / colima first." >&2
  exit 1
fi

# Memory sanity (best-effort).
mem_bytes="$(docker info --format '{{.MemTotal}}' 2>/dev/null || echo 0)"
mem_gb=$(( mem_bytes / 1024 / 1024 / 1024 ))
if [ "$mem_gb" -gt 0 ] && [ "$mem_gb" -lt 7 ]; then
  echo "WARNING: Docker VM has ${mem_gb} GB total. M0 needs ~6 GB runtime."
  echo "         Increase Docker Desktop memory to >= 8 GB before 'make up' or expect OOM."
fi

echo "==> ledger-data volume"
mkdir -p ledger-data
# Docker containers run as uid 10001 (see Dockerfiles). On macOS Docker
# Desktop / OrbStack translate host uid <-> container uid, but a permissive
# mode makes bind-mount volumes cooperative across all three backends.
chmod 0777 ledger-data || true

echo "==> .env"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "   created .env from .env.example — edit ALPACA_API_KEY / ALPACA_API_SECRET before 'make up'"
fi

echo "==> pulling base images (first run is slow; subsequent runs are cached)"
docker compose pull nats redis clickhouse || true

echo "==> done."
