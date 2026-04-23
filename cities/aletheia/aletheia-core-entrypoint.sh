#!/bin/sh
# aletheia-core launches both binaries, forwards signals, exits on first death.
set -e

: "${NATS_URL:=nats://nats:4222}"
: "${CITY:=aletheia}"

# Start the collector in the background.
AGENT_ID=collector-equities-csv-01 \
  CITY=aletheia \
  /usr/local/bin/collector-equities-csv &
collector_pid=$!

# Start the risk overlord in the background.
AGENT_ID=risk-overlord-01 \
  CITY=aletheia \
  /usr/local/bin/risk-overlord &
risk_pid=$!

# On SIGTERM/SIGINT, forward and wait.
trap 'kill -TERM "$collector_pid" "$risk_pid" 2>/dev/null; wait; exit 0' TERM INT

# Wait for either to exit; exit code propagates.
wait -n "$collector_pid" "$risk_pid"
status=$?
echo "aletheia-core: child exited status=$status; shutting down siblings"
kill -TERM "$collector_pid" "$risk_pid" 2>/dev/null || true
wait
exit $status
