# 12. DATA SCHEMAS FOR ALL MESSAGE TYPES

Canonical message schema reference. The complete catalog — with field-level semantics and evolution rules — is also at [`../schemas/MESSAGE_SCHEMAS.md`](../schemas/MESSAGE_SCHEMAS.md).

## 12.1 MarketData

```json
{
  "symbol": "AAPL",
  "price": 175230000,
  "volume": 1200,
  "bid": 175220000,
  "ask": 175240000,
  "bid_size": 500,
  "ask_size": 300,
  "exchange": "NASDAQ",
  "conditions": ["@", "T"]
}
```

Prices are `int64` fixed-point in USD cents × 10⁶ (micro-cents). This prevents floating-point drift over millions of transactions.

## 12.2 Signal

```json
{
  "agent_id": "momentum-agent-42",
  "symbol": "AAPL",
  "signal_type": "MOMENTUM",
  "direction": 1,
  "confidence": 0.72,
  "horizon": "SHORT_TERM",
  "expected_holding_days": 5,
  "rationale": "Price above 20-day high with volume confirmation",
  "causal_links": ["entry-uuid-1"],
  "model_version": "mom_v2.4"
}
```

## 12.3 OrderRequest

```json
{
  "order_id": "uuid",
  "symbol": "AAPL",
  "side": "BUY",
  "quantity": 100,
  "order_type": "LIMIT",
  "limit_price": 175250000,
  "time_in_force": "DAY",
  "execution_strategy": "TWAP",
  "parent_signal_id": "signal-uuid"
}
```

## 12.4 FillReport

```json
{
  "order_id": "uuid",
  "fill_price": 175260000,
  "fill_quantity": 100,
  "commission": 150,
  "venue": "NASDAQ",
  "timestamp_ns": 1713947520523148000
}
```

## 12.5 RiskOverride

```json
{
  "override_type": "FLATTEN_ALL",
  "scale_factor": 1.0,
  "reason": "Daily loss limit breached: -5.2%",
  "triggering_agent": "risk-overlord-01"
}
```

`override_type` is one of: `SCALE` (reduce positions by `scale_factor`), `KILL_POSITION` (close specific symbol), `FLATTEN_ALL` (close everything), `PAUSE` (stop new orders).

## 12.6 Heartbeat

```json
{
  "agent_id": "momentum-agent-42",
  "timestamp_ns": 1713947520000000000,
  "status": "ACTIVE",
  "city": "aletheia",
  "role": "signal"
}
```

## 12.7 ExecutiveDirective

```json
{
  "directive_id": "uuid",
  "from": "global-ceo",
  "to": "ceo-aletheia",
  "instruction": "Reduce technology sector exposure to maximum 15% of portfolio",
  "rationale": "Owner strategic guidance regarding concentration risk",
  "deadline": "2026-04-25T00:00:00Z",
  "requires_acknowledgment": true
}
```

## 12.8 KnowledgePublication

```json
{
  "publication_id": "uuid",
  "type": "PRINCIPLE",
  "title": "Momentum Signal Decay in High VIX Regimes",
  "abstract": "Momentum signals in technology stocks degrade by an average of 60% when VIX exceeds 30, while mean-reversion signals strengthen proportionally.",
  "causal_graph_hash": "sha3-256-hex",
  "statistical_validation": {
    "method": "CPCV with 10 splits, 7-day embargo",
    "sharpe": 1.8,
    "deflated_sharpe": 1.4,
    "pbo": 0.12,
    "p_value": 0.001
  },
  "keywords": ["momentum", "VIX", "regime", "technology"]
}
```

## 12.9 Reflection

```json
{
  "agent_id": "momentum-agent-42",
  "period_start": "2026-04-24T00:00:00Z",
  "period_end": "2026-04-24T23:59:59Z",
  "summary": "Today's momentum signals underperformed during the 14:00 VIX spike. Recommend reducing confidence when VIX > 28.",
  "updated_parameters": {
    "vix_threshold": 28
  },
  "new_principles": ["principle-uuid-1"]
}
```
