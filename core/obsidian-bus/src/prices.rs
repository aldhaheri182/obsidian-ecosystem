// ============================================================================
// core/obsidian-bus/src/prices.rs
//
// Authorized by: proto/order.proto (which pins the fixed-point convention).
//
// USD prices in the Ecosystem are carried on the wire and in the ledger as
// signed i64 "scaled cents" — USD cents × 10^4. This gives:
//
//   - 1 unit = 0.0001 cents = 1/100,000,000 dollar
//   - Range: ±922_337_203_685_477 units ≈ ±$9.2 quintillion
//   - Exact arithmetic for addition, subtraction, and (small-factor)
//     multiplication. No float drift in P&L accumulators.
//
// Floats are appropriate for signal math and display but NOT for ledger
// persistence or money accounting. This module provides the conversion
// helpers; agents should stay in scaled cents everywhere below the signal
// layer.
// ============================================================================

//! Fixed-point price conversion helpers for order / fill messages.

/// Scale factor between USD and "scaled cents". 1 dollar = 1e6 scaled cents.
pub const SCALE: i64 = 1_000_000;

/// Convert a USD price expressed as f64 into scaled i64.
///
/// Rounds half-to-even. Returns `None` if the value is NaN, infinite, or out
/// of i64 range after scaling.
pub fn price_to_scaled(dollars: f64) -> Option<i64> {
    if !dollars.is_finite() {
        return None;
    }
    let scaled = dollars * SCALE as f64;
    if scaled > i64::MAX as f64 || scaled < i64::MIN as f64 {
        return None;
    }
    // round half-to-even
    Some(scaled.round() as i64)
}

/// Convert a scaled i64 price back to a f64 dollar amount.
///
/// Lossless for all values within ±2^53 / SCALE ≈ ±$9 trillion. Above that,
/// rounding error begins; callers doing money math should stay in i64.
pub fn price_from_scaled(scaled: i64) -> f64 {
    scaled as f64 / SCALE as f64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip_small_values() {
        for d in [0.0, 0.01, 1.0, 1.23, 175.26, 99999.9999] {
            let scaled = price_to_scaled(d).unwrap();
            let back = price_from_scaled(scaled);
            assert!((d - back).abs() < 1e-10, "{} != {}", d, back);
        }
    }

    #[test]
    fn negative_values_round_trip() {
        for d in [-1.0, -0.01, -99999.9999] {
            let scaled = price_to_scaled(d).unwrap();
            assert_eq!(price_from_scaled(scaled), d);
        }
    }

    #[test]
    fn rejects_non_finite() {
        assert!(price_to_scaled(f64::NAN).is_none());
        assert!(price_to_scaled(f64::INFINITY).is_none());
        assert!(price_to_scaled(f64::NEG_INFINITY).is_none());
    }

    #[test]
    fn rejects_out_of_range() {
        assert!(price_to_scaled(1e20).is_none());
        assert!(price_to_scaled(-1e20).is_none());
    }

    #[test]
    fn known_values() {
        // $175.26 = 17_526 cents = 175_260_000 scaled
        assert_eq!(price_to_scaled(175.26), Some(175_260_000));
        // $0.0001 = 100 scaled (one tick)
        assert_eq!(price_to_scaled(0.0001), Some(100));
    }
}
