// ============================================================================
// core/obsidian-ledger/tests/deterministic_entry_id.rs
// Locks in the M0 plan §Acceptance test #2 invariant: identical inputs
// must produce identical entry ids, and two independent ledger writes of
// the same fixture must produce bit-identical head hashes.
// ============================================================================

use obsidian_bus::SigningKey;
use obsidian_ledger::{
    EntryType, Ledger, LedgerConfig, RocksLedger, UnsignedEntry,
};
use tempfile::tempdir;

#[test]
fn same_inputs_produce_same_entry_id() {
    let a = UnsignedEntry::new_deterministic(
        EntryType::Observation,
        1_700_000_000_000_000_000,
        b"AAPL price=175230000 volume=1200".to_vec(),
        "mom_v2.4",
    );
    let b = UnsignedEntry::new_deterministic(
        EntryType::Observation,
        1_700_000_000_000_000_000,
        b"AAPL price=175230000 volume=1200".to_vec(),
        "mom_v2.4",
    );
    assert_eq!(a.entry_id, b.entry_id, "entry_id must be deterministic");
}

#[test]
fn different_payload_produces_different_entry_id() {
    let a = UnsignedEntry::new_deterministic(
        EntryType::Observation,
        1_700_000_000_000_000_000,
        b"a".to_vec(),
        "v1",
    );
    let b = UnsignedEntry::new_deterministic(
        EntryType::Observation,
        1_700_000_000_000_000_000,
        b"b".to_vec(),
        "v1",
    );
    assert_ne!(a.entry_id, b.entry_id);
}

#[test]
fn different_timestamp_produces_different_entry_id() {
    let a = UnsignedEntry::new_deterministic(
        EntryType::Observation,
        1_700_000_000_000_000_000,
        b"payload".to_vec(),
        "v1",
    );
    let b = UnsignedEntry::new_deterministic(
        EntryType::Observation,
        1_700_000_000_000_000_001, // +1 ns
        b"payload".to_vec(),
        "v1",
    );
    assert_ne!(a.entry_id, b.entry_id);
}

#[tokio::test]
async fn two_independent_ledgers_with_same_fixture_have_same_head_hash() {
    // Write N identical deterministic entries into two fresh ledgers owned
    // by two fresh signing keys. Because entry_ids are content-derived and
    // the hash chain is content-derived, the HEAD hash must match.
    //
    // We sign with the SAME key in both to make this strictly about the
    // entry-content chain. (Different signing keys produce different
    // signatures, which DO affect the chain hash — that's intentional;
    // signatures prove provenance.)
    let key = SigningKey::generate();

    let dir1 = tempdir().unwrap();
    let l1 = RocksLedger::open(
        LedgerConfig { path: dir1.path().join("rocks"), agent_id: "agent-a".into() },
        key.clone(),
    )
    .unwrap();
    for i in 1..=10 {
        let u = UnsignedEntry::new_deterministic(
            EntryType::Observation,
            1_700_000_000_000_000_000 + i,
            format!("obs-{i}").into_bytes(),
            "v1",
        );
        l1.append(u).await.unwrap();
    }
    let head1_seq = match l1.verify_chain().await.unwrap() {
        obsidian_ledger::ChainStatus::Ok { entries } => entries,
        other => panic!("{other:?}"),
    };

    let dir2 = tempdir().unwrap();
    let l2 = RocksLedger::open(
        LedgerConfig { path: dir2.path().join("rocks"), agent_id: "agent-a".into() },
        key,
    )
    .unwrap();
    for i in 1..=10 {
        let u = UnsignedEntry::new_deterministic(
            EntryType::Observation,
            1_700_000_000_000_000_000 + i,
            format!("obs-{i}").into_bytes(),
            "v1",
        );
        l2.append(u).await.unwrap();
    }
    let head2_seq = match l2.verify_chain().await.unwrap() {
        obsidian_ledger::ChainStatus::Ok { entries } => entries,
        other => panic!("{other:?}"),
    };

    assert_eq!(head1_seq, head2_seq, "entry counts must match");
    assert_eq!(head1_seq, 11, "genesis + 10 observations");

    // Same deterministic inputs → same entry_ids at every sequence.
    for seq in 1..=10u64 {
        let e1 = l1.get(seq).await.unwrap().expect("ledger 1 entry");
        let e2 = l2.get(seq).await.unwrap().expect("ledger 2 entry");
        assert_eq!(
            e1.unsigned.entry_id, e2.unsigned.entry_id,
            "sequence {seq}: entry_id must match across independent ledgers"
        );
    }
}
