// ============================================================================
// agents/rust/collector-equities-csv/src/csv_replayer.rs
// ============================================================================

//! CSV row iteration.

use serde::Deserialize;
use std::path::Path;

/// One row of the bundled fixture.
/// Schema: `timestamp,symbol,open,high,low,close,volume,vwap`
#[derive(Debug, Clone, Deserialize)]
pub struct FixtureRow {
    pub timestamp: String,
    pub symbol: String,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: u64,
    pub vwap: Option<f64>,
}

/// Read the fixture into a Vec. For M0's ~400 KB file, in-memory is fine.
pub fn read_fixture(path: &Path) -> Result<Vec<FixtureRow>, csv::Error> {
    let mut rdr = csv::ReaderBuilder::new().has_headers(true).from_path(path)?;
    let mut out = Vec::new();
    for r in rdr.deserialize::<FixtureRow>() {
        out.push(r?);
    }
    Ok(out)
}
