"""Pydantic schemas mirroring whitepaper §5.3 Knowledge Graph node types."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class Principle(BaseModel):
    """A Gold Node — a certified, causally-audited Principle."""

    principle_id: str
    title: str
    abstract: str
    confidence: float = Field(ge=0.0, le=1.0)
    status: str = "DRAFT"  # DRAFT | GOLD | DEPRECATED | PARADOX
    published_at: datetime
    causal_graph_hash: Optional[str] = None
    keywords: List[str] = []
    deflated_sharpe: Optional[float] = None
    pbo: Optional[float] = None  # Probability of Backtest Overfitting
    p_value: Optional[float] = None
    level: str = "PRINCIPLE"  # OBSERVATION | EPISODE | PATTERN | PRINCIPLE | PARADOX


class Regime(BaseModel):
    regime_id: str
    name: str  # LOW_VOL_BULL | HIGH_VOL_BULL | SIDEWAYS | BEAR | CRISIS | LIQUIDITY_DRYUP
    volatility_regime: str
    correlation_regime: str
    timestamp: datetime


class Signal(BaseModel):
    signal_id: str
    agent_id: str
    symbol: str
    signal_type: str  # MOMENTUM | MEAN_REVERSION | CARRY | VOL_ARB | STAT_ARB | SENTIMENT | FLOW
    direction: int  # -1, 0, 1
    confidence: float = Field(ge=0.0, le=1.0)
    timestamp: datetime


class MemoryNode(BaseModel):
    node_id: str
    agent_id: str
    summary: str
    embedding_id: Optional[str] = None
    importance_score: float = 0.0
    level: str = "OBSERVATION"  # per §35 taxonomy


class Event(BaseModel):
    event_id: str
    event_type: str
    description: str
    severity: str = "INFO"
    timestamp: datetime
