"""AgentContext — Python mirror of ``core/obsidian-agent-rs/src/context.rs``."""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from pathlib import Path

from obsidian_agent.bus import NatsClient
from obsidian_agent.metadata import AgentMetadata


@dataclass
class AgentContext:
    metadata: AgentMetadata
    nats: NatsClient
    ledger_dir: Path
    registry_root: Path
    boot_time: float  # time.monotonic() at boot
    shutdown: asyncio.Event

    def uptime_seconds(self) -> int:
        return int(time.monotonic() - self.boot_time)

    def messages_published(self) -> int:
        return self.nats.messages_published()

    def is_shutdown(self) -> bool:
        return self.shutdown.is_set()

    async def await_shutdown(self) -> None:
        await self.shutdown.wait()
