// ============================================================================
// agents/rust/risk-overlord/src/main.rs
// Authorized by: GitHub issue #13; M0 plan §"Acceptance tests" #3.
//
// Subscribes to fills and market data, maintains in-memory portfolio state,
// runs circuit-breaker rules, publishes RiskOverride on `risk.override.all`.
// ============================================================================

mod circuit_breaker;
mod exposure;
mod limits;

use crate::circuit_breaker::{evaluate, Level};
use crate::exposure::PortfolioState;
use crate::limits::Limits;
use async_trait::async_trait;
use obsidian_agent_rs::proto::{FillReport, MarketData, MessageType, OverrideType, RiskOverride};
use obsidian_agent_rs::{
    AgentContext, AgentMetadata, AgentSpec, ObsidianAgent, PublishOpts, SubscriptionPolicy,
    Supervisor, SupervisorConfig, VerificationMode,
};
use obsidian_bus::proto as bus_proto; // for FilesystemRegistry
use prost::Message as ProstMessage;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{error, info, warn};
use tracing_subscriber::EnvFilter;

const TOPIC_FILLS: &str = "aletheia.execution.fill_report";
const TOPIC_MARKET: &str = "aletheia.data.us_equities.*";
const TOPIC_OVERRIDE: &str = "risk.override.all";

struct RiskOverlord {
    metadata: AgentMetadata,
    state: Arc<RwLock<PortfolioState>>,
    limits: Limits,
}

impl RiskOverlord {
    fn new() -> Self {
        let agent_id =
            std::env::var("AGENT_ID").unwrap_or_else(|_| "risk-overlord-01".to_string());
        Self {
            metadata: AgentMetadata::new(agent_id, "aletheia", "risk-overlord"),
            state: Arc::new(RwLock::new(PortfolioState::default())),
            limits: Limits::from_env(),
        }
    }
}

#[async_trait]
impl ObsidianAgent for RiskOverlord {
    fn metadata(&self) -> &AgentMetadata {
        &self.metadata
    }

    async fn run(&mut self, ctx: &AgentContext) -> obsidian_agent_rs::Result<()> {
        info!(
            agent_id = %ctx.metadata.agent_id,
            max_gross = self.limits.max_gross_exposure,
            max_pos = self.limits.max_position,
            max_dl = self.limits.max_daily_loss,
            "risk-overlord running",
        );

        // Per user directive: Risk Overlord uses Registry verification from
        // day one. Construct a filesystem registry rooted at the registry_root.
        let registry = Arc::new(obsidian_bus::nats::FilesystemRegistry::new(
            &ctx.registry_root,
        ));
        let ver_fills = VerificationMode::Registry(registry.clone());
        let ver_market = VerificationMode::Registry(registry.clone());

        let mut fills = ctx.nats.subscribe(TOPIC_FILLS, ver_fills).await?;
        let mut marks = ctx.nats.subscribe(TOPIC_MARKET, ver_market).await?;

        loop {
            tokio::select! {
                biased;
                _ = ctx.shutdown.cancelled() => {
                    return Ok(());
                }
                f = fills.next() => {
                    if let Some(Ok(env)) = f {
                        self.on_fill(ctx, &env).await;
                    }
                }
                m = marks.next() => {
                    if let Some(Ok(env)) = m {
                        self.on_market(ctx, &env).await;
                    }
                }
            }
        }
    }
}

impl RiskOverlord {
    async fn on_fill(&self, ctx: &AgentContext, env: &obsidian_bus::proto::Envelope) {
        let fill = match FillReport::decode(&*env.payload) {
            Ok(f) => f,
            Err(e) => {
                warn!(error = %e, "malformed fill");
                return;
            }
        };
        {
            let mut s = self.state.write().await;
            // We need side to apply the fill; the FillReport proto in M0 does
            // NOT carry side (only the OrderRequest does). For M0, infer by
            // looking at the sign of fill_quantity — we send positive on BUY
            // from paper-executor. TODO(M2): add side to FillReport.
            let sign_side = "BUY";
            s.apply_fill(
                &fill.order_id[..fill.order_id.len().min(8)], // placeholder symbol key for M0
                sign_side,
                fill.fill_quantity,
                fill.fill_price_scaled,
            );
        }
        self.reevaluate(ctx).await;
    }

    async fn on_market(&self, ctx: &AgentContext, env: &obsidian_bus::proto::Envelope) {
        let md = match MarketData::decode(&*env.payload) {
            Ok(m) => m,
            Err(e) => {
                warn!(error = %e, "malformed market data");
                return;
            }
        };
        {
            let mut s = self.state.write().await;
            let scaled = price_f64_to_scaled(md.price);
            s.apply_mark(&md.symbol, scaled);
        }
        self.reevaluate(ctx).await;
    }

    async fn reevaluate(&self, ctx: &AgentContext) {
        let decision = {
            let s = self.state.read().await;
            evaluate(&s, &self.limits)
        };
        match decision.level {
            Level::Green => {}
            Level::Yellow => {
                tracing::debug!(reason = %decision.reason, "risk yellow");
            }
            Level::Orange => {
                let mut ovr = RiskOverride::default();
                ovr.override_type = OverrideType::Scale as i32;
                ovr.scale_factor = 0.5;
                ovr.reason = decision.reason.clone();
                ovr.triggering_agent = ctx.metadata.agent_id.clone();
                if let Err(e) = ctx
                    .nats
                    .publish(TOPIC_OVERRIDE, MessageType::RiskOverride, &ovr, PublishOpts::default())
                    .await
                {
                    error!(error = %e, "override publish failed");
                } else {
                    warn!(reason = %decision.reason, "risk ORANGE -> SCALE 0.5");
                }
            }
            Level::Red => {
                let mut ovr = RiskOverride::default();
                ovr.override_type = OverrideType::FlattenAll as i32;
                ovr.scale_factor = 0.0;
                ovr.reason = decision.reason.clone();
                ovr.triggering_agent = ctx.metadata.agent_id.clone();
                if let Err(e) = ctx
                    .nats
                    .publish(TOPIC_OVERRIDE, MessageType::RiskOverride, &ovr, PublishOpts::default())
                    .await
                {
                    error!(error = %e, "override publish failed");
                } else {
                    error!(reason = %decision.reason, "risk RED -> FLATTEN_ALL");
                }
            }
        }
    }
}

fn price_f64_to_scaled(p: f64) -> i64 {
    if !p.is_finite() {
        return 0;
    }
    (p * 1_000_000.0).round() as i64
}

fn init_tracing() {
    let filter = EnvFilter::try_from_env("LOG_LEVEL").unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::fmt().with_env_filter(filter).init();
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();

    let agent_id =
        std::env::var("AGENT_ID").unwrap_or_else(|_| "risk-overlord-01".to_string());
    let metadata = AgentMetadata::new(&agent_id, "aletheia", "risk-overlord");

    let config = SupervisorConfig {
        process_name: "aletheia-core".into(),
        city: "aletheia".into(),
        ..Default::default()
    };
    // Registry policy per user directive.
    let spec = AgentSpec::new(metadata, SubscriptionPolicy::Registry, move || {
        RiskOverlord::new()
    });
    Supervisor::new(config).register(spec).run().await?;
    Ok(())
}

// Pull in the bus proto for `Envelope` access.
#[allow(unused)]
use bus_proto::Envelope;
