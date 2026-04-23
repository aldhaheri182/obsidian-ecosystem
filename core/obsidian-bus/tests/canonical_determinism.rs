// ============================================================================
// core/obsidian-bus/tests/canonical_determinism.rs
//
// Authorized by: M0 plan §"Acceptance tests" #1 (immutability by implication)
// and ADR 0003.
//
// These tests are the firewall against silently breaking the signature
// scheme. Any change to src/canonical.rs must keep these passing — or bump
// the envelope schema_version and update the vectors file.
// ============================================================================

use obsidian_bus::canonical::{canonicalize_envelope, canonicalize_timestamp};
use obsidian_bus::proto::{Envelope, MessageType, Priority};
use prost_types::Timestamp;

fn full_envelope() -> Envelope {
    Envelope {
        message_id: "0192bba2-1f4a-7e9a-bfaa-0123456789ab".to_string(),
        correlation_id: "0192bba2-1f4a-7e9a-bfaa-abcdef123456".to_string(),
        source_agent_id: "momentum-signal-01".to_string(),
        source_city: "aletheia".to_string(),
        target_topic: "aletheia.trading_floor.momentum.alpha".to_string(),
        timestamp: Some(Timestamp { seconds: 1_712_000_000, nanos: 123_456_789 }),
        priority: Priority::Normal as i32,
        r#type: MessageType::Signal as i32,
        payload: vec![0xde, 0xad, 0xbe, 0xef],
        causal_message_ids: vec![
            "0192bba0-1111-7e9a-bfaa-000000000001".to_string(),
            "0192bba0-1111-7e9a-bfaa-000000000002".to_string(),
        ],
        schema_version: "1.0.0".to_string(),
        nonce: (0..16u8).collect(),
        signature: vec![0xaa; 64],
    }
}

#[test]
fn determinism_repeated_calls_same_output() {
    let env = full_envelope();
    let a = canonicalize_envelope(&env);
    let b = canonicalize_envelope(&env);
    let c = canonicalize_envelope(&env);
    assert_eq!(a, b);
    assert_eq!(b, c);
}

#[test]
fn signature_field_ignored() {
    let mut a = full_envelope();
    let mut b = full_envelope();
    a.signature = vec![0; 64];
    b.signature = vec![0xff; 64];
    assert_eq!(canonicalize_envelope(&a), canonicalize_envelope(&b));
}

#[test]
fn every_field_independently_affects_output() {
    let base = canonicalize_envelope(&full_envelope());

    let mut m = full_envelope();
    m.message_id = "different".to_string();
    assert_ne!(canonicalize_envelope(&m), base, "message_id should affect output");

    let mut m = full_envelope();
    m.correlation_id = "different".to_string();
    assert_ne!(canonicalize_envelope(&m), base, "correlation_id should affect output");

    let mut m = full_envelope();
    m.source_agent_id = "different".to_string();
    assert_ne!(canonicalize_envelope(&m), base, "source_agent_id should affect output");

    let mut m = full_envelope();
    m.source_city = "different".to_string();
    assert_ne!(canonicalize_envelope(&m), base, "source_city should affect output");

    let mut m = full_envelope();
    m.target_topic = "different.topic".to_string();
    assert_ne!(canonicalize_envelope(&m), base, "target_topic should affect output");

    let mut m = full_envelope();
    m.timestamp = Some(Timestamp { seconds: 1, nanos: 0 });
    assert_ne!(canonicalize_envelope(&m), base, "timestamp should affect output");

    let mut m = full_envelope();
    m.priority = Priority::Critical as i32;
    assert_ne!(canonicalize_envelope(&m), base, "priority should affect output");

    let mut m = full_envelope();
    m.r#type = MessageType::Heartbeat as i32;
    assert_ne!(canonicalize_envelope(&m), base, "type should affect output");

    let mut m = full_envelope();
    m.payload = vec![0xca, 0xfe];
    assert_ne!(canonicalize_envelope(&m), base, "payload should affect output");

    let mut m = full_envelope();
    m.causal_message_ids.reverse();
    assert_ne!(canonicalize_envelope(&m), base, "causal order should affect output");

    let mut m = full_envelope();
    m.schema_version = "2.0.0".to_string();
    assert_ne!(canonicalize_envelope(&m), base, "schema_version should affect output");

    let mut m = full_envelope();
    m.nonce[0] ^= 0x01;
    assert_ne!(canonicalize_envelope(&m), base, "nonce should affect output");
}

#[test]
fn empty_payload_and_empty_nonce_still_serialize() {
    // Critical rule: payload (tag 9) and nonce (tag 12) are ALWAYS present
    // in canonical output, even when empty, so two envelopes with same
    // fields-minus-payload and empty payload+nonce are NOT confused with
    // envelopes that have different fields.
    let env = Envelope::default();
    let bytes = canonicalize_envelope(&env);
    assert_eq!(bytes, vec![0x4a, 0x00, 0x62, 0x00]);
}

#[test]
fn timestamp_canonical_is_proto3_defaults_stripped() {
    // Zero timestamp produces empty bytes.
    let zero = canonicalize_timestamp(&Timestamp::default());
    assert!(zero.is_empty());

    // Only seconds: tag=0x08, varint(1)
    assert_eq!(canonicalize_timestamp(&Timestamp { seconds: 1, nanos: 0 }), vec![0x08, 0x01]);

    // Only nanos: tag=0x10, varint(1)
    assert_eq!(canonicalize_timestamp(&Timestamp { seconds: 0, nanos: 1 }), vec![0x10, 0x01]);
}

#[test]
fn large_payload_does_not_regress_length_prefix() {
    // Payloads over 127 bytes require multi-byte varint length prefixes.
    let mut env = Envelope::default();
    env.payload = vec![0x42; 300];
    env.nonce = vec![0; 16];
    let bytes = canonicalize_envelope(&env);
    // Tag 9 = 0x4a, then varint(300) = 0xac 0x02, then 300 payload bytes.
    assert_eq!(bytes[0], 0x4a);
    assert_eq!(bytes[1], 0xac);
    assert_eq!(bytes[2], 0x02);
    assert_eq!(bytes[3..3 + 300], vec![0x42; 300]);
}

// Property: canonicalizing an arbitrary Envelope is stable across rebuilds
// of the struct with the same field values.
#[test]
fn proptest_stability() {
    use proptest::prelude::*;

    proptest!(|(
        msg_id in "[a-z0-9-]{1,40}",
        agent_id in "[a-z0-9-]{1,40}",
        topic in "[a-z0-9.]{1,80}",
        payload in prop::collection::vec(any::<u8>(), 0..256),
        nonce_byte in 0u8..=255,
    )| {
        let env = Envelope {
            message_id: msg_id,
            source_agent_id: agent_id,
            target_topic: topic,
            r#type: MessageType::Signal as i32,
            timestamp: Some(Timestamp { seconds: 1, nanos: 0 }),
            payload: payload.clone(),
            nonce: vec![nonce_byte; 16],
            schema_version: "1.0.0".to_string(),
            ..Default::default()
        };
        let a = canonicalize_envelope(&env);
        let b = canonicalize_envelope(&env);
        prop_assert_eq!(a, b);
    });
}
