// ============================================================================
// agents/rust/risk-overlord/src/circuit_breaker.rs
// Authorized by: GitHub issue #13; spec Part 9.7.
// ============================================================================

//! Pure functions evaluating the circuit-breaker rules. Allocation-free on
//! the no-breach path so the p99 latency budget is preserved.

use crate::exposure::PortfolioState;
use crate::limits::Limits;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Level {
    Green,
    Yellow,
    Orange,
    Red,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BreachKind {
    GrossExposure,
    SinglePosition(String),
    DailyLoss,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Decision {
    pub level: Level,
    pub breach: Option<BreachKind>,
    pub reason: String,
}

impl Decision {
    pub fn green() -> Self {
        Self { level: Level::Green, breach: None, reason: String::new() }
    }
}

/// Evaluate against the provided state and limits.
///
/// ORANGE = any single hard limit breached.
/// RED = gross_exposure > 100% of limit OR daily_loss beyond limit.
pub fn evaluate(state: &PortfolioState, limits: &Limits) -> Decision {
    // Daily loss (negative P&L exceeding limit in absolute terms).
    if state.realized_pnl_scaled < 0 && -state.realized_pnl_scaled >= limits.max_daily_loss {
        return Decision {
            level: Level::Red,
            breach: Some(BreachKind::DailyLoss),
            reason: format!(
                "daily loss {} scaled cents >= limit {}",
                -state.realized_pnl_scaled, limits.max_daily_loss
            ),
        };
    }

    let gross = state.gross_exposure_scaled();
    if gross > limits.max_gross_exposure {
        return Decision {
            level: Level::Red,
            breach: Some(BreachKind::GrossExposure),
            reason: format!(
                "gross exposure {} scaled cents > limit {}",
                gross, limits.max_gross_exposure
            ),
        };
    }

    // Any single-position breach is ORANGE (scale new orders by 0.5).
    for sym in state.positions.keys() {
        let notional = state.position_notional_scaled(sym);
        if notional > limits.max_position {
            return Decision {
                level: Level::Orange,
                breach: Some(BreachKind::SinglePosition(sym.clone())),
                reason: format!(
                    "position {} notional {} > limit {}",
                    sym, notional, limits.max_position
                ),
            };
        }
    }

    // 80 % of any limit → yellow (log-only in M0).
    if gross * 100 >= limits.max_gross_exposure * 80 {
        return Decision {
            level: Level::Yellow,
            breach: None,
            reason: "gross exposure >= 80% of limit".into(),
        };
    }

    Decision::green()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn limits() -> Limits {
        Limits { max_gross_exposure: 100 * 1_000_000, max_position: 40 * 1_000_000, max_daily_loss: 50 * 1_000_000 }
    }

    #[test]
    fn empty_state_is_green() {
        let s = PortfolioState::default();
        assert_eq!(evaluate(&s, &limits()), Decision::green());
    }

    #[test]
    fn breaching_gross_exposure_is_red() {
        let mut s = PortfolioState::default();
        s.apply_fill("AAPL", "BUY", 1_000, 1_000_000_000);
        s.apply_mark("AAPL", 1_000_000_000);
        let d = evaluate(&s, &limits());
        assert_eq!(d.level, Level::Red);
        assert!(matches!(d.breach, Some(BreachKind::GrossExposure)));
    }

    #[test]
    fn breaching_single_position_is_orange() {
        let mut s = PortfolioState::default();
        // position notional 45M > max_position 40M but gross 45M < max_gross 100M
        s.apply_fill("AAPL", "BUY", 45, 1_000_000);
        s.apply_mark("AAPL", 1_000_000);
        let d = evaluate(&s, &limits());
        assert_eq!(d.level, Level::Orange);
    }

    #[test]
    fn daily_loss_is_red() {
        let mut s = PortfolioState::default();
        s.realized_pnl_scaled = -60 * 1_000_000; // beyond 50M limit
        let d = evaluate(&s, &limits());
        assert_eq!(d.level, Level::Red);
        assert!(matches!(d.breach, Some(BreachKind::DailyLoss)));
    }
}
