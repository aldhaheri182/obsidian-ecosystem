// ============================================================================
// agents/rust/risk-overlord/src/limits.rs
// Authorized by: GitHub issue #13; spec Part 9.7.
// ============================================================================

//! Hard risk limits loaded from the environment.

/// All price-valued fields are in scaled cents (USD × 10^6).
#[derive(Debug, Clone, Copy)]
pub struct Limits {
    pub max_gross_exposure: i64,
    pub max_position: i64,
    pub max_daily_loss: i64,
}

impl Limits {
    /// Load from env with M0 defaults matching `.env.example`.
    pub fn from_env() -> Self {
        Self {
            max_gross_exposure: env_i64("RISK_MAX_GROSS_EXPOSURE_USD_CENTS", 10_000 * 1_000_000),
            max_position: env_i64("RISK_MAX_POSITION_USD_CENTS", 2_500 * 1_000_000),
            max_daily_loss: env_i64("RISK_MAX_DAILY_LOSS_USD_CENTS", 1_500 * 1_000_000),
        }
    }
}

fn env_i64(key: &str, default: i64) -> i64 {
    std::env::var(key).ok().and_then(|v| v.parse().ok()).unwrap_or(default)
}
