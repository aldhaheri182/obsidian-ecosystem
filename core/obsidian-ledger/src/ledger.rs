// ============================================================================
// core/obsidian-ledger/src/ledger.rs
// Authorized by: ADR 0003; M0 plan §"Build order" step 5.
// ============================================================================

//! `Ledger` trait + `RocksLedger` RocksDB-backed implementation.

use crate::entry::{EntryId, EntryType, LedgerEntry, UnsignedEntry};
use crate::error::{LedgerError, Result};
use crate::hash_chain::{canonical_bytes, compute_chain_hash, verify_link};
use crate::replay::EntryStream;
use crate::verify::ChainStatus;
use async_trait::async_trait;
use futures::stream;
use obsidian_bus::SigningKey;
use obsidian_bus::VerifyingKey;
use rocksdb::{ColumnFamilyDescriptor, DBWithThreadMode, IteratorMode, Options, SingleThreaded};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{debug, info};

/// Column family where entries live, keyed by big-endian u64 sequence.
const CF_ENTRIES: &str = "entries";
/// Column family for metadata: genesis details, chain head cache, pubkey.
const CF_METADATA: &str = "metadata";

const META_KEY_HEAD_SEQUENCE: &[u8] = b"head_sequence";
const META_KEY_HEAD_HASH: &[u8] = b"head_hash";
const META_KEY_PUBKEY: &[u8] = b"pubkey";

/// Config for creating a RocksLedger.
#[derive(Clone, Debug)]
pub struct LedgerConfig {
    /// Directory where the agent's RocksDB lives (typically
    /// `{data_root}/{agent_id}/rocks`).
    pub path: PathBuf,
    /// The agent_id — stored only for logs; the identity is enforced by the
    /// signing key, not this field.
    pub agent_id: String,
}

/// The public ledger interface. Exists as a trait so tests can mock if needed,
/// but the production implementation is always `RocksLedger`.
#[async_trait]
pub trait Ledger: Send + Sync {
    /// Append a pre-unsigned entry. Populates sequence + previous_hash +
    /// signature and returns the `entry_id` of the newly appended entry.
    async fn append(&self, unsigned: UnsignedEntry) -> Result<EntryId>;

    /// Fetch the entry at `sequence`, if any.
    async fn get(&self, sequence: u64) -> Result<Option<LedgerEntry>>;

    /// Fetch the latest sequence number in the ledger (i.e. the head).
    async fn head_sequence(&self) -> Result<u64>;

    /// Stream every entry in order from `from_sequence` (inclusive) to
    /// `to_sequence` (exclusive).
    async fn replay(&self, from_sequence: u64, to_sequence: u64) -> Result<EntryStream<'static>>;

    /// Walk the chain end-to-end, verifying every link and every signature.
    async fn verify_chain(&self) -> Result<ChainStatus>;

    /// Current SHA3-256 of the most recent entry, as hex. Empty string if the
    /// ledger has only the genesis entry.
    async fn head_hash_hex(&self) -> Result<String>;
}

/// RocksDB implementation.
pub struct RocksLedger {
    /// Owning agent id. Stored for debugging, per-agent filtering in
    /// snapshot tooling, and provenance in future archival tags.
    #[allow(dead_code)]
    agent_id: String,
    db: DBWithThreadMode<SingleThreaded>,
    signing_key: SigningKey,
    /// The head sequence in-memory (loaded from metadata on open). Under
    /// tokio Mutex so concurrent append calls are serialized.
    head: Mutex<HeadState>,
}

struct HeadState {
    sequence: u64,
    hash: [u8; 32],
}

