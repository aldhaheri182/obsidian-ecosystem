// ============================================================================
// core/obsidian-ledger/src/replay.rs
// Authorized by: M0 plan §"Acceptance tests" #2 (Replay determinism).
// ============================================================================

//! Streaming replay helpers. The concrete `Stream` implementation is produced
//! by `RocksLedger::replay`; this module exists for types that want to accept
//! arbitrary streams of entries.

use crate::entry::LedgerEntry;
use crate::error::Result;
use futures::Stream;
use std::pin::Pin;

/// Boxed stream of ledger entries.
pub type EntryStream<'a> = Pin<Box<dyn Stream<Item = Result<LedgerEntry>> + Send + 'a>>;
