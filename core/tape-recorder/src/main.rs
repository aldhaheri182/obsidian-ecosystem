// ============================================================================
// core/tape-recorder/src/main.rs
//
// Authorized by: spec Part 4.3; M0 plan §"Acceptance tests" #2 (Replay
// determinism).
//
// The Tape Recorder is the system's flight recorder. It subscribes to `>`
// (every NATS subject) and persists every envelope to a ClickHouse table,
// batched by size or time. Unlike regular agents, it does NOT verify
// signatures — the Tape captures what happened on the wire, faithfully,
// including bad messages. Signature verification is the consumer's job.
//
// Environment variables consumed:
//   NATS_URL                (default nats://nats:4222)
//   CLICKHOUSE_URL          (default http://clickhouse:8123)
//   TAPE_CLICKHOUSE_DB      (default "obsidian")
//   TAPE_CLICKHOUSE_TABLE   (default "tape")
//   TAPE_BATCH_SIZE         (default 1000)
//   TAPE_BATCH_INTERVAL_MS  (default 1000)
//   AGENT_ID                (default "tape-recorder-01")
//   CITY                    (default "system")
// ============================================================================

mod clickhouse_writer;
mod subscriber;

use std::time::Duration;

use clickhouse_writer::{ClickHouseConfig, ClickHouseWriter, TapeRow};
use subscriber::FullTapeSubscriber;
use tokio::signal;
use tokio::sync::mpsc;
use tracing::{error, info};
use tracing_subscriber::EnvFilter;

fn init_tracing() {
    let filter = EnvFilter::try_from_env("LOG_LEVEL").unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::fmt().with_env_filter(filter).init();
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_string())
}

fn env_parse<T: std::str::FromStr>(key: &str, default: T) -> T {
    std::env::var(key)
        .ok()
        .and_then(|v| v.parse::<T>().ok())
        .unwrap_or(default)
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();

    let nats_url = env_or("NATS_URL", "nats://nats:4222");
    let ch_config = ClickHouseConfig {
        url: env_or("CLICKHOUSE_URL", "http://clickhouse:8123"),
        database: env_or("TAPE_CLICKHOUSE_DB", "obsidian"),
        table: env_or("TAPE_CLICKHOUSE_TABLE", "tape"),
    };
    let batch_size: usize = env_parse("TAPE_BATCH_SIZE", 1000);
    let batch_interval_ms: u64 = env_parse("TAPE_BATCH_INTERVAL_MS", 1000);

    info!(
        nats_url = %nats_url,
        clickhouse_url = %ch_config.url,
        db = %ch_config.database,
        table = %ch_config.table,
        batch_size,
        batch_interval_ms,
        "tape-recorder starting",
    );

    // Open ClickHouse and ensure schema.
    let writer = ClickHouseWriter::connect(ch_config.clone()).await?;
    writer.ensure_schema().await?;

    let (tx, rx) = mpsc::channel::<TapeRow>(batch_size * 4);

    // Batcher task: drain rx, batch by count or time, flush to ClickHouse.
    let batch_writer = writer.clone();
    let batcher = tokio::spawn(batcher_task(
        rx,
        batch_writer,
        batch_size,
        Duration::from_millis(batch_interval_ms),
    ));

    // Subscriber task: subscribe to `>` and push parsed rows into the channel.
    let subscriber = FullTapeSubscriber::connect(&nats_url).await?;
    let sub_handle = tokio::spawn(async move {
        if let Err(e) = subscriber.run(tx).await {
            error!(error = %e, "subscriber task failed");
        }
    });

    // Shutdown on SIGINT / SIGTERM. Graceful drain.
    signal::ctrl_c().await?;
    info!("shutdown signal received; draining batcher");
    sub_handle.abort();
    let _ = sub_handle.await;
    // Drop the tx by aborting the subscriber; batcher will flush remaining rows
    // once it sees the channel close. Await its completion.
    let _ = batcher.await;
    info!("tape-recorder stopped");
    Ok(())
}

async fn batcher_task(
    mut rx: mpsc::Receiver<TapeRow>,
    writer: ClickHouseWriter,
    batch_size: usize,
    interval: Duration,
) {
    let mut buffer: Vec<TapeRow> = Vec::with_capacity(batch_size);
    let mut ticker = tokio::time::interval(interval);
    ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

    loop {
        tokio::select! {
            biased;
            // Flush on timer.
            _ = ticker.tick() => {
                if !buffer.is_empty() {
                    flush(&writer, &mut buffer).await;
                }
            }
            // Receive rows.
            msg = rx.recv() => {
                match msg {
                    Some(row) => {
                        buffer.push(row);
                        if buffer.len() >= batch_size {
                            flush(&writer, &mut buffer).await;
                        }
                    }
                    None => {
                        // Channel closed (subscriber finished or aborted).
                        if !buffer.is_empty() {
                            flush(&writer, &mut buffer).await;
                        }
                        return;
                    }
                }
            }
        }
    }
}

async fn flush(writer: &ClickHouseWriter, buffer: &mut Vec<TapeRow>) {
    let rows = std::mem::take(buffer);
    let count = rows.len();
    match writer.insert_rows(rows).await {
        Ok(()) => tracing::debug!(count, "tape batch flushed"),
        Err(e) => error!(error = %e, count, "tape batch flush failed"),
    }
}
