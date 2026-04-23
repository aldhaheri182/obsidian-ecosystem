// ============================================================================
// core/time-oracle/src/main.rs
// Authorized by: spec Part 16; M0 plan §"Component inventory".
//
// Chronos city's single M0 agent. Publishes an HLC tick on
// `chronos.time.oracle` every CHRONOS_TICK_INTERVAL_MS (default 1000ms).
// ============================================================================

mod hlc;

use crate::hlc::Hlc;
use async_trait::async_trait;
use obsidian_agent_rs::proto::MarketData;
// (MarketData re-exported only to pull proto types; we send bytes via prost.)
use obsidian_agent_rs::{
    AgentContext, AgentMetadata, AgentSpec, ObsidianAgent, SubscriptionPolicy, Supervisor,
    SupervisorConfig,
};
use prost::Message as ProstMessage;
use std::time::Duration;
use tokio::time::interval;
use tracing::{debug, info};
use tracing_subscriber::EnvFilter;

// MessageType::TimeTick = 18 (per proto/envelope.proto).
const MSG_TYPE_TIME_TICK: i32 = 18;

const TOPIC_CHRONOS_TICK: &str = "chronos.time.oracle";

/// The payload we publish on `chronos.time.oracle`. Keep it small and stable.
/// We reuse the existing `MarketData` proto as a "carrier" is a bad idea —
/// instead we use a tiny unpublished struct encoded as raw bytes. But we must
/// use a known proto type for the payload to be decodable. For M0 we send
/// the raw 12 bytes: u64 physical_ns || u32 logical, prefixed by length.
struct TickPayload {
    physical_ns: u64,
    logical: u32,
}

impl TickPayload {
    fn encode(&self) -> Vec<u8> {
        let mut v = Vec::with_capacity(12);
        v.extend_from_slice(&self.physical_ns.to_be_bytes());
        v.extend_from_slice(&self.logical.to_be_bytes());
        v
    }
}

struct TimeOracleAgent {
    metadata: AgentMetadata,
    hlc: Hlc,
    interval_ms: u64,
}

impl TimeOracleAgent {
    fn new(interval_ms: u64) -> Self {
        let agent_id =
            std::env::var("AGENT_ID").unwrap_or_else(|_| "time-oracle-01".to_string());
        Self {
            metadata: AgentMetadata::new(agent_id, "chronos", "time-oracle"),
            hlc: Hlc::new(),
            interval_ms,
        }
    }
}

#[async_trait]
impl ObsidianAgent for TimeOracleAgent {
    fn metadata(&self) -> &AgentMetadata {
        &self.metadata
    }

    async fn run(&mut self, ctx: &AgentContext) -> obsidian_agent_rs::Result<()> {
        let mut ticker = interval(Duration::from_millis(self.interval_ms));
        ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

        info!(
            agent_id = %ctx.metadata.agent_id,
            interval_ms = self.interval_ms,
            "time-oracle running",
        );

        loop {
            tokio::select! {
                biased;
                _ = ctx.shutdown.cancelled() => {
                    return Ok(());
                }
                _ = ticker.tick() => {
                    let t = self.hlc.tick();
                    let payload = TickPayload {
                        physical_ns: t.physical_ns,
                        logical: t.logical,
                    };
                    let bytes = payload.encode();
                    // Wrap in a MarketData-compatible "blob" payload. We use
                    // a generic bytes payload via a dummy proto message,
                    // but for M0 we publish the raw bytes in a tiny wrapper.
                    //
                    // The simplest approach: publish the raw bytes as the
                    // envelope's payload and mark type = TIME_TICK. The
                    // NatsClient::publish signature takes a ProstMessage;
                    // we construct a minimal prost-compatible message by
                    // reusing MarketData with only the symbol carrying the
                    // hex-encoded tick. This is ergonomically ugly; fixed in
                    // M1 by adding a TimeTick proto.
                    let wrapper = MarketData {
                        symbol: format!("HLC:{:x}:{:x}", t.physical_ns, t.logical),
                        timestamp_ns: t.physical_ns,
                        ..Default::default()
                    };
                    if let Err(e) = ctx
                        .nats
                        .publish(
                            TOPIC_CHRONOS_TICK,
                            obsidian_agent_rs::proto::MessageType::try_from(MSG_TYPE_TIME_TICK)
                                .unwrap_or(obsidian_agent_rs::proto::MessageType::MarketData),
                            &wrapper,
                            Default::default(),
                        )
                        .await
                    {
                        tracing::warn!(error = %e, "tick publish failed");
                    }
                    let _ = bytes; // retained for when we add a proper proto
                    debug!(physical_ns = t.physical_ns, logical = t.logical, "tick");
                }
            }
        }
    }
}

fn init_tracing() {
    let filter = EnvFilter::try_from_env("LOG_LEVEL").unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::fmt().with_env_filter(filter).init();
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();

    let interval_ms: u64 = std::env::var("CHRONOS_TICK_INTERVAL_MS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(1000);

    let agent_id =
        std::env::var("AGENT_ID").unwrap_or_else(|_| "time-oracle-01".to_string());
    let metadata = AgentMetadata::new(&agent_id, "chronos", "time-oracle");

    let config = SupervisorConfig {
        process_name: "chronos".into(),
        city: "chronos".into(),
        ..Default::default()
    };

    let spec = AgentSpec::new(metadata, SubscriptionPolicy::NoVerification, move || {
        TimeOracleAgent::new(interval_ms)
    });

    Supervisor::new(config).register(spec).run().await?;
    Ok(())
}
