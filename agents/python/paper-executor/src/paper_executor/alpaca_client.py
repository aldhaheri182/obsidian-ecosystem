"""Thin wrapper over alpaca-py's TradingClient.

The agent uses a paper endpoint ONLY. A hardcoded guard below refuses to
construct the client if the base URL doesn't contain 'paper-api'.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Optional

log = logging.getLogger(__name__)


class LiveEndpointRefused(Exception):
    """Raised when the configured base URL is not the paper endpoint."""


@dataclass
class AlpacaOrderRef:
    broker_order_id: str
    symbol: str
    side: str  # "BUY" | "SELL"
    quantity: int
    limit_price: float


class AlpacaClient:
    """Wraps alpaca.trading.TradingClient for paper mode.

    Import of alpaca is deferred to __init__ so tests that don't need Alpaca
    don't pay the import cost.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        base_url = base_url or os.environ.get(
            "ALPACA_BASE_URL", "https://paper-api.alpaca.markets"
        )
        if "paper-api" not in base_url:
            raise LiveEndpointRefused(
                f"Refusing to start: ALPACA_BASE_URL={base_url!r} is not a paper endpoint. "
                "M0 supports paper trading only."
            )
        api_key = api_key or os.environ.get("ALPACA_API_KEY")
        api_secret = api_secret or os.environ.get("ALPACA_API_SECRET")
        if not api_key or not api_secret:
            raise RuntimeError("ALPACA_API_KEY / ALPACA_API_SECRET must be set")

        # Deferred import.
        from alpaca.trading.client import TradingClient

        self._client = TradingClient(api_key, api_secret, paper=True, url_override=base_url)
        log.info("AlpacaClient ready url=%s", base_url)

    def submit_limit_order(
        self, *, symbol: str, side: str, quantity: int, limit_price: float
    ) -> AlpacaOrderRef:
        """Submit a DAY LIMIT order. Returns the broker's order id.

        Side is "BUY" or "SELL"; `alpaca-py` wants OrderSide.BUY/SELL enum.
        """
        from alpaca.trading.enums import OrderSide, TimeInForce
        from alpaca.trading.requests import LimitOrderRequest

        req = LimitOrderRequest(
            symbol=symbol,
            qty=quantity,
            side=OrderSide.BUY if side.upper() == "BUY" else OrderSide.SELL,
            limit_price=float(limit_price),
            time_in_force=TimeInForce.DAY,
        )
        order = self._client.submit_order(req)
        return AlpacaOrderRef(
            broker_order_id=str(order.id),
            symbol=symbol,
            side=side.upper(),
            quantity=quantity,
            limit_price=float(limit_price),
        )
