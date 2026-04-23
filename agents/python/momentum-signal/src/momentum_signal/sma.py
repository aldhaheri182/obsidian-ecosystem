"""SMA crossover logic as a pure function — trivially unit-testable.

No I/O, no NATS, no envelope handling. The agent wraps this with the NATS
glue.
"""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SmaState:
    """Per-symbol rolling state."""

    short_window: int = 20
    long_window: int = 50
    short_buf: deque = field(default_factory=deque)
    long_buf: deque = field(default_factory=deque)
    short_sum: float = 0.0
    long_sum: float = 0.0
    last_position: int = 0  # +1 long, -1 short, 0 flat


@dataclass
class Crossover:
    direction: int  # +1 BUY, -1 SELL, 0 no change
    confidence: float
    short_mean: float
    long_mean: float


def update(state: SmaState, price: float) -> Optional[Crossover]:
    """Push a new price; return a Crossover if a state transition happens.

    Returns None if we don't yet have enough history, or if the classification
    hasn't changed since the last update.
    """
    # Short buffer.
    state.short_buf.append(price)
    state.short_sum += price
    if len(state.short_buf) > state.short_window:
        state.short_sum -= state.short_buf.popleft()

    # Long buffer.
    state.long_buf.append(price)
    state.long_sum += price
    if len(state.long_buf) > state.long_window:
        state.long_sum -= state.long_buf.popleft()

    if (
        len(state.short_buf) < state.short_window
        or len(state.long_buf) < state.long_window
    ):
        return None

    short_mean = state.short_sum / state.short_window
    long_mean = state.long_sum / state.long_window

    # New classification.
    new_pos = 0
    if short_mean > long_mean:
        new_pos = 1
    elif short_mean < long_mean:
        new_pos = -1

    if new_pos == state.last_position:
        return None  # No state change.

    # Confidence: tanh of |short-long| relative to long.
    gap = abs(short_mean - long_mean)
    denom = max(abs(long_mean), 1e-9)
    confidence = math.tanh(gap / denom * 50.0)  # scaling factor chosen empirically
    confidence = max(0.0, min(1.0, confidence))

    state.last_position = new_pos
    return Crossover(
        direction=new_pos,
        confidence=confidence,
        short_mean=short_mean,
        long_mean=long_mean,
    )
