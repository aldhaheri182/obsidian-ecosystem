// ============================================================================
// core/obsidian-bus/benches/canonical.rs
//
// Authorized by: ADR 0003 §"Performance budget".
//
// Benchmarks for the canonicalize + sign hot path. The ledger `append()`
// budget is 2 ms p99 (ADR 0003); the bus `publish()` budget is TBD in the
// next ADR, but it must not be the dominant cost.
//
// Run with:
//   cargo bench -p obsidian-bus
// ============================================================================

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use obsidian_bus::canonical::canonicalize_envelope;
use obsidian_bus::envelope::{sign_envelope, EnvelopeBuilder};
use obsidian_bus::proto::MessageType;
use obsidian_bus::signing::SigningKey;

fn bench_canonicalize(c: &mut Criterion) {
    let env = EnvelopeBuilder::new(
        MessageType::Signal,
        "aletheia.trading_floor.momentum.alpha",
        "momentum-signal-01",
        "aletheia",
    )
    .payload(vec![0x42u8; 256])
    .causal("m-1")
    .causal("m-2")
    .nonce(vec![0u8; 16])
    .build();

    c.bench_function("canonicalize_envelope/256B_payload", |b| {
        b.iter(|| canonicalize_envelope(black_box(&env)))
    });

    let big = EnvelopeBuilder::new(
        MessageType::KnowledgePublication,
        "mnemosyne.great_library.knowledge_graph.publication",
        "causal-auditor-01",
        "mnemosyne",
    )
    .payload(vec![0x42u8; 16 * 1024])
    .nonce(vec![0u8; 16])
    .build();

    c.bench_function("canonicalize_envelope/16KB_payload", |b| {
        b.iter(|| canonicalize_envelope(black_box(&big)))
    });
}

fn bench_sign(c: &mut Criterion) {
    let key = SigningKey::generate();
    let env = EnvelopeBuilder::new(
        MessageType::Signal,
        "aletheia.trading_floor.momentum.alpha",
        "momentum-signal-01",
        "aletheia",
    )
    .payload(vec![0x42u8; 256])
    .build();

    c.bench_function("sign_envelope/256B_payload", |b| {
        b.iter(|| sign_envelope(black_box(env.clone()), black_box(&key)).unwrap())
    });
}

criterion_group!(benches, bench_canonicalize, bench_sign);
criterion_main!(benches);
