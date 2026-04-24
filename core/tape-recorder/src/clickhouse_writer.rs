// ============================================================================
// core/tape-recorder/src/clickhouse_writer.rs
// Authorized by: spec Part 5.5 (ClickHouse tape table schema).
// ============================================================================

//! ClickHouse batch writer.

use clickhouse::{Client, Row};
use serde::Serialize;

/// Configuration for the ClickHouse connection.
#[derive(Debug, Clone)]
pub struct ClickHouseConfig {
    pub url: String,
    pub database: String,
    pub table: String,
    pub user: Option<String>,
    pub password: Option<String>,
}

/// One row in the `tape` table. Shape matches spec §5.5.
#[derive(Debug, Clone, Row, Serialize)]
pub struct TapeRow {
    /// Nanoseconds since Unix epoch (ClickHouse DateTime64(9) when inserted).
    pub timestamp_ns: u64,
    pub message_id: String,
    pub source_agent: String,
    pub target_topic: String,
    /// Message type name (e.g. "MARKET_DATA"). LowCardinality on the column.
    pub r#type: String,
    pub payload_size: u32,
    /// Raw envelope bytes (base64-encoded by ClickHouse's String CODEC(ZSTD)
    /// on the column side — we ship raw bytes in a String-typed column which
    /// ClickHouse stores verbatim).
    pub raw_payload: Vec<u8>,
}

/// Thin wrapper around a shared `clickhouse::Client`. Cloneable.
#[derive(Clone)]
pub struct ClickHouseWriter {
    client: Client,
    config: ClickHouseConfig,
}

impl ClickHouseWriter {
    /// Connect. Does not create the schema; call `ensure_schema` after.
    pub async fn connect(config: ClickHouseConfig) -> anyhow::Result<Self> {
        let mut client = Client::default()
            .with_url(&config.url)
            .with_database(&config.database);
        if let Some(u) = &config.user {
            client = client.with_user(u);
        }
        if let Some(p) = &config.password {
            client = client.with_password(p);
        }
        Ok(Self { client, config })
    }

    /// Create the `obsidian` database and `tape` table if absent.
    /// Idempotent; safe to call on every boot.
    pub async fn ensure_schema(&self) -> anyhow::Result<()> {
        let create_db = format!("CREATE DATABASE IF NOT EXISTS {}", self.config.database);
        self.client.query(&create_db).execute().await?;

        let create_table = format!(
            r#"
            CREATE TABLE IF NOT EXISTS {db}.{tbl} (
                timestamp_ns UInt64,
                message_id String,
                source_agent String,
                target_topic String,
                type LowCardinality(String),
                payload_size UInt32,
                raw_payload String CODEC(ZSTD(3))
            ) ENGINE = MergeTree()
            ORDER BY (timestamp_ns, target_topic)
            "#,
            db = self.config.database,
            tbl = self.config.table,
        );
        self.client.query(&create_table).execute().await?;
        Ok(())
    }

    /// Insert a batch of rows. Uses ClickHouse's native async insert.
    pub async fn insert_rows(&self, rows: Vec<TapeRow>) -> anyhow::Result<()> {
        if rows.is_empty() {
            return Ok(());
        }
        let mut insert = self.client.insert(&self.config.table)?;
        for r in rows {
            insert.write(&r).await?;
        }
        insert.end().await?;
        Ok(())
    }
}
