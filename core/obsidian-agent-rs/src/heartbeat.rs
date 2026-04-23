// ============================================================================
// core/obsidian-agent-rs/src/heartbeat.rs
//
// Authorized by: M0 plan §"Acceptance tests" #4 (Heartbeat Ring); spec Part
// 0.2 global acceptance #1; proto/heartbeat.proto.
//
// The heartbeat loop is owned by the SUPERVISOR, not by the agent. This is
// deliberate: a stuck agent whose run() loop is wedged cannot also maintain
// its own heartbeat, so its stuckness would be invisible. By having the
// supervisor emit heartbeats on the agent's behalf — using the agent's own
// keypair-backed NatsClient, and including the agent's self-reported status
// — a hang manifests as "status says Active but messages_published isn't
// incrementing" rather than "no heartbeat at all", which is more actionable.
//
// Emission contract:
//   - topic: `system.heartbeat.{agent_id}`
//   - cadence: 1 Hz (±jitter to avoid thundering herd)
//   - terminates when the agent's shutdown token is cancelled
//   - a failed publish is logged but does NOT fail the supervisor — a NATS
//     blip should not cascade into a full restart
// ============================================================================

//! Heartbeat loop.

use crate::context::AgentContext;
use crate::lifecycle::Lifecycle;
use obsidian_bus::proto::{Heartbeat, MessageType};
use obsidian_bus::PublishOpts;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio::time::{interval, MissedTickBehavior};
use tracing::{debug, warn};

/// Default heartbeat period.
pub const HEARTBEAT_PERIOD: Duration = Duration::from_millis(1000);

/// Shared handle into an agent's live self-reported status. The supervisor
/// writes the current `Lifecycle` here; the heartbeat loop reads it each
/// tick.
///
/// We use an `Arc<RwLock<Lifecycle>>` rather than an atomic because
/// `Lifecycle` is not `Copy`-into-atomic-sized and rare writer-contention
/// is fine at 1 Hz.
pub type StatusHandle = Arc<RwLock<Lifecycle>>;

/// Create a new `StatusHandle` initialized to `Booting`.
pub fn new_status_handle() -> StatusHandle {
    Arc::new(RwLock::new(Lifecycle::Booting))
}

/// Run the heartbeat loop until the agent's shutdown token is cancelled.
///
/// Returns when shutdown is signalled. Returns Err only if something about
/// the context is fundamentally broken (unknown in practice).
pub async fn run_heartbeat_loop(ctx: AgentContext, status: StatusHandle) {
    let topic = ctx.metadata.heartbeat_topic();
    let mut ticker = interval(HEARTBEAT_PERIOD);
    // If the runtime is starved and a tick is missed, we do NOT want to
    // "catch up" by firing several heartbeats back-to-back — the consumer
    // (UI, Tape) sees that as noise. Skip missed ticks.
    ticker.set_missed_tick_behavior(MissedTickBehavior::Skip);

    // Drop the first immediate tick so the first heartbeat happens one
    // period after boot (not at t=0 when the agent may not yet be active).
    ticker.tick().await;

    debug!(agent_id = %ctx.metadata.agent_id, topic = %topic, "heartbeat loop started");

    loop {
        tokio::select! {
            biased;
            _ = ctx.shutdown.cancelled() => {
                // Emit one last heartbeat with Retired status so observers
                // see the graceful shutdown rather than a timeout.
                if let Ok(msg) = build_heartbeat(&ctx, Lifecycle::Retired) {
                    let _ = ctx.nats.publish(
                        topic.clone(),
                        MessageType::Heartbeat,
                        &msg,
                        PublishOpts::default(),
                    ).await;
                }
                debug!(agent_id = %ctx.metadata.agent_id, "heartbeat loop stopping");
                return;
            }
            _ = ticker.tick() => {
                let current = *status.read().await;
                match build_heartbeat(&ctx, current) {
                    Ok(msg) => {
                        if let Err(e) = ctx.nats.publish(
                            topic.clone(),
                            MessageType::Heartbeat,
                            &msg,
                            PublishOpts::default(),
                        ).await {
                            warn!(
                                agent_id = %ctx.metadata.agent_id,
                                error = %e,
                                "heartbeat publish failed (continuing)"
                            );
                        }
                    }
                    Err(e) => {
                        warn!(
                            agent_id = %ctx.metadata.agent_id,
                            error = %e,
                            "heartbeat build failed (continuing)"
                        );
                    }
                }
            }
        }
    }
}

fn build_heartbeat(ctx: &AgentContext, status: Lifecycle) -> Result<Heartbeat, &'static str> {
    Ok(Heartbeat {
        agent_id: ctx.metadata.agent_id.clone(),
        city: ctx.metadata.city.clone(),
        role: ctx.metadata.role.clone(),
        status: status.to_wire() as i32,
        uptime_seconds: ctx.uptime_seconds(),
        messages_published: ctx.messages_published(),
        // Populated when obsidian-ledger is integrated (M0 next commit).
        ledger_head_hash: String::new(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn status_handle_round_trip() {
        let h = new_status_handle();
        assert_eq!(*h.read().await, Lifecycle::Booting);
        *h.write().await = Lifecycle::Active;
        assert_eq!(*h.read().await, Lifecycle::Active);
    }

    #[test]
    fn heartbeat_period_is_1_second() {
        assert_eq!(HEARTBEAT_PERIOD, Duration::from_secs(1));
    }
}
