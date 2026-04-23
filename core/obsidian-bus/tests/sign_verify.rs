// ============================================================================
// core/obsidian-bus/tests/sign_verify.rs
//
// Authorized by: M0 plan §"Acceptance tests" (implicit dependency of
// heartbeat-ring and replay-determinism).
// ============================================================================

use obsidian_bus::canonical::canonicalize_envelope;
use obsidian_bus::envelope::{sign_envelope, verify_envelope, EnvelopeBuilder, NONCE_LENGTH};
use obsidian_bus::proto::MessageType;
use obsidian_bus::signing::SigningKey;

fn builder() -> EnvelopeBuilder {
    EnvelopeBuilder::new(
        MessageType::Heartbeat,
        "system.heartbeat.agent-01",
        "agent-01",
        "aletheia",
    )
    .payload(b"hello".to_vec())
    .schema_version("1.0.0")
}

#[test]
fn happy_path_sign_then_verify() {
    let key = SigningKey::generate();
    let env = builder().build();
    let signed = sign_envelope(env, &key).unwrap();

    assert_eq!(signed.nonce.len(), NONCE_LENGTH);
    assert_eq!(signed.signature.len(), 64);

    verify_envelope(&signed, &key.verifying()).expect("verify should succeed");
}

#[test]
fn tampering_any_signed_field_fails_verify() {
    let key = SigningKey::generate();
    let vk = key.verifying();

    // For each field, produce a valid signed envelope, tamper it, expect
    // verification failure.
    let mutations: Vec<(&str, fn(&mut obsidian_bus::proto::Envelope))> = vec![
        ("message_id", |e| e.message_id.push('x')),
        ("correlation_id", |e| e.correlation_id.push('x')),
        ("source_agent_id", |e| e.source_agent_id.push('x')),
        ("source_city", |e| e.source_city.push('x')),
        ("target_topic", |e| e.target_topic.push('x')),
        ("timestamp", |e| {
            if let Some(ts) = e.timestamp.as_mut() {
                ts.seconds += 1;
            }
        }),
        ("priority", |e| e.priority = 3 /* CRITICAL */),
        ("type", |e| e.r#type = 2 /* SIGNAL */),
        ("payload", |e| e.payload.push(0xff)),
        ("causal_message_ids", |e| {
            e.causal_message_ids.push("late-addition".into())
        }),
        ("schema_version", |e| e.schema_version.push('x')),
        ("nonce", |e| e.nonce[0] ^= 0x01),
    ];

    for (field, mutate) in mutations {
        let env = builder().build();
        let mut signed = sign_envelope(env, &key).unwrap();
        mutate(&mut signed);
        assert!(
            verify_envelope(&signed, &vk).is_err(),
            "tampering with field `{field}` should fail verification"
        );
    }
}

#[test]
fn signature_tampering_fails_verify() {
    let key = SigningKey::generate();
    let env = builder().build();
    let mut signed = sign_envelope(env, &key).unwrap();
    signed.signature[0] ^= 0x01;
    assert!(verify_envelope(&signed, &key.verifying()).is_err());
}

#[test]
fn signing_twice_produces_different_nonces() {
    // Non-determinism here is a CORRECTNESS property: reusing nonces across
    // messages makes them distinguishable and weakens replay-attack resistance.
    let key = SigningKey::generate();
    let a = sign_envelope(builder().build(), &key).unwrap();
    let b = sign_envelope(builder().build(), &key).unwrap();
    assert_ne!(a.nonce, b.nonce);
}

#[test]
fn canonical_bytes_exclude_signature_even_after_signing() {
    let key = SigningKey::generate();
    let env = builder().build();
    let signed = sign_envelope(env.clone(), &key).unwrap();

    // The canonical bytes of `signed` and an envelope with the same fields
    // but no signature must match — this is literally what verify relies on.
    let mut stripped = signed.clone();
    stripped.signature.clear();
    assert_eq!(canonicalize_envelope(&signed), canonicalize_envelope(&stripped));
}
