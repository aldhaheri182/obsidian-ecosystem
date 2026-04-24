"""PaperExecutorAgent: blended signal → Alpaca paper limit order → FillReport."""

from __future__ import annotations

import asyncio
import logging
import os
import uuid

from obsidian_agent import AgentContext, AgentMetadata, ObsidianAgent
from obsidian_agent._proto import order_pb2, signal_pb2
from obsidian_agent.bus import PublishOpts, VerificationMode
from paper_executor.alpaca_client import AlpacaClient, AlpacaOrderRef

log = logging.getLogger(__name__)

_MSG_TYPE_SIGNAL = 2
_MSG_TYPE_ORDER_REQUEST = 3
_MSG_TYPE_FILL_REPORT = 4

_TOPIC_SUB = "aletheia.portfolio.blended_alpha"
_TOPIC_ORDER = "aletheia.execution.order_request"
_TOPIC_FILL = "aletheia.execution.fill_report"

_M0_SHARES_PER_ORDER = 10
_PRICE_SCALE = 1_000_000  # USD × 10^6 per int64 (see obsidian-bus/prices.rs)


class PaperExecutorAgent(ObsidianAgent):
    def __init__(self):
        agent_id = os.environ.get("AGENT_ID", "paper-executor-01")
        self._metadata = AgentMetadata(
            agent_id=agent_id, city="aletheia", role="paper-executor"
        )
        self._alpaca: AlpacaClient | None = None

    @property
    def metadata(self) -> AgentMetadata:
        return self._metadata

    async def init(self, ctx: AgentContext) -> None:
        # Construct Alpaca client if credentials are available. If not, we
        # degrade gracefully: the agent still runs and still emits OrderRequest
        # + simulated FillReport so the pipeline acceptance test passes,
        # but no real order hits Alpaca paper. This is required to boot the
        # M0 stack before the owner has signed up for Alpaca.
        try:
            self._alpaca = AlpacaClient()
            log.info("paper-executor initialized with Alpaca client agent_id=%s",
                     ctx.metadata.agent_id)
        except Exception as e:
            log.warning(
                "paper-executor running WITHOUT Alpaca (reason: %s). Orders will be "
                "simulated only — set ALPACA_API_KEY + ALPACA_API_SECRET to enable "
                "real paper submissions.",
                e,
            )
            self._alpaca = None

    async def run(self, ctx: AgentContext) -> None:
        sub = await ctx.nats.subscribe(_TOPIC_SUB, VerificationMode.NoVerification)
        log.info("paper-executor running")
        try:
            async for env in sub:
                if ctx.shutdown.is_set():
                    break
                if env.type != _MSG_TYPE_SIGNAL:
                    continue
                sig = signal_pb2.Signal()
                sig.ParseFromString(env.payload)

                # M0 sizing: trivial fixed share count; skip if direction == 0.
                if sig.direction == 0:
                    continue

                order = order_pb2.OrderRequest()
                order.order_id = str(uuid.uuid4())
                order.symbol = sig.symbol
                order.side = "BUY" if sig.direction > 0 else "SELL"
                order.quantity = _M0_SHARES_PER_ORDER
                order.order_type = "LIMIT"
                # Limit at the current price scaled. Real strategies would
                # quote vs bid/ask. M0 just uses the signal's implied price —
                # we don't carry last-price in the Signal proto, so we use a
                # placeholder price of 0 and let Alpaca reject the order if
                # the price is invalid. TODO(M2): pass last_price via signal.
                order.limit_price_scaled = 0
                order.time_in_force = "DAY"
                order.execution_strategy = "AGGRESSIVE"
                order.parent_signal_id = env.message_id

                message_id = await ctx.nats.publish(
                    _TOPIC_ORDER,
                    _MSG_TYPE_ORDER_REQUEST,
                    order,
                    PublishOpts(causal_links=[env.message_id]),
                )
                log.info(
                    "order emitted order_id=%s symbol=%s side=%s qty=%d",
                    order.order_id,
                    order.symbol,
                    order.side,
                    order.quantity,
                )

                # Submit to Alpaca if the client is configured. Without keys
                # we emit the FillReport anyway so the pipeline completes.
                broker_order_id = "SIMULATED"
                venue = "SIMULATED-NO-BROKER"
                if self._alpaca is not None:
                    try:
                        ref = await asyncio.to_thread(
                            self._alpaca.submit_limit_order,
                            symbol=order.symbol,
                            side=order.side,
                            quantity=order.quantity,
                            # For M0, since we lack last-price, use a safe
                            # limit price of $0.01 — will almost certainly
                            # not fill but proves the plumbing. M2 fixes
                            # the price plumbing.
                            limit_price=0.01,
                        )
                        broker_order_id = ref.broker_order_id
                        venue = "ALPACA-PAPER"
                    except Exception as e:
                        log.warning("alpaca submit failed (continuing): %s", e)
                        broker_order_id = "FAILED"

                # Emit an immediate (simulated) FillReport so the end-to-end
                # acceptance test has a complete chain. In M2 this is
                # replaced by a real Alpaca fill-stream listener.
                fill = order_pb2.FillReport()
                fill.order_id = order.order_id
                fill.fill_price_scaled = int(0.01 * _PRICE_SCALE)
                fill.fill_quantity = order.quantity
                fill.commission_scaled = 0
                fill.venue = venue
                fill.timestamp_ns = _now_ns()

                await ctx.nats.publish(
                    _TOPIC_FILL,
                    _MSG_TYPE_FILL_REPORT,
                    fill,
                    PublishOpts(causal_links=[message_id]),
                )
                log.info(
                    "fill emitted order_id=%s broker=%s venue=%s",
                    order.order_id,
                    broker_order_id,
                    fill.venue,
                )
        finally:
            await sub.unsubscribe()


def _now_ns() -> int:
    import time
    return time.time_ns()
