"""M0 passthrough blender.

In M0 we only have one upstream signal type; the blender just republishes
each incoming Signal as `BLENDED`. M2 replaces this with real weighted
ensembling (regime-aware, with correlation penalty).
"""

from __future__ import annotations

import logging
import os

from obsidian_agent import AgentContext, AgentMetadata, ObsidianAgent
from obsidian_agent._proto import signal_pb2
from obsidian_agent.bus import PublishOpts, VerificationMode

log = logging.getLogger(__name__)

_MSG_TYPE_SIGNAL = 2
_SUBSCRIBE_TOPIC = "aletheia.trading_floor.>"
_PUBLISH_TOPIC = "aletheia.portfolio.blended_alpha"
_MODEL_VERSION = "passthrough-0.1.0"


class SignalBlenderAgent(ObsidianAgent):
    def __init__(self):
        agent_id = os.environ.get("AGENT_ID", "signal-blender-01")
        self._metadata = AgentMetadata(agent_id=agent_id, city="aletheia", role="signal-blender")

    @property
    def metadata(self) -> AgentMetadata:
        return self._metadata

    async def run(self, ctx: AgentContext) -> None:
        sub = await ctx.nats.subscribe(_SUBSCRIBE_TOPIC, VerificationMode.NoVerification)
        log.info("signal-blender running agent_id=%s", ctx.metadata.agent_id)
        try:
            async for env in sub:
                if ctx.shutdown.is_set():
                    break
                if env.type != _MSG_TYPE_SIGNAL:
                    continue
                upstream = signal_pb2.Signal()
                upstream.ParseFromString(env.payload)

                blended = signal_pb2.Signal()
                blended.agent_id = ctx.metadata.agent_id
                blended.symbol = upstream.symbol
                blended.signal_type = "BLENDED"
                blended.direction = upstream.direction
                blended.confidence = upstream.confidence
                blended.horizon = upstream.horizon
                blended.expected_holding_days = upstream.expected_holding_days
                blended.rationale = (
                    f"Passthrough blend of {upstream.agent_id}: {upstream.rationale}"
                )
                blended.causal_links.append(env.message_id)
                blended.model_version = _MODEL_VERSION

                await ctx.nats.publish(
                    _PUBLISH_TOPIC, _MSG_TYPE_SIGNAL, blended, PublishOpts()
                )
                log.info(
                    "blended symbol=%s dir=%d conf=%.2f",
                    blended.symbol,
                    blended.direction,
                    blended.confidence,
                )
        finally:
            await sub.unsubscribe()
