// ============================================================================
// core/obsidian-ledger/tests/append_and_replay.rs
// Authorized by: M0 plan §"Acceptance tests" #2 hook.
// ============================================================================

use futures::StreamExt;
use obsidian_bus::SigningKey;
use obsidian_ledger::{EntryType, Ledger, LedgerConfig, RocksLedger, UnsignedEntry};
use tempfile::tempdir;

fn new_ledger(agent: &str) -> (RocksLedger, tempfile::TempDir) {
    let dir = tempdir().unwrap();
    let cfg = LedgerConfig { path: dir.path().join("rocks"), agent_id: agent.into() };
    let key = SigningKey::generate();
    (RocksLedger::open(cfg, key).unwrap(), dir)
}

#[tokio::test]
async fn genesis_is_written_on_first_open() {
    let (ledger, _d) = new_ledger("agent-01");
    let g = ledger.get(0).await.unwrap().expect("genesis");
    assert!(g.is_genesis());
    assert_eq!(g.previous_hash, vec![0u8; 32]);
}

#[tokio::test]
async fn append_increments_sequence() {
    let (ledger, _d) = new_ledger("agent-01");
    assert_eq!(ledger.head_sequence().await.unwrap(), 0);

    for i in 1..=5 {
        let u = UnsignedEntry::new(EntryType::Observation, format!("obs-{i}"), "test-0.1.0");
        ledger.append(u).await.unwrap();
        assert_eq!(ledger.head_sequence().await.unwrap(), i);
    }
}

#[tokio::test]
async fn replay_returns_entries_in_order() {
    let (ledger, _d) = new_ledger("agent-01");
    for i in 1..=10 {
        ledger
            .append(UnsignedEntry::new(EntryType::Observation, format!("{i}"), "v1"))
            .await
            .unwrap();
    }

    let mut stream = ledger.replay(0, 100).await.unwrap();
    let mut seen = Vec::new();
    while let Some(r) = stream.next().await {
        seen.push(r.unwrap().sequence);
    }
    assert_eq!(seen, (0..=10).collect::<Vec<_>>());
}

#[tokio::test]
async fn replay_respects_bounds() {
    let (ledger, _d) = new_ledger("agent-01");
    for _ in 1..=20 {
        ledger
            .append(UnsignedEntry::new(EntryType::Observation, "x", "v1"))
            .await
            .unwrap();
    }
    let mut stream = ledger.replay(5, 10).await.unwrap();
    let mut seqs = Vec::new();
    while let Some(r) = stream.next().await {
        seqs.push(r.unwrap().sequence);
    }
    assert_eq!(seqs, vec![5, 6, 7, 8, 9]);
}

#[tokio::test]
async fn ledger_reopen_continues_at_correct_head() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("rocks");
    let key = SigningKey::generate();

    {
        let ledger = RocksLedger::open(
            LedgerConfig { path: path.clone(), agent_id: "a".into() },
            key.clone(),
        )
        .unwrap();
        for _ in 1..=3 {
            ledger
                .append(UnsignedEntry::new(EntryType::Action, "x", "v1"))
                .await
                .unwrap();
        }
        assert_eq!(ledger.head_sequence().await.unwrap(), 3);
    }

    let ledger =
        RocksLedger::open(LedgerConfig { path, agent_id: "a".into() }, key).unwrap();
    assert_eq!(ledger.head_sequence().await.unwrap(), 3);
    ledger
        .append(UnsignedEntry::new(EntryType::Action, "y", "v1"))
        .await
        .unwrap();
    assert_eq!(ledger.head_sequence().await.unwrap(), 4);
}
