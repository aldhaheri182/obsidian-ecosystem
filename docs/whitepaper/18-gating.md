# 18. PAPER-TO-LIVE GATING CRITERIA

Before any real capital is deployed, the system must demonstrate all of the following over a continuous 6-month paper trading period:

| Criterion | Threshold |
|:----------|:----------|
| Out-of-sample Sharpe ratio | >0.8 |
| Maximum drawdown (any rolling 3-month) | <15% from peak |
| Maximum single-day loss | <5% from previous close |
| Risk Overlord response time (p99.9) | <100ms |
| Replay fidelity | 100% (bit-identical ledger hashes) |
| Manual corrections to signal output | Zero for final 3 months |
| Compliance audit | Pass for all simulated orders |

**Initial real capital**: $50,000. Scaling only via internal profits. No additional capital injections until two consecutive quarters of positive net returns.
