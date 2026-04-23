// ============================================================================
// core/obsidian-bus/tests/canonical_vectors.rs
//
// Authorized by: user instruction — "cross-language test for this crate ...
// ships in core/obsidian-bus/tests/"; ADR 0003.
//
// Byte-exact regression tests for the canonicalizer. The "empty envelope"
// vector is computed by hand in the comments below so the reader can verify
// it without running code. The other vectors are computed dynamically and
// dumped to `test-vectors/envelopes.json` by the `emit-vectors` example —
// `obsidian_agent.bus` (Python, next commit) loads that file and asserts
// bit equivalence.
//
// Changing the canonicalizer must:
//   1. bump `ENVELOPE_SCHEMA_VERSION` in envelope.rs,
//   2. add an ADR explaining the break,
//   3. regenerate test-vectors/envelopes.json,
//   4. update the hand-computed vector in this file.
// ============================================================================

use obsidian_bus::canonical::canonicalize_envelope;
use obsidian_bus::proto::Envelope;

/// Lowercase-hex encode a byte slice without pulling a dependency.
fn hex(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        s.push_str(&format!("{:02x}", b));
    }
    s
}

// ----------------------------------------------------------------------------
// Vector 1: the default (empty) envelope.
//
// Hand computation (see src/canonical.rs rules 3 and 4):
//
//   * All scalar fields at proto3 zero-value are omitted.
//   * `payload` (tag 9, bytes) is emitted even though empty.
//     tag byte = (9 << 3) | wire_type 2 = 0x4a; length varint = 0x00.
//   * `nonce`   (tag 12, bytes) is emitted even though empty.
//     tag byte = (12 << 3) | wire_type 2 = 0x62; length varint = 0x00.
//   * `signature` (tag 13) is never emitted during canonicalization.
//
// Expected canonical bytes: 4a 00 62 00  → "4a006200"
// ----------------------------------------------------------------------------

#[test]
fn vector_empty_envelope() {
    let env = Envelope::default();
    let bytes = canonicalize_envelope(&env);
    assert_eq!(hex(&bytes), "4a006200");
    assert_eq!(bytes.len(), 4);
}

// ----------------------------------------------------------------------------
// Vector 2: an envelope with only `nonce` populated (16 null bytes).
//
// Expected:
//   4a 00                              -- payload (tag 9, length 0)
//   62 10 00 00 00 00 00 00 00 00      -- nonce (tag 12, length 16, then
//   00 00 00 00 00 00 00 00               16 zero bytes)
// ----------------------------------------------------------------------------

#[test]
fn vector_zero_nonce_only() {
    let env = Envelope {
        nonce: vec![0u8; 16],
        ..Default::default()
    };
    let bytes = canonicalize_envelope(&env);
    assert_eq!(
        hex(&bytes),
        "4a006210\
         00000000000000000000000000000000"
    );
    assert_eq!(bytes.len(), 2 + 2 + 16);
}

// ----------------------------------------------------------------------------
// Vector 3: an envelope with a 1-byte payload and a distinctive nonce.
//
//   4a 01 42        -- payload (tag 9, length 1, byte 0x42)
//   62 10 01..10    -- nonce (tag 12, length 16, bytes 0x01..=0x10)
// ----------------------------------------------------------------------------

#[test]
fn vector_payload_and_nonce() {
    let env = Envelope {
        payload: vec![0x42],
        nonce: (1u8..=16).collect(),
        ..Default::default()
    };
    let bytes = canonicalize_envelope(&env);
    assert_eq!(
        hex(&bytes),
        "4a0142\
         6210\
         0102030405060708090a0b0c0d0e0f10"
    );
}

// ----------------------------------------------------------------------------
// Structural invariants that must hold for ANY envelope canonicalization,
// checked against several constructed envelopes.
// ----------------------------------------------------------------------------

#[test]
fn structural_always_contains_payload_tag() {
    let envs = [
        Envelope::default(),
        Envelope { nonce: vec![1; 16], ..Default::default() },
        Envelope {
            message_id: "m".into(),
            payload: vec![1, 2, 3],
            nonce: vec![0; 16],
            ..Default::default()
        },
    ];
    for env in &envs {
        let bytes = canonicalize_envelope(env);
        // Any envelope output contains the payload tag 0x4a somewhere.
        assert!(bytes.contains(&0x4a), "missing payload tag in output");
        // And the nonce tag 0x62.
        assert!(bytes.contains(&0x62), "missing nonce tag in output");
    }
}

#[test]
fn structural_fields_appear_in_tag_order() {
    // Construct an envelope whose tag-keyed fields all produce unique tag
    // bytes, then scan the output and confirm tags appear in ascending
    // order. (Length-delimited tag bytes: 1→0x0a, 3→0x1a, 5→0x2a, 9→0x4a,
    // 11→0x5a, 12→0x62. Varint tag bytes: 8→0x40.)
    use obsidian_bus::proto::MessageType;
    use prost_types::Timestamp;

    let env = Envelope {
        message_id: "m".into(),
        source_agent_id: "a".into(),
        target_topic: "t".into(),
        timestamp: Some(Timestamp { seconds: 1, nanos: 0 }),
        r#type: MessageType::Heartbeat as i32,
        payload: b"p".to_vec(),
        schema_version: "s".into(),
        nonce: vec![0xff; 16],
        ..Default::default()
    };
    let bytes = canonicalize_envelope(&env);

    // Find each tag's position.
    let positions: Vec<(u8, usize)> = [0x0a, 0x1a, 0x2a, 0x32, 0x40, 0x4a, 0x5a, 0x62]
        .iter()
        .filter_map(|&t| bytes.iter().position(|&b| b == t).map(|p| (t, p)))
        .collect();

    // All present.
    assert_eq!(positions.len(), 8, "some expected tags missing: {positions:?}");

    // Positions strictly increasing.
    for w in positions.windows(2) {
        assert!(
            w[0].1 < w[1].1,
            "tags out of order: {:02x} at {} then {:02x} at {}",
            w[0].0,
            w[0].1,
            w[1].0,
            w[1].1
        );
    }
}
