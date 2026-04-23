// ============================================================================
// core/obsidian-ledger/tests/concurrent_append.rs
// Authorized by: ADR 0003 §"Concurrent append" property.
// ============================================================================

use obsidian_bus::SigningKey;
use obsidian_ledger::{ChainStatus, EntryType, Ledger, LedgerConfig, RocksLedger, UnsignedEntry};
use std::sync::Arc;
use tempfile::tempdir;

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn one_hundred_concurrent_appends_are_monotonic_with_no_gaps() {
    let dir = tempdir().unwrap();
    let cfg = LedgerConfig { path: dir.path().join("rocks"), agent_id: "agent-concurrent".into() };
    let key = SigningKey::generate();
    let ledger = Arc::new(RocksLedger::open(cfg, key).unwrap());

    let mut handles = Vec::with_capacity(100);
    for i in 0..100 {
        let l = Arc::clone(&ledger);
        handles.push(tokio::spawn(async move {
            let u = UnsignedEntry::new(EntryType::Observation, format!("{i}"), "v1");
            l.append(u).await.unwrap();
        }));
    }
    for h in handles {
        h.await.unwrap();
    }

    assert_eq!(ledger.head_sequence().await.unwrap(), 100);

    // Verify chain end-to-end.
    match ledger.verify_chain().await.unwrap() {
        ChainStatus::Ok { entries } => assert_eq!(entries, 101), // genesis + 100
        other => panic!("chain broken after concurrent appends: {other:?}"),
    }
}
