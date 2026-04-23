"""M0 Acceptance Test #4 — Heartbeat ring within 10 s.

Subscribes to system.heartbeat.> and asserts all 6 expected agent IDs
produce a heartbeat within the 10-second budget after `make up` reaches
healthy.
"""

from __future__ import annotations

import asyncio
from typing import Set

import pytest

try:
    import nats  # type: ignore
except ImportError:
    nats = None


EXPECTED_AGENT_IDS: Set[str] = {
    "collector-equities-csv-01",
    "momentum-signal-01",
    "signal-blender-01",
    "paper-executor-01",
    "risk-overlord-01",
    "time-oracle-01",
}


async def _collect(url: str, timeout_s: float) -> Set[str]:
    assert nats is not None
    nc = await nats.connect(servers=[url])
    seen: Set[str] = set()

    async def on_msg(msg):
        # system.heartbeat.{agent_id}
        parts = msg.subject.split(".", 2)
        if len(parts) == 3:
            seen.add(parts[2])

    sub = await nc.subscribe("system.heartbeat.>", cb=on_msg)
    try:
        await asyncio.wait_for(_wait_for_full(seen), timeout=timeout_s)
    except asyncio.TimeoutError:
        pass
    await sub.unsubscribe()
    await nc.close()
    return seen


async def _wait_for_full(seen: Set[str]) -> None:
    while not EXPECTED_AGENT_IDS.issubset(seen):
        await asyncio.sleep(0.1)


@pytest.mark.acceptance
@pytest.mark.skipif(nats is None, reason="nats-py not installed")
def test_six_agents_heartbeat_within_ten_seconds():
    seen = asyncio.run(_collect("nats://localhost:4222", timeout_s=10.0))
    missing = EXPECTED_AGENT_IDS - seen
    assert not missing, f"missing heartbeats from: {missing}"
    unexpected = seen - EXPECTED_AGENT_IDS
    assert not unexpected, f"unexpected heartbeats from: {unexpected}"
