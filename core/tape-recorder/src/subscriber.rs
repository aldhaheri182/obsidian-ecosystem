// ============================================================================
// core/tape-recorder/src/subscriber.rs
// Authorized by: spec Part 4.3.
// ============================================================================

//! NATS `>`-subscription + envelope decoding.

use crate::clickhouse_writer::TapeRow;
use anyhow::Context;
use async_nats::Client;
use futures::StreamExt;
use obsidian_bus::proto::Envelope;
use prost::Message as ProstMessage;
use tokio::sync::mpsc;
use tracing::warn;

pub struct FullTapeSubscriber {
    client: Client,
}

impl FullTapeSubscriber {
    pub async fn connect(url: &str) -> anyhow::Result<Self> {
        let client = async_nats::ConnectOptions::new()
            .name("tape-recorder")
            .retry_on_initial_connect()
            .connect(url)
            .await
            .with_context(|| format!("connecting NATS at {url}"))?;
        Ok(Self { client })
    }

    /// Subscribe to `>` and push rows onto `tx`. Runs forever; returns Err
    /// if the underlying NATS subscription closes or errors.
    pub async fn run(&self, tx: mpsc::Sender<TapeRow>) -> anyhow::Result<()> {
        let mut sub = self
            .client
            .subscribe(">".to_string())
            .await
            .context("subscribing to `>`")?;

        while let Some(msg) = sub.next().await {
            // Try to decode the envelope. Bad messages are logged and still
            // recorded to the tape with the best metadata we have.
            let payload_size = msg.payload.len() as u32;
            let row = match Envelope::decode(&*msg.payload) {
                Ok(env) => {
                    let ts_ns = env
                        .timestamp
                        .as_ref()
                        .map(|ts| {
                            (ts.seconds.max(0) as u64) * 1_000_000_000
                                + ts.nanos.max(0) as u64
                        })
                        .unwrap_or(0);
                    TapeRow {
                        timestamp_ns: ts_ns,
                        message_id: env.message_id.clone(),
                        source_agent: env.source_agent_id.clone(),
                        target_topic: msg.subject.to_string(),
                        r#type: msg_type_name(env.r#type),
                        payload_size,
                        raw_payload: msg.payload.to_vec(),
                    }
                }
                Err(e) => {
                    warn!(topic = %msg.subject, error = %e, "undecodable envelope (tape still records)");
                    TapeRow {
                        timestamp_ns: now_ns(),
                        message_id: String::new(),
                        source_agent: String::new(),
                        target_topic: msg.subject.to_string(),
                        r#type: "UNDECODABLE".to_string(),
                        payload_size,
                        raw_payload: msg.payload.to_vec(),
                    }
                }
            };

            if tx.send(row).await.is_err() {
                // Receiver dropped; batcher shut down. Exit loop cleanly.
                return Ok(());
            }
        }
        Ok(())
    }
}

fn msg_type_name(t: i32) -> String {
    // Mirrors proto/envelope.proto MessageType. Matches prost's enum prefix
    // stripping (variants are UPPER_SNAKE → PascalCase on the Rust side, but
    // we want the stable SCREAMING_SNAKE names in the tape for human
    // readability).
    match t {
        0 => "UNSPECIFIED",
        1 => "MARKET_DATA",
        2 => "SIGNAL",
        3 => "ORDER_REQUEST",
        4 => "FILL_REPORT",
        5 => "RISK_OVERRIDE",
        6 => "HEARTBEAT",
        7 => "EXECUTIVE_DIRECTIVE",
        8 => "EXECUTIVE_REPORT",
        9 => "KNOWLEDGE_PUBLICATION",
        10 => "ADVANCEMENT_ORB",
        11 => "ALERT",
        12 => "QUERY",
        13 => "QUERY_RESPONSE",
        14 => "REFLECTION",
        15 => "DREAM_RESULT",
        16 => "INTERNAL_TOKEN_TRANSFER",
        17 => "PHYSICAL_ACTUATION",
        18 => "TIME_TICK",
        _ => "UNKNOWN",
    }
    .to_string()
}

fn now_ns() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("clock before 1970")
        .as_nanos() as u64
}
