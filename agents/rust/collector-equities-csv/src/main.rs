// ============================================================================
// agents/rust/collector-equities-csv/src/main.rs
// Authorized by: GitHub issue #9; M0 plan §"Data flow".
//
// Reads a CSV fixture of 1-minute bars and publishes each row as a
// MarketData envelope at a configurable playback speed. Exits on EOF.
// ============================================================================

mod csv_replayer;
mod normalizer;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use obsidian_agent_rs::proto::MessageType;
use obsidian_agent_rs::{
    AgentContext, AgentMetadata, AgentSpec, ObsidianAgent, PublishOpts, SubscriptionPolicy,
    Supervisor, SupervisorConfig,
};
use std::path::PathBuf;
use std::time::Duration;
use tokio::time::sleep;
use tracing::{info, warn};
use tracing_subscriber::EnvFilter;

struct CsvCollectorAgent {
    metadata: AgentMetadata,
    fixture_path: PathBuf,
    speed: f64,
}

impl CsvCollectorAgent {
    fn new(fixture_path: PathBuf, speed: f64) -> Self {
        let agent_id = std::env::var("AGENT_ID")
            .unwrap_or_else(|_| "collector-equities-csv-01".to_string());
        Self {
            metadata: AgentMetadata::new(agent_id, "aletheia", "collector-equities-csv"),
            fixture_path,
            speed,
        }
    }
}

#[async_trait]
impl ObsidianAgent for CsvCollectorAgent {
    fn metadata(&self) -> &AgentMetadata {
        &self.metadata
    }

    async fn run(&mut self, ctx: &AgentContext) -> obsidian_agent_rs::Result<()> {
        info!(
            fixture = %self.fixture_path.display(),
            speed = self.speed,
            "csv collector starting",
        );

        // Startup delay: give downstream subscribers (momentum-signal etc.)
        // time to subscribe before we publish. NATS pub-sub is not durable,
        // so anything published before subscribers are ready is lost.
        // At CSV_PLAYBACK_SPEED=1000 the fixture finishes in ~3s which is
        // faster than aletheia-logic's Python boot. Default 10s.
        let delay_ms: u64 = std::env::var("COLLECTOR_STARTUP_DELAY_MS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(10_000);
        if delay_ms > 0 {
            info!(delay_ms, "collector waiting for subscribers to be ready");
            tokio::select! {
                _ = ctx.shutdown.cancelled() => return Ok(()),
                _ = tokio::time::sleep(std::time::Duration::from_millis(delay_ms)) => {}
            }
        }

        let rows = csv_replayer::read_fixture(&self.fixture_path)
            .map_err(|e| obsidian_agent_rs::AgentError::Runtime(format!("csv read: {e}")))?;
        info!(rows = rows.len(), "fixture loaded");

        let mut prev_ts_ns: Option<u64> = None;

        for row in rows {
            if ctx.shutdown.is_cancelled() {
                break;
            }
            let md = normalizer::to_market_data(&row);
            let topic = format!("aletheia.data.us_equities.{}", md.symbol);

            // Sleep to model playback speed based on inter-row timestamp delta.
            if let Some(prev) = prev_ts_ns {
                let real_delta_ns = md.timestamp_ns.saturating_sub(prev);
                let sleep_ns = (real_delta_ns as f64 / self.speed) as u64;
                if sleep_ns > 0 {
                    tokio::select! {
                        _ = ctx.shutdown.cancelled() => return Ok(()),
                        _ = sleep(Duration::from_nanos(sleep_ns)) => {}
                    }
                }
            }
            prev_ts_ns = Some(md.timestamp_ns);

            if let Err(e) = ctx
                .nats
                .publish(topic, MessageType::MarketData, &md, PublishOpts::default())
                .await
            {
                warn!(error = %e, "publish failed");
            }
        }

        info!("csv collector reached EOF; shutting down");
        Ok(())
    }
}

fn init_tracing() {
    let filter = EnvFilter::try_from_env("LOG_LEVEL").unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::fmt().with_env_filter(filter).init();
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();
    let fixture_path = PathBuf::from(
        std::env::var("CSV_FIXTURE_PATH")
            .unwrap_or_else(|_| "/fixtures/aapl_2023-03-13_1min.csv".to_string()),
    );
    let speed: f64 = std::env::var("CSV_PLAYBACK_SPEED")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(1000.0);

    let agent_id =
        std::env::var("AGENT_ID").unwrap_or_else(|_| "collector-equities-csv-01".to_string());
    let metadata = AgentMetadata::new(&agent_id, "aletheia", "collector-equities-csv");

    let config = SupervisorConfig {
        process_name: "aletheia-core".into(),
        city: "aletheia".into(),
        ..Default::default()
    };
    let spec = AgentSpec::new(metadata, SubscriptionPolicy::NoVerification, move || {
        CsvCollectorAgent::new(fixture_path.clone(), speed)
    });
    Supervisor::new(config).register(spec).run().await?;
    Ok(())
}

// Convenience: re-expose for normalizer tests.
#[allow(dead_code)]
pub fn parse_iso_timestamp(s: &str) -> Option<u64> {
    DateTime::parse_from_rfc3339(s)
        .ok()
        .map(|dt: DateTime<_>| dt.with_timezone(&Utc).timestamp_nanos_opt().unwrap_or(0) as u64)
}