impl RocksLedger {
    /// Open (or create) the ledger at `config.path`, initializing the genesis
    /// block if this is a brand-new ledger.
    pub fn open(config: LedgerConfig, signing_key: SigningKey) -> Result<Self> {
        let mut db_opts = Options::default();
        db_opts.create_if_missing(true);
        db_opts.create_missing_column_families(true);
        db_opts.set_compression_type(rocksdb::DBCompressionType::Snappy);
        // We do not need write-ahead log fsync per-write; RocksDB's default
        // already fsyncs on commit unless we disable it. Leave defaults.

        let cfs = vec![
            ColumnFamilyDescriptor::new(CF_ENTRIES, Options::default()),
            ColumnFamilyDescriptor::new(CF_METADATA, Options::default()),
        ];
        let db = DBWithThreadMode::<SingleThreaded>::open_cf_descriptors(&db_opts, &config.path, cfs)?;

        // Initialize or load metadata.
        let meta_cf = db
            .cf_handle(CF_METADATA)
            .ok_or_else(|| LedgerError::Metadata("metadata CF not found".into()))?;

        let existing_head_seq = db.get_cf(meta_cf, META_KEY_HEAD_SEQUENCE)?;
        let head = match existing_head_seq {
            None => {
                // Brand new ledger: write genesis.
                let pk_bytes = signing_key.verifying().as_bytes().to_vec();
                db.put_cf(meta_cf, META_KEY_PUBKEY, &pk_bytes)?;

                let genesis_unsigned = UnsignedEntry {
                    entry_id: uuid::Uuid::now_v7(),
                    timestamp_ns: now_ns(),
                    entry_type: EntryType::Genesis,
                    payload: format!("genesis:{}", config.agent_id).into_bytes(),
                    causal_links: Vec::new(),
                    confidence: 1.0,
                    model_version: "genesis-0.1.0".into(),
                };
                let prev_hash = [0u8; 32];
                let canonical =
                    canonical_bytes(0, &prev_hash, &genesis_unsigned)?;
                let signature = signing_key.sign(&canonical);
                let genesis_entry = LedgerEntry {
                    sequence: 0,
                    previous_hash: prev_hash.to_vec(),
                    unsigned: genesis_unsigned,
                    signature,
                };
                write_entry_internal(&db, &genesis_entry)?;

                let hash = compute_chain_hash(&genesis_entry)?;
                db.put_cf(meta_cf, META_KEY_HEAD_SEQUENCE, 0u64.to_be_bytes())?;
                db.put_cf(meta_cf, META_KEY_HEAD_HASH, hash)?;
                info!(agent_id = %config.agent_id, "ledger genesis written");
                HeadState { sequence: 0, hash }
            }
            Some(bytes) => {
                let seq = u64_from_be_slice(&bytes).ok_or_else(|| {
                    LedgerError::Metadata("head_sequence malformed".into())
                })?;
                let hash_bytes = db.get_cf(meta_cf, META_KEY_HEAD_HASH)?
                    .ok_or_else(|| LedgerError::Metadata("head_hash missing".into()))?;
                if hash_bytes.len() != 32 {
                    return Err(LedgerError::Metadata("head_hash length != 32".into()));
                }
                let mut hash = [0u8; 32];
                hash.copy_from_slice(&hash_bytes);
                debug!(agent_id = %config.agent_id, seq, "ledger reopened");
                HeadState { sequence: seq, hash }
            }
        };

        Ok(Self {
            agent_id: config.agent_id,
            db,
            signing_key,
            head: Mutex::new(head),
        })
    }

    /// Public accessor.
    pub fn verifying_key(&self) -> VerifyingKey {
        self.signing_key.verifying()
    }

    /// Scan every entry in order. Helper for `verify_chain`.
    fn iterate_entries(&self) -> Result<impl Iterator<Item = Result<LedgerEntry>> + '_> {
        let cf = self
            .db
            .cf_handle(CF_ENTRIES)
            .ok_or_else(|| LedgerError::Metadata("entries CF not found".into()))?;
        Ok(self.db.iterator_cf(cf, IteratorMode::Start).map(|item| {
            let (_k, v) = item.map_err(LedgerError::from)?;
            let entry: LedgerEntry = serde_cbor::from_slice(&v)?;
            Ok(entry)
        }))
    }
}

#[async_trait]
impl Ledger for RocksLedger {
    async fn append(&self, unsigned: UnsignedEntry) -> Result<EntryId> {
        let mut head = self.head.lock().await;

        let sequence = head.sequence + 1;
        let previous_hash_vec = head.hash.to_vec();
        let entry_id = unsigned.entry_id;

        let canonical = canonical_bytes(sequence, &previous_hash_vec, &unsigned)?;
        let signature = self.signing_key.sign(&canonical);

        let entry = LedgerEntry {
            sequence,
            previous_hash: previous_hash_vec,
            unsigned,
            signature,
        };

        // Single write batch: put entry + update head metadata.
        let cf_entries = self
            .db
            .cf_handle(CF_ENTRIES)
            .ok_or_else(|| LedgerError::Metadata("entries CF not found".into()))?;
        let cf_meta = self
            .db
            .cf_handle(CF_METADATA)
            .ok_or_else(|| LedgerError::Metadata("metadata CF not found".into()))?;

        let new_hash = compute_chain_hash(&entry)?;
        let mut batch = rocksdb::WriteBatch::default();
        batch.put_cf(cf_entries, sequence.to_be_bytes(), serde_cbor::to_vec(&entry)?);
        batch.put_cf(cf_meta, META_KEY_HEAD_SEQUENCE, sequence.to_be_bytes());
        batch.put_cf(cf_meta, META_KEY_HEAD_HASH, new_hash);
        self.db.write(batch)?;

        head.sequence = sequence;
        head.hash = new_hash;
        Ok(entry_id)
    }

    async fn get(&self, sequence: u64) -> Result<Option<LedgerEntry>> {
        let cf = self
            .db
            .cf_handle(CF_ENTRIES)
            .ok_or_else(|| LedgerError::Metadata("entries CF not found".into()))?;
        let raw = self.db.get_cf(cf, sequence.to_be_bytes())?;
        match raw {
            None => Ok(None),
            Some(bytes) => Ok(Some(serde_cbor::from_slice(&bytes)?)),
        }
    }

