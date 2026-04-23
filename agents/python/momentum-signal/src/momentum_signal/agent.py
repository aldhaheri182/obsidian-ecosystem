"""Wiring: subscribe to market data, run SMA, publish Signal protos."""

from __future__ import annotations

import logging
import os
from typing import Dict

from momentum_signal.sma import SmaState, update
from obsidian_agent import AgentContext, AgentMetadata, ObsidianAgent
from obsidian_agent._proto import market_data_pb2, signal_pb2
from obsidian_agent.bus import PublishOpts, VerificationMode

log = logging.getLogger(__name__)

# MessageType.MARKET_DATA = 1; SIGNAL = 2 (from envelope.proto).
_MSG_TYPE_SIGNAL = 2
_TOPIC_ALPHA = "aletheia.trading_floor.momentum.alpha"


class MomentumSignalAgent(ObsidianAgent):
    def __init__(self):
        agent_id = os.environ.get("AGENT_ID", "momentum-signal-01")
        self._metadata = AgentMetadata(agent_id=agent_id, city="aletheia", role="momentum-signal")
        self._state: Dict[str, SmaState] = {}

    @property
    def metadata(self) -> AgentMetadata:
        return self._metadata

    async def run(self, ctx: AgentContext) -> None:
        sub = await ctx.nats.subscribe(
            "aletheia.data.us_equities.*", VerificationMode.NoVerification
        )
        log.info("momentum-signal running agent_id=%s", ctx.metadata.agent_id)
        try:
            async for env in sub:
                if ctx.shutdown.is_set():
                    break
                md = market_data_pb2.MarketData()
                md.ParseFromString(env.payload)
                state = self._state.setdefault(md.symbol, SmaState())
                crossover = update(state, md.price)
                if crossover is None:
                    continue

                sig = signal_pb2.Signal()
                sig.agent_id = ctx.metadata.agent_id
                sig.symbol = md.symbol
                sig.signal_type = "MOMENTUM"
                sig.direction = crossover.direction
                sig.confidence = float(crossover.confidence)
                sig.horizon = "SHORT_TERM"
                sig.expected_holding_days = 5
                sig.rationale = (
                    f"SMA20={crossover.short_mean:.2f} vs SMA50={crossover.long_mean:.2f}; "
                    f"crossover {'UP' if crossover.direction > 0 else 'DOWN'}"
                )
                sig.causal_links.append(env.message_id)
                sig.model_version = "sma_crossover-0.1.0"

                await ctx.nats.publish(
                    _TOPIC_ALPHA, _MSG_TYPE_SIGNAL, sig, PublishOpts()
                )
                log.info(
                    "signal published symbol=%s dir=%d conf=%.2f",
                    md.symbol,
                    sig.direction,
                    sig.confidence,
                )
        finally:
            await sub.unsubscribe()
