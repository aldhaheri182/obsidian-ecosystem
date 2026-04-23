"""M0 paper-trading executor.

Alpaca paper endpoint only. Refuses to start if ALPACA_BASE_URL does not
contain 'paper-api' — no accidental live flip in M0.
"""

from paper_executor.agent import PaperExecutorAgent

__all__ = ["PaperExecutorAgent"]