    async fn head_sequence(&self) -> Result<u64> {
        Ok(self.head.lock().await.sequence)
    }

    async fn replay(&self, from_sequence: u64, to_sequence: u64) -> Result<EntryStream<'static>> {
        // For M0 we materialize the range into a Vec and stream it. A true
        // streaming iterator over RocksDB under an Arc<DB> is possible but
        // cumbersome with the rocksdb crate's lifetimes; defer to M1.
        let cf = self
            .db
            .cf_handle(CF_ENTRIES)
            .ok_or_else(|| LedgerError::Metadata("entries CF not found".into()))?;
        let mut out: Vec<Result<LedgerEntry>> = Vec::new();
        let from_key = from_sequence.to_be_bytes();
        let mode = IteratorMode::From(&from_key, rocksdb::Direction::Forward);
        for item in self.db.iterator_cf(cf, mode) {
            let (k, v) = item?;
            let seq = u64_from_be_slice(&k).unwrap_or(u64::MAX);
            if seq >= to_sequence {
                break;
            }
            match serde_cbor::from_slice::<LedgerEntry>(&v) {
                Ok(e) => out.push(Ok(e)),
                Err(e) => out.push(Err(LedgerError::from(e))),
            }
        }
        Ok(Box::pin(stream::iter(out)))
    }

    async fn verify_chain(&self) -> Result<ChainStatus> {
        let iter = self.iterate_entries()?;
        let verifying_key = self.signing_key.verifying();

        let mut prev: Option<LedgerEntry> = None;
        let mut count: u64 = 0;

        for entry_r in iter {
            let entry = entry_r?;

            // 1. Verify signature.
            let canonical = canonical_bytes(
                entry.sequence,
                &entry.previous_hash,
                &entry.unsigned,
            )?;
            if verifying_key.verify(&canonical, &entry.signature).is_err() {
                return Ok(ChainStatus::Broken {
                    sequence: entry.sequence,
                    reason: "signature verification failed".into(),
                });
            }

            // 2. Verify chain linkage to the previous entry.
            if let Some(ref p) = prev {
                if let Err(e) = verify_link(p, &entry) {
                    return Ok(ChainStatus::Broken {
                        sequence: entry.sequence,
                        reason: format!("{e}"),
                    });
                }
            } else {
                // First entry should be genesis with previous_hash == zero.
                if entry.sequence != 0 {
                    return Ok(ChainStatus::Broken {
                        sequence: entry.sequence,
                        reason: "first entry sequence != 0".into(),
                    });
                }
                if entry.previous_hash != vec![0u8; 32] {
                    return Ok(ChainStatus::Broken {
                        sequence: 0,
                        reason: "genesis previous_hash != [0;32]".into(),
                    });
                }
                if !matches!(entry.unsigned.entry_type, EntryType::Genesis) {
                    return Ok(ChainStatus::Broken {
                        sequence: 0,
                        reason: "first entry is not Genesis".into(),
                    });
                }
            }

            // 3. Verify sequence monotonicity.
            if let Some(ref p) = prev {
                if entry.sequence != p.sequence + 1 {
                    return Ok(ChainStatus::Broken {
                        sequence: entry.sequence,
                        reason: format!(
                            "sequence jump: expected {}, got {}",
                            p.sequence + 1,
                            entry.sequence,
                        ),
                    });
                }
            }

            count += 1;
            prev = Some(entry);
        }

        Ok(ChainStatus::Ok { entries: count })
    }

    async fn head_hash_hex(&self) -> Result<String> {
        let h = self.head.lock().await;
        if h.sequence == 0 {
            return Ok(String::new());
        }
        let mut out = String::with_capacity(64);
        for b in h.hash.iter() {
            use std::fmt::Write;
            let _ = write!(out, "{:02x}", b);
        }
        Ok(out)
    }
}

fn write_entry_internal(
    db: &DBWithThreadMode<SingleThreaded>,
    entry: &LedgerEntry,
) -> Result<()> {
    let cf = db
        .cf_handle(CF_ENTRIES)
        .ok_or_else(|| LedgerError::Metadata("entries CF not found".into()))?;
    db.put_cf(cf, entry.sequence.to_be_bytes(), serde_cbor::to_vec(entry)?)?;
    Ok(())
}

fn u64_from_be_slice(b: &[u8]) -> Option<u64> {
    if b.len() != 8 {
        return None;
    }
    let mut arr = [0u8; 8];
    arr.copy_from_slice(b);
    Some(u64::from_be_bytes(arr))
}

fn now_ns() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("system clock before 1970")
        .as_nanos() as u64
}

// Unused to avoid warning; kept for future Arc<DB> streaming.
#[allow(dead_code)]
fn _typecheck_arc(db: Arc<DBWithThreadMode<SingleThreaded>>) -> Arc<DBWithThreadMode<SingleThreaded>> {
    db
}
