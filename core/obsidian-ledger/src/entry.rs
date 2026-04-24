// ============================================================================
// core/obsidian-ledger/src/entry.rs
// Authorized by: ADR 0003 §"Entry format".
// ============================================================================

//! `LedgerEntry` — the canonical record shape.

use serde::{Deserialize, Serialize};
use sha3::{Digest, Sha3_256};
use uuid::Uuid;

/// Unique identifier for a ledger entry. UUID v5 (content-derived) for
/// replay determinism. M0 plan §Acceptance test #2 requires two replays of
/// the same fixture to produce bit-identical ledger hashes; UUID v7 (which
/// we used through `cde3143`) embeds wall-clock and broke this.
pub type EntryId = Uuid;

/// UUID v5 namespace for Obsidian ledger entry ids. Stable, arbitrary —
/// generated once and frozen in source. Every entry_id across every agent
/// across every version of the ecosystem lives under this namespace.
pub const ENTRY_NAMESPACE: Uuid = Uuid::from_bytes([
    0x0b, 0x51, 0xd1, 0xa2, 0x0c, 0x00, 0x50, 0x00, 0xa0, 0x00, 0x00, 0x00, 0x4f, 0x42, 0x53, 0x44,
]);

/// Derive a deterministic UUID v5 from the entry's stable content:
/// (entry_type, timestamp_ns, payload, model_version). Identical inputs
/// produce identical ids across every agent and every replay.
pub(crate) fn derive_entry_id(
    entry_type: &EntryType,
    timestamp_ns: u64,
    payload: &[u8],
    model_version: &str,
) -> Uuid {
    let mut h = Sha3_256::new();
    h.update((*entry_type as u8).to_be_bytes());
    h.update(timestamp_ns.to_be_bytes());
    h.update((payload.len() as u64).to_be_bytes());
    h.update(payload);
    h.update((model_version.len() as u64).to_be_bytes());
    h.update(model_version.as_bytes());
    let digest = h.finalize();
    Uuid::new_v5(&ENTRY_NAMESPACE, &digest)
}

/// Classification of what an entry represents.
///
/// The set is deliberately small and stable. Agent-specific semantics live in
/// the CBOR `payload`, not in this enum. Additions require an ADR.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[repr(u8)]
pub enum EntryType {
    /// Genesis block. Always sequence 0. `previous_hash` is all zeros.
    Genesis = 0,
    /// External world as the agent perceived it (market data tick, news item).
    Observation = 1,
    /// An intermediate deduction (regime classification, signal intensity,
    /// position size proposal).
    Inference = 2,
    /// A decision the agent took (publish a signal, submit an order).
    Action = 3,
    /// A reflection / summarization entry; typically emitted during `shutdown`
    /// or by the Summarizer-Lx agents (M1+).
    Reflection = 4,
    /// A reference to external knowledge the agent has learned (a Principle
    /// adopted from Mnemosyne's Great Library).
    KnowledgeReference = 5,
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
    ///
    /// Uses `now_ns()` as the timestamp (agents SHOULD pass the event's
    /// external timestamp instead via [`Self::with_timestamp`], but we
    /// retain a wall-clock default for tests). `entry_id` is deterministically
    /// derived from (entry_type, timestamp, payload, model_version) via
    /// UUID v5 so the same inputs always produce the same id — a prerequisite
    /// for the M0 replay-determinism acceptance gate.
    pub fn new(
        entry_type: EntryType,
        payload: impl Into<Vec<u8>>,
        model_version: impl Into<String>,
    ) -> Self {
        let ts = now_ns();
        let payload_vec: Vec<u8> = payload.into();
        let mv: String = model_version.into();
        let entry_id = derive_entry_id(&entry_type, ts, &payload_vec, &mv);
        Self {
            entry_id,
            timestamp_ns: ts,
            entry_type,
            payload: payload_vec,
            causal_links: Vec::new(),
            confidence: 1.0,
            model_version: mv,
        }
    }

    /// Deterministic constructor taking an explicit external timestamp.
    /// Intended for production agents that source `timestamp_ns` from the
    /// exchange / external event that triggered this entry.
    pub fn new_deterministic(
        entry_type: EntryType,
        timestamp_ns: u64,
        payload: impl Into<Vec<u8>>,
        model_version: impl Into<String>,
    ) -> Self {
        let payload_vec: Vec<u8> = payload.into();
        let mv: String = model_version.into();
        let entry_id = derive_entry_id(&entry_type, timestamp_ns, &payload_vec, &mv);
        Self {
            entry_id,
            timestamp_ns,
            entry_type,
            payload: payload_vec,
            causal_links: Vec::new(),
            confidence: 1.0,
            model_version: mv,
        }
    }

    /// Override timestamp AND re-derive the content-addressed entry_id.
    pub fn with_timestamp(mut self, timestamp_ns: u64) -> Self {
        self.timestamp_ns = timestamp_ns;
        self.entry_id = derive_entry_id(
            &self.entry_type,
            self.timestamp_ns,
            &self.payload,
            &self.model_version,
        );
        self
    }

    /// Add a causal link. Does not change entry_id — causal_links are not
    /// part of the content hash (they're a graph edge, not a name component).
    pub fn with_causal(mut self, id: EntryId) -> Self {
        self.causal_links.push(id);
        self
    }

    /// Override confidence. Confidence is not part of the id hash.
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
