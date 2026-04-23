// ============================================================================
// core/obsidian-ledger/src/entry.rs
// Authorized by: ADR 0003 §"Entry format".
// ============================================================================

//! `LedgerEntry` — the canonical record shape.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Unique identifier for a ledger entry. UUID v7 (time-ordered).
pub type EntryId = Uuid;

/// Classification of what an entry represents.
///
/// The set is deliberately small and stable. Agent-specific semantics live in
/// the CBOR `payload`, not in this enum. Additions require an ADR.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EntryType {
    /// Genesis block. Always sequence 0. `previous_hash` is all zeros.
    Genesis,
    /// External world as the agent perceived it (market data tick, news item).
    Observation,
    /// An intermediate deduction (regime classification, signal intensity,
    /// position size proposal).
    Inference,
    /// A decision the agent took (publish a signal, submit an order).
    Action,
    /// A reflection / summarization entry; typically emitted during `shutdown`
    /// or by the Summarizer-Lx agents (M1+).
    Reflection,
    /// A reference to external knowledge the agent has learned (a Principle
    /// adopted from Mnemosyne's Great Library).
    KnowledgeReference,
}

/// An entry NOT YET written to disk — lacks `previous_hash`, `sequence`,
/// `signature`. Agents build these and hand them to `Ledger::append`, which
/// computes the chain fields and signs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnsignedEntry {
    /// UUID v7.
    pub entry_id: EntryId,
    /// Nanoseconds since Unix epoch. Agents should pass the event's external
    /// timestamp (e.g., the exchange timestamp of the tick that triggered
    /// this entry), not wall-clock-at-append.
    pub timestamp_ns: u64,
    /// Classification.
    pub entry_type: EntryType,
    /// CBOR-encoded payload specific to the entry_type / agent.
    #[serde(with = "serde_bytes")]
    pub payload: Vec<u8>,
    /// entry_ids of the entries that causally produced this one (within or
    /// across agents, though cross-agent links are resolved by Mnemosyne).
    pub causal_links: Vec<EntryId>,
    /// Agent's self-assessed confidence in the entry's correctness, `[0, 1]`.
    pub confidence: f32,
    /// Semantic version of the agent's model logic when this entry was made.
    pub model_version: String,
}

/// A fully-chained, signed entry as stored on disk.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerEntry {
    /// Monotonic per-agent sequence number, big-endian u64 in RocksDB.
    pub sequence: u64,
    /// SHA3-256 of the prior entry's canonical bytes.
    #[serde(with = "serde_bytes")]
    pub previous_hash: Vec<u8>, // length 32
    /// All unsigned fields.
    pub unsigned: UnsignedEntry,
    /// Ed25519 signature over
    /// `previous_hash || canonical_CBOR(header_without_hash_and_signature)`.
    /// Length 64.
    #[serde(with = "serde_bytes")]
    pub signature: Vec<u8>,
}

impl LedgerEntry {
    /// Is this a genesis block? (sequence == 0 and entry_type == Genesis).
    pub fn is_genesis(&self) -> bool {
        self.sequence == 0 && matches!(self.unsigned.entry_type, EntryType::Genesis)
    }
}

/// Helper: build an `UnsignedEntry` with sensible defaults.
impl UnsignedEntry {
    /// Convenience constructor.
    pub fn new(
        entry_type: EntryType,
        payload: impl Into<Vec<u8>>,
        model_version: impl Into<String>,
    ) -> Self {
        Self {
            entry_id: Uuid::now_v7(),
            timestamp_ns: now_ns(),
            entry_type,
            payload: payload.into(),
            causal_links: Vec::new(),
            confidence: 1.0,
            model_version: model_version.into(),
        }
    }

    /// Add a causal link.
    pub fn with_causal(mut self, id: EntryId) -> Self {
        self.causal_links.push(id);
        self
    }

    /// Override confidence.
    pub fn with_confidence(mut self, c: f32) -> Self {
        self.confidence = c.clamp(0.0, 1.0);
        self
    }
}

fn now_ns() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("system clock before 1970")
        .as_nanos() as u64
}
