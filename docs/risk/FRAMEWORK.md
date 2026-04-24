# Risk Management Framework — Full specification

Canonical source for the Risk Overlord, Circuit Breaker, Leverage Monitor, and the ecosystem's safety guarantees.

See: whitepaper §13, Aletheia city spec, L34 (Dark Forest), L44 (Moral Horizon), L26 (Chimera Forge), L27 (Inverse Civilization).

## Risk Overlord — absolute veto

- **Hard requirement:** p99 < 100 ms from breach detection to override publication.
- **Inputs:** real-time positions (Redis), every proposed order (order-router), market data (collectors), correlation matrix (correlation-monitor), current regime (regime-detector).
- **Outputs:** `risk.override.scale`, `risk.override.kill`, `risk.override.flatten`, `risk.override.pause`.

## Hard limits (Owner-configurable)

| Limit | Default |
|:------|:--------|
| Max Gross Exposure | 200% of NAV |
| Max Net Exposure | 100% of NAV |
| Max Single Position | 20% of NAV |
| Max Sector Concentration | 40% of NAV |
| Max Daily Loss | −5% of NAV |
| Max Drawdown from Peak | −15% |
| Max Leverage Ratio | 3:1 |

## Circuit breaker levels

| Level | Trigger | Action | Budget |
|:------|:--------|:-------|:-------|
| GREEN | all within 80% | normal | — |
| YELLOW | any > 80% util | warn + block-new in category | instant |
| ORANGE | any limit breached | scale 50% + block-new | < 100 ms |
| RED | multi-breach OR daily > 5% OR DD > 15% | flatten all | < 100 ms |

## Feedback-loop prevention

Mirror Agent estimates system's own market impact by comparing fills to an impact-free synthetic price series. If self-impact > threshold → reduce sizing. Prevents self-reinforcing loops.

## Ethical gate (L25 Philosophical Engine)

No strategy reaches Probation without Utilitarian / Deontological / Virtue / Game-Theoretic review. Failures require Owner override.

## Compliance gate (Themis)

Every order passes `rule-enforcer` for per-jurisdiction rule checks before execution; orders that fail are discarded with a Tape-logged reason.

## Adversarial hardening

- **Chimera Forge (L26)** — survive synthetic + alien-rule markets.
- **Eris war games (L27)** — quarterly competitive stress tests.
- **Dark Forest (L34)** — randomization prevents adversarial fingerprinting.

## Moral horizon (L44)

Detects ethical singularities → global freeze → Silent-Vault placeholder → Owner review.
