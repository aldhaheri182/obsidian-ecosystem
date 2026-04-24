"""Entry point: spawn MemoryKeeperAgent + daily ledger-archival loop.

Executed inside the `mnemosyne-core` container. Expects env:
    AGENT_ID (default: memory-keeper-01)
    CITY     (default: mnemosyne)
    NATS_URL
    NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
    QDRANT_URL
    MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
    LEDGER_PATH
"""

from __future__ import annotations

import asyncio
import logging
import os

from obsidian_agent.supervisor import (
    AgentSpec,
    SubscriptionPolicy,
    Supervisor,
    SupervisorConfig,
)
from obsidian_agent.metadata import AgentMetadata

from memory_keeper.agent import MemoryKeeperAgent
from memory_keeper.ledger_archival import daily_archival_loop


def _configure_logging() -> None:
    level = os.environ.get("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)-5s %(name)s | %(message)s",
    )


async def _main() -> None:
    _configure_logging()

    from pathlib import Path

    agent_id = os.environ.get("AGENT_ID", "memory-keeper-01")
    spec = AgentSpec.new(
        AgentMetadata(agent_id=agent_id, city="mnemosyne", role="memory-keeper"),
        SubscriptionPolicy.NO_VERIFICATION,
        MemoryKeeperAgent,
    )
    cfg = SupervisorConfig(
        process_name="mnemosyne-core",
        city="mnemosyne",
        data_root=Path(os.environ.get("LEDGER_PATH", "/data/ledger")),
        nats_url=os.environ.get("NATS_URL", "nats://nats:4222"),
    )
    supervisor = Supervisor(cfg).register(spec)

    # Run supervisor + archival loop concurrently.
    await asyncio.gather(
        supervisor.run(),
        daily_archival_loop(Path(os.environ.get("LEDGER_PATH", "/data/ledger"))),
    )


if __name__ == "__main__":
    asyncio.run(_main())
