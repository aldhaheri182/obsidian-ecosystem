// ============================================================================
// agents/rust/collector-equities-csv/src/normalizer.rs
// ============================================================================

//! CSV row → MarketData proto.

use crate::csv_replayer::FixtureRow;
use chrono::{DateTime, Utc};
use obsidian_agent_rs::proto::MarketData;

/// Convert a fixture row to a `MarketData` proto.
///
/// For the M0 fixture (OHLCV), we emit the `close` as the trade price, and
/// synthesize a symmetric bid/ask around `close` with a fixed tick spread.
/// Real collector agents (M2) do this properly.
pub fn to_market_data(row: &FixtureRow) -> MarketData {
    let timestamp_ns = DateTime::parse_from_rfc3339(&row.timestamp)
        .map(|dt: DateTime<_>| dt.with_timezone(&Utc).timestamp_nanos_opt().unwrap_or(0) as u64)
        .unwrap_or(0);

    // Half-cent synthetic spread. Real spreads are symbol-dependent.
    let spread = 0.005;
    let bid = (row.close - spread).max(0.0);
    let ask = row.close + spread;

    MarketData {
        symbol: row.symbol.clone(),
        price: row.close,
        volume: row.volume,
        bid,
        ask,
        bid_size: 100,
        ask_size: 100,
        exchange: "FIXTURE".to_string(),
        conditions: vec!["SYNTH".to_string()],
        timestamp_ns,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_iso_timestamp_and_fills_fields() {
        let row = FixtureRow {
            timestamp: "2023-03-13T13:30:00Z".to_string(),
            symbol: "AAPL".to_string(),
            open: 150.0,
            high: 151.0,
            low: 149.5,
            close: 150.5,
            volume: 1234,
            vwap: Some(150.25),
        };
        let md = to_market_data(&row);
        assert_eq!(md.symbol, "AAPL");
        assert_eq!(md.price, 150.5);
        assert!(md.bid < md.price);
        assert!(md.ask > md.price);
        assert!(md.timestamp_ns > 0);
    }
}
