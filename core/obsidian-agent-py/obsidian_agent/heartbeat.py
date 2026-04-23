"""Heartbeat loop — Python mirror of ``core/obsidian-agent-rs/src/heartbeat.rs``."""

from __future__ import annotations

import asyncio
import logging

from obsidian_agent._proto import heartbeat_pb2
from obsidian_agent.bus import PublishOpts
from obsidian_agent.context import AgentContext
from obsidian_agent.lifecycle import Lifecycle

log = logging.getLogger(__name__)

HEARTBEAT_PERIOD_SECONDS = 1.0
# Matches proto/envelope.proto MessageType.HEARTBEAT (= 6).
_MSG_TYPE_HEARTBEAT = 6


class StatusHandle:
    """Thread-safe-ish handle (asyncio, single-threaded) for the current Lifecycle."""

    def __init__(self, initial: Lifecycle = Lifecycle.BOOTING):
        self._value = initial

    def set(self, value: Lifecycle) -> None:
        self._value = value

    def get(self) -> Lifecycle:
        return self._value


async def run_heartbeat_loop(ctx: AgentContext, status: StatusHandle) -> None:
    topic = ctx.metadata.heartbeat_topic()
    log.debug("heartbeat loop starting agent_id=%s topic=%s", ctx.metadata.agent_id, topic)

    # Skip the first immediate tick.
    await asyncio.sleep(HEARTBEAT_PERIOD_SECONDS)

    while not ctx.shutdown.is_set():
        try:
            await _publish_heartbeat(ctx, topic, status.get())
        except Exception as e:
            log.warning("heartbeat publish failed (continuing): %s", e)
        # Race shutdown vs sleep to exit promptly on shutdown.
        try:
            await asyncio.wait_for(ctx.shutdown.wait(), timeout=HEARTBEAT_PERIOD_SECONDS)
        except asyncio.TimeoutError:
            continue

    # Final "Retired" heartbeat on graceful shutdown.
    try:
        await _publish_heartbeat(ctx, topic, Lifecycle.RETIRED)
    except Exception:
        pass
    log.debug("heartbeat loop stopping agent_id=%s", ctx.metadata.agent_id)


async def _publish_heartbeat(ctx: AgentContext, topic: str, status: Lifecycle) -> None:
    hb = heartbeat_pb2.Heartbeat()
    hb.agent_id = ctx.metadata.agent_id
    hb.city = ctx.metadata.city
    hb.role = ctx.metadata.role
    hb.status = status.to_wire()
    hb.uptime_seconds = ctx.uptime_seconds()
    hb.messages_published = ctx.messages_published()
    hb.ledger_head_hash = ""  # populated when obsidian-ledger integrates
    await ctx.nats.publish(topic, _MSG_TYPE_HEARTBEAT, hb, PublishOpts())
