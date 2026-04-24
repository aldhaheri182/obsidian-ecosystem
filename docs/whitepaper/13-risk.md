# 13. RISK MANAGEMENT FRAMEWORK

## 13.1 The Risk Overlord

The Risk Overlord is the system's ultimate safety mechanism. It operates independently in Aletheia's Risk Bunker with absolute veto power over every trade.

**Inputs:**
- Real-time portfolio positions from Redis
- Every proposed order from the Order Router
- Live market data from Collector Agents
- Correlation matrix from Correlation Monitor
- Current regime from Regime Detector

**Outputs:**
- `risk.override.scale` — Reduce all positions by X%
- `risk.override.kill` — Immediately close a specific position
- `risk.override.flatten` — Close all positions immediately
- `risk.override.pause` — Halt all new order generation

**Hard Performance Requirement:** <100ms p99 from breach detection to override publication.

## 13.2 Hard Limits (Configurable by Owner)

| Limit | Default | Description |
|:------|:--------|:------------|
| Max Gross Exposure | 200% of NAV | Sum of absolute position values |
| Max Net Exposure | 100% of NAV | Long minus short |
| Max Single Position | 20% of NAV | Per instrument |
| Max Sector Concentration | 40% of NAV | Per sector |
| Max Daily Loss | -5% of NAV | Triggers flatten |
| Max Drawdown from Peak | -15% | Triggers reduction |
| Max Leverage Ratio | 3:1 | Gross exposure / NAV |

## 13.3 Circuit Breaker Levels

| Level | Trigger | Action | Latency Budget |
|:------|:--------|:-------|:---------------|
| **GREEN** | All limits within 80% | Normal operation | — |
| **YELLOW** | Any limit >80% utilization | Warning to Portfolio Agent. Block new positions that would increase the near-breached category. | Instant |
| **ORANGE** | Any limit breached | Scale positions by 50%. Block all new orders in breached category. | <100ms |
| **RED** | Multiple limits breached OR daily loss >5% OR drawdown >15% | Flatten all positions. Global alert. | <100ms |

## 13.4 Feedback Loop Prevention

The Mirror Agent continuously estimates the system's own market impact by comparing fill prices to a synthetic impact-free price series. If self-impact exceeds a threshold, it signals the Portfolio Agent to reduce position sizing. This prevents the system from entering self-reinforcing feedback loops where its own trades create the signals it follows.

Full framework detail (including failure modes, escalation paths, Eris red-team drills, and reconciliation protocols) at [`../risk/FRAMEWORK.md`](../risk/FRAMEWORK.md).
