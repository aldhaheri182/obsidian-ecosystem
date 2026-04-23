// ============================================================================
// core/obsidian-ledger/benches/append.rs
// Authorized by: ADR 0003 §"Performance budget" (append p99 < 2 ms).
// ============================================================================

use criterion::{criterion_group, criterion_main, Criterion};
use obsidian_bus::SigningKey;
use obsidian_ledger::{EntryType, Ledger, LedgerConfig, RocksLedger, UnsignedEntry};
use tempfile::TempDir;

fn bench_append(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();

    let dir = TempDir::new().unwrap();
    let cfg = LedgerConfig { path: dir.path().join("rocks"), agent_id: "bench".into() };
    let ledger = RocksLedger::open(cfg, SigningKey::generate()).unwrap();

    c.bench_function("rocks_ledger_append/small_payload", |b| {
        b.to_async(&rt).iter(|| async {
            let u = UnsignedEntry::new(EntryType::Observation, "payload", "v1");
            ledger.append(u).await.unwrap();
        })
    });
}

criterion_group!(benches, bench_append);
criterion_main!(benches);
