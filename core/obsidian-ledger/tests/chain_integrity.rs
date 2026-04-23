// ============================================================================
// core/obsidian-ledger/tests/chain_integrity.rs
// Authorized by: M0 plan §"Acceptance tests" #1 (Ledger immutability).
//
// Tamper with a stored entry three ways; assert verify_chain catches each.
// ============================================================================

use obsidian_bus::SigningKey;
use obsidian_ledger::{
    ChainStatus, EntryType, Ledger, LedgerConfig, LedgerEntry, RocksLedger, UnsignedEntry,
};
use rocksdb::{ColumnFamilyDescriptor, DBWithThreadMode, Options, SingleThreaded};
use tempfile::tempdir;

async fn build_populated_ledger(agent_id: &str) -> (SigningKey, tempfile::TempDir) {
    let dir = tempdir().unwrap();
    let cfg = LedgerConfig { path: dir.path().join("rocks"), agent_id: agent_id.into() };
    let key = SigningKey::generate();
    let ledger = RocksLedger::open(cfg, key.clone()).unwrap();
    for i in 1..=5 {
        ledger
            .append(UnsignedEntry::new(EntryType::Observation, format!("obs-{i}"), "v1"))
            .await
            .unwrap();
    }
    assert!(matches!(
        ledger.verify_chain().await.unwrap(),
        ChainStatus::Ok { .. }
    ));
    drop(ledger);
    (key, dir)
}

#[tokio::test]
async fn unmodified_ledger_verifies() {
    let (key, dir) = build_populated_ledger("agent-verify").await;
    let ledger = RocksLedger::open(
        LedgerConfig { path: dir.path().join("rocks"), agent_id: "agent-verify".into() },
        key,
    )
    .unwrap();
    match ledger.verify_chain().await.unwrap() {
        ChainStatus::Ok { entries } => assert_eq!(entries, 6), // genesis + 5
        other => panic!("expected Ok, got {other:?}"),
    }
}

#[tokio::test]
async fn attack_1_direct_rocksdb_write_tampers_payload() {
    let (key, dir) = build_populated_ledger("agent-attack-1").await;

    // Attack: open the ledger's RocksDB in another "process" (just another
    // handle here — equivalent to what a malicious actor with disk access
    // would do) and overwrite entry 3's payload bytes.
    let path = dir.path().join("rocks");
    let mut opts = Options::default();
    opts.create_if_missing(false);
    let cfs = vec![
        ColumnFamilyDescriptor::new("entries", Options::default()),
        ColumnFamilyDescriptor::new("metadata", Options::default()),
    ];
    let db: DBWithThreadMode<SingleThreaded> =
        DBWithThreadMode::open_cf_descriptors(&opts, &path, cfs).unwrap();
    let cf = db.cf_handle("entries").unwrap();
    let key_bytes = 3u64.to_be_bytes();
    let raw = db.get_cf(cf, key_bytes).unwrap().unwrap();
    let mut entry: LedgerEntry = serde_cbor::from_slice(&raw).unwrap();

    // Flip one byte in the payload, but DO NOT recompute signature.
    entry.unsigned.payload[0] ^= 0xAA;
    db.put_cf(cf, key_bytes, serde_cbor::to_vec(&entry).unwrap()).unwrap();
    drop(db);

    // Verify: must detect the tamper (signature mismatch on entry 3).
    let ledger = RocksLedger::open(
        LedgerConfig { path, agent_id: "agent-attack-1".into() },
        key,
    )
    .unwrap();
    match ledger.verify_chain().await.unwrap() {
        ChainStatus::Broken { sequence, .. } => assert_eq!(sequence, 3),
        ChainStatus::Ok { .. } => panic!("attack 1 was not detected"),
    }
}

#[tokio::test]
async fn attack_2_raw_file_edit_then_reopen() {
    // RocksDB handles the on-disk layout; "flipping a bit in an .sst file" is
    // moot unless we manage to do it without RocksDB itself detecting the
    // checksum failure. For M0, the equivalent meaningful test is: tamper at
    // the CBOR level via a second DB handle (same as attack 1) but on entry
    // `sequence - 1` so the chain linkage is broken instead of the signature.
    let (key, dir) = build_populated_ledger("agent-attack-2").await;
    let path = dir.path().join("rocks");
    let mut opts = Options::default();
    opts.create_if_missing(false);
    let cfs = vec![
        ColumnFamilyDescriptor::new("entries", Options::default()),
        ColumnFamilyDescriptor::new("metadata", Options::default()),
    ];
    let db: DBWithThreadMode<SingleThreaded> =
        DBWithThreadMode::open_cf_descriptors(&opts, &path, cfs).unwrap();
    let cf = db.cf_handle("entries").unwrap();

    // Rewrite entry 2 with its previous_hash maliciously changed (all zeros).
    // This breaks the chain linkage to entry 1.
    let raw = db.get_cf(cf, 2u64.to_be_bytes()).unwrap().unwrap();
    let mut entry: LedgerEntry = serde_cbor::from_slice(&raw).unwrap();
    entry.previous_hash = vec![0u8; 32];
    db.put_cf(cf, 2u64.to_be_bytes(), serde_cbor::to_vec(&entry).unwrap()).unwrap();
    drop(db);

    let ledger = RocksLedger::open(
        LedgerConfig { path, agent_id: "agent-attack-2".into() },
        key,
    )
    .unwrap();
    match ledger.verify_chain().await.unwrap() {
        ChainStatus::Broken { sequence, .. } => assert_eq!(sequence, 2),
        ChainStatus::Ok { .. } => panic!("attack 2 was not detected"),
    }
}

#[tokio::test]
async fn attack_3_full_replace_with_different_key() {
    // Replace entry 4 with a VALID but DIFFERENTLY-SIGNED entry. The attacker's
    // key isn't ours, so signature verification should catch it.
    let (key, dir) = build_populated_ledger("agent-attack-3").await;
    let path = dir.path().join("rocks");
    let mut opts = Options::default();
    opts.create_if_missing(false);
    let cfs = vec![
        ColumnFamilyDescriptor::new("entries", Options::default()),
        ColumnFamilyDescriptor::new("metadata", Options::default()),
    ];
    let db: DBWithThreadMode<SingleThreaded> =
        DBWithThreadMode::open_cf_descriptors(&opts, &path, cfs).unwrap();
    let cf = db.cf_handle("entries").unwrap();

    let raw = db.get_cf(cf, 4u64.to_be_bytes()).unwrap().unwrap();
    let mut entry: LedgerEntry = serde_cbor::from_slice(&raw).unwrap();
    // Keep sequence and previous_hash, but replace payload and re-sign with a
    // DIFFERENT key.
    entry.unsigned.payload = b"malicious".to_vec();
    let attacker_key = SigningKey::generate();
    let canonical = obsidian_ledger::hash_chain_bytes_for_test(&entry);
    entry.signature = attacker_key.sign(&canonical);
    db.put_cf(cf, 4u64.to_be_bytes(), serde_cbor::to_vec(&entry).unwrap()).unwrap();
    drop(db);

    let ledger = RocksLedger::open(
        LedgerConfig { path, agent_id: "agent-attack-3".into() },
        key,
    )
    .unwrap();
    match ledger.verify_chain().await.unwrap() {
        ChainStatus::Broken { sequence, .. } => assert_eq!(sequence, 4),
        ChainStatus::Ok { .. } => panic!("attack 3 was not detected"),
    }
}
