"""ObsidianAgent base class — Python mirror of ``core/obsidian-agent-rs/src/agent.rs``."""

from __future__ import annotations

from abc import ABC, abstractmethod

from obsidian_agent.context import AgentContext
from obsidian_agent.lifecycle import Lifecycle
from obsidian_agent.metadata import AgentMetadata


class ObsidianAgent(ABC):
    """Every Python agent in the Ecosystem subclasses this.

    Lifecycle contract (enforced by the Supervisor):
      1. Construct (via factory) — no dependencies available.
      2. ``await self.init(ctx)`` — subscribe, reconstruct from ledger.
      3. ``await self.run(ctx)`` — main loop. Must observe ``ctx.shutdown``.
      4. ``await self.shutdown(ctx)`` — flush state, close resources.
    """

    @property
    @abstractmethod
    def metadata(self) -> AgentMetadata: ...

    async def init(self, ctx: AgentContext) -> None:
        """Called once after the NatsClient is injected. Default: noop."""

    @abstractmethod
    async def run(self, ctx: AgentContext) -> None:
        """Main loop. Must return when ``ctx.shutdown`` is set."""

    async def shutdown(self, ctx: AgentContext) -> None:
        """Called once after run exits, on both graceful and restart paths. Default: noop."""

    def status(self) -> Lifecycle:
        """Self-reported status (default: Active)."""
        return Lifecycle.ACTIVE
