"""M0 momentum-signal agent: SMA(20/50) crossover.

Emits a BUY on 20-SMA crossing above 50-SMA, SELL on crossing below.
Confidence scales with the crossover magnitude relative to recent volatility.

EXPLICITLY NOT expected to produce positive live P&L. Its M0 role is to
prove the pipeline runs end-to-end. Real signal development starts in M2
with CPCV + DSR + PBO discipline.
"""

from momentum_signal.agent import MomentumSignalAgent

__all__ = ["MomentumSignalAgent"]
