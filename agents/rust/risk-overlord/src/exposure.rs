// ============================================================================
// agents/rust/risk-overlord/src/exposure.rs
// Authorized by: GitHub issue #13; spec Part 9.7.
// ============================================================================

//! In-memory position table + exposure math.

use std::collections::HashMap;

/// Per-symbol position in shares (signed).
#[derive(Debug, Default, Clone, Copy)]
pub struct Position {
    pub quantity: i64,
    /// Average entry price in scaled cents.
    pub avg_price_scaled: i64,
}

impl Position {
    /// Apply a fill, updating quantity and running average entry price.
    pub fn apply_fill(&mut self, side_sign: i64, quantity: u64, price_scaled: i64) {
        let qty = quantity as i64 * side_sign;
        let new_qty = self.quantity + qty;
        if new_qty == 0 || self.quantity.signum() != new_qty.signum() {
            // Closed or flipped position; reset basis to new price.
            self.quantity = new_qty;
            self.avg_price_scaled = if new_qty == 0 { 0 } else { price_scaled };
        } else if self.quantity.signum() == qty.signum() || self.quantity == 0 {
            // Adding to same-side position; weighted average.
            let total_notional =
                self.avg_price_scaled.saturating_mul(self.quantity.abs())
                    + price_scaled.saturating_mul(qty.abs());
            let new_qty_abs = new_qty.abs();
            self.avg_price_scaled = if new_qty_abs > 0 {
                total_notional / new_qty_abs
            } else {
                0
            };
            self.quantity = new_qty;
        } else {
            // Reducing position; basis unchanged.
            self.quantity = new_qty;
        }
    }

    /// Current notional exposure in scaled cents using `mark` as the mark price.
    pub fn notional_scaled(&self, mark_scaled: i64) -> i64 {
        self.quantity.abs().saturating_mul(mark_scaled)
    }
}

/// Whole-portfolio state.
#[derive(Debug, Default, Clone)]
pub struct PortfolioState {
    pub positions: HashMap<String, Position>,
    /// Most recent mark price per symbol.
    pub marks: HashMap<String, i64>,
    pub realized_pnl_scaled: i64,
}

impl PortfolioState {
    pub fn apply_mark(&mut self, symbol: &str, price_scaled: i64) {
        self.marks.insert(symbol.to_string(), price_scaled);
    }

    pub fn apply_fill(&mut self, symbol: &str, side: &str, quantity: u64, price_scaled: i64) {
        let sign = if side.eq_ignore_ascii_case("BUY") { 1 } else { -1 };
        let pos = self.positions.entry(symbol.to_string()).or_default();
        pos.apply_fill(sign, quantity, price_scaled);
    }

    /// Sum |quantity| * mark across every held symbol, in scaled cents.
    pub fn gross_exposure_scaled(&self) -> i64 {
        let mut total: i64 = 0;
        for (sym, pos) in &self.positions {
            let mark = self.marks.get(sym).copied().unwrap_or(pos.avg_price_scaled);
            total = total.saturating_add(pos.notional_scaled(mark));
        }
        total
    }

    pub fn position_notional_scaled(&self, symbol: &str) -> i64 {
        let Some(pos) = self.positions.get(symbol) else { return 0 };
        let mark = self.marks.get(symbol).copied().unwrap_or(pos.avg_price_scaled);
        pos.notional_scaled(mark)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn buying_then_selling_zeroes_position() {
        let mut s = PortfolioState::default();
        s.apply_fill("AAPL", "BUY", 100, 150_000_000);
        s.apply_fill("AAPL", "SELL", 100, 160_000_000);
        assert_eq!(s.positions["AAPL"].quantity, 0);
    }

    #[test]
    fn gross_exposure_counts_absolute_notional() {
        let mut s = PortfolioState::default();
        s.apply_fill("AAPL", "BUY", 100, 150_000_000);
        s.apply_fill("MSFT", "SELL", 50, 300_000_000);
        s.apply_mark("AAPL", 160_000_000);
        s.apply_mark("MSFT", 310_000_000);
        // |100| * 160 + |-50| * 310 = 16_000 + 15_500 = 31_500 (scaled: ×10^6)
        let got = s.gross_exposure_scaled();
        assert!(got > 31_000 * 1_000_000);
    }
}
