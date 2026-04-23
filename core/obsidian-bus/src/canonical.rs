// ============================================================================
// core/obsidian-bus/src/canonical.rs
//
// Authorized by: M0 plan §"Build order" step 2; ADR 0003; spec Part 4.2.
//
// Canonical (deterministic, cross-language) serialization of `Envelope` for
// the purpose of signing and verification.
//
// WHY A HAND-ROLLED SERIALIZER:
//
// Protobuf's wire format is NOT canonical. Different implementations may
// reorder unknown fields, omit or emit default values, choose packed vs
// unpacked encoding for repeated scalars, and handle signed integer varints
// differently. Any of these variations break byte-equality, which breaks
// signature verification across a language or library-version boundary.
//
// The function below is a schema-driven, field-ordered, defaults-stripped,
// bytes-always-included encoder that is a pure function of the `Envelope`
// contents. It is tested for determinism and for cross-language bit
// equivalence against the Python implementation in obsidian-agent-py (when
// that crate is written, in the next milestone commit).
//
// RULES:
//
//   1. Fields are emitted in ascending tag number order.
//   2. Scalar fields equal to the proto3 zero-value are OMITTED, with two
//      exceptions below.
//   3. EXCEPTION (1): bytes fields `payload` (tag 9) and `nonce` (tag 12)
//      are ALWAYS emitted with a length prefix, even when empty. This is
//      because the `nonce` is part of the signed byte range and must not
//      be silently elided, and because `payload` being empty is a legitimate
//      envelope state (e.g. Heartbeat) that still must produce a signature
//      distinct from an envelope with a different `payload` of same canonical
//      byte length (none — because length prefix is always emitted).
//   4. EXCEPTION (2): the `signature` field (tag 13) is NEVER emitted,
//      because it is what we are in the process of computing or verifying.
//   5. Nested message fields (e.g. `timestamp`) are recursively
//      canonicalized and emitted length-prefixed.
//   6. Repeated scalar fields would be packed, but Envelope has none in M0.
//      The only repeated field is `causal_message_ids: repeated string`,
//      which per proto3 MUST be emitted as one tag per element. Order is
//      preserved (it is semantic).
//   7. Integer varints use plain proto3 varint encoding (NOT zigzag), even
//      for signed fields. Negative values become 10-byte varints. This
//      matches `prost`'s and `protoc`'s behaviour for int32/int64 fields.
//
// ANY CHANGE TO THIS FILE IS A BREAKING CHANGE TO THE SIGNATURE SCHEME.
// An ADR is required, and the `schema_version` field in outgoing envelopes
// must be bumped.
// ============================================================================

//! Canonical envelope serialization for signing and verification.

use crate::proto::Envelope;
use prost_types::Timestamp;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Return the canonical bytes of an envelope for signing.
///
/// The `signature` field (tag 13) is ALWAYS excluded from the output, whether
/// it is set or not. Callers must not pre-strip it.
///
/// Output is deterministic: calling twice with the same `env` produces
/// byte-identical output on every run, every thread, every process, and every
/// language that implements this specification (see the Python mirror in
/// `obsidian_agent.bus.canonical`).
pub fn canonicalize_envelope(env: &Envelope) -> Vec<u8> {
    // Envelope payloads range from ~100 bytes (heartbeat) to a few KB
    // (knowledge publications). 256 bytes is a reasonable initial capacity.
    let mut out = Vec::with_capacity(256);

    // Tag 1: string message_id — strip if empty.
    write_string_if_nonempty(&mut out, 1, &env.message_id);

    // Tag 2: string correlation_id — strip if empty.
    write_string_if_nonempty(&mut out, 2, &env.correlation_id);

    // Tag 3: string source_agent_id — strip if empty.
    write_string_if_nonempty(&mut out, 3, &env.source_agent_id);

    // Tag 4: string source_city — strip if empty.
    write_string_if_nonempty(&mut out, 4, &env.source_city);

    // Tag 5: string target_topic — strip if empty.
    write_string_if_nonempty(&mut out, 5, &env.target_topic);

    // Tag 6: message google.protobuf.Timestamp timestamp — always include if
    // Some; canonicalize recursively.
    if let Some(ts) = env.timestamp.as_ref() {
        let inner = canonicalize_timestamp(ts);
        write_bytes(&mut out, 6, &inner);
    }

    // Tag 7: enum Priority (int32 varint) — strip if 0.
    if env.priority != 0 {
        write_varint_tag(&mut out, 7, env.priority as u64);
    }

    // Tag 8: enum MessageType (int32 varint) — strip if 0 (UNSPECIFIED).
    if env.r#type != 0 {
        write_varint_tag(&mut out, 8, env.r#type as u64);
    }

    // Tag 9: bytes payload — ALWAYS include (rule 3).
    write_bytes(&mut out, 9, &env.payload);

    // Tag 10: repeated string causal_message_ids — one tag per element,
    // in order (rule 6).
    for link in &env.causal_message_ids {
        write_string(&mut out, 10, link);
    }

    // Tag 11: string schema_version — strip if empty.
    write_string_if_nonempty(&mut out, 11, &env.schema_version);

    // Tag 12: bytes nonce — ALWAYS include (rule 3).
    write_bytes(&mut out, 12, &env.nonce);

    // Tag 13: bytes signature — NEVER include (rule 4).

    out
}

/// Canonicalize a Timestamp (google.protobuf.Timestamp).
///
/// Rules: proto3 defaults stripped (seconds=0, nanos=0 omitted). Valid
/// Timestamps have 0 ≤ nanos ≤ 999_999_999.
///
/// Exposed primarily for testing.
pub fn canonicalize_timestamp(ts: &Timestamp) -> Vec<u8> {
    let mut out = Vec::with_capacity(16);

    // Tag 1: int64 seconds. proto3 int64 uses plain varint (not zigzag).
    // Negative values become 10-byte varints via two's-complement u64 cast.
    if ts.seconds != 0 {
        write_varint_tag(&mut out, 1, ts.seconds as u64);
    }

    // Tag 2: int32 nanos. Same rule.
    if ts.nanos != 0 {
        write_varint_tag(&mut out, 2, ts.nanos as u64);
    }

    out
}

// ---------------------------------------------------------------------------
// Low-level wire encoders
//
// These mirror the protobuf wire format subset we need for Envelope.
// They are module-private; the whole world knows them only through
// `canonicalize_envelope`.
// ---------------------------------------------------------------------------

// Protobuf wire type tags (see
// https://protobuf.dev/programming-guides/encoding/#structure).
#[allow(dead_code)]
const WIRE_TYPE_VARINT: u32 = 0;
#[allow(dead_code)]
const WIRE_TYPE_FIXED64: u32 = 1;
const WIRE_TYPE_LENGTH_DELIMITED: u32 = 2;
#[allow(dead_code)]
const WIRE_TYPE_FIXED32: u32 = 5;

/// Write a base-128 varint of `value` to `out`.
///
/// Standard unsigned-varint encoding: 7 bits per byte, low-order first,
/// continuation bit (high bit) set for all but the final byte.
#[inline]
fn write_varint(out: &mut Vec<u8>, mut value: u64) {
    while value >= 0x80 {
        out.push((value as u8) | 0x80);
        value >>= 7;
    }
    out.push(value as u8);
}

/// Write a protobuf tag byte(s) for a given field number and wire type.
#[inline]
fn write_tag(out: &mut Vec<u8>, field_number: u32, wire_type: u32) {
    let tag = (field_number << 3) | (wire_type & 0b111);
    write_varint(out, u64::from(tag));
}

/// Write a (tag, varint) pair for fields of proto type
/// int32 / int64 / uint32 / uint64 / bool / enum.
#[inline]
fn write_varint_tag(out: &mut Vec<u8>, field_number: u32, value: u64) {
    write_tag(out, field_number, WIRE_TYPE_VARINT);
    write_varint(out, value);
}

/// Write a length-delimited field (string / bytes / nested message).
#[inline]
fn write_bytes(out: &mut Vec<u8>, field_number: u32, data: &[u8]) {
    write_tag(out, field_number, WIRE_TYPE_LENGTH_DELIMITED);
    write_varint(out, data.len() as u64);
    out.extend_from_slice(data);
}

/// Write a length-delimited string (alias for `write_bytes` on UTF-8).
#[inline]
fn write_string(out: &mut Vec<u8>, field_number: u32, s: &str) {
    write_bytes(out, field_number, s.as_bytes());
}

/// Write a string only if it is non-empty (proto3 default-strip).
#[inline]
fn write_string_if_nonempty(out: &mut Vec<u8>, field_number: u32, s: &str) {
    if !s.is_empty() {
        write_string(out, field_number, s);
    }
}

// ---------------------------------------------------------------------------
// Unit tests for the low-level encoders. Vector and determinism tests for
// canonicalize_envelope live in /tests (they are integration tests to prove
// the crate's surface API is stable).
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn varint_small_values() {
        let mut v = Vec::new();
        write_varint(&mut v, 0);
        assert_eq!(v, vec![0x00]);

        let mut v = Vec::new();
        write_varint(&mut v, 1);
        assert_eq!(v, vec![0x01]);

        let mut v = Vec::new();
        write_varint(&mut v, 127);
        assert_eq!(v, vec![0x7f]);

        let mut v = Vec::new();
        write_varint(&mut v, 128);
        assert_eq!(v, vec![0x80, 0x01]);

        let mut v = Vec::new();
        write_varint(&mut v, 300);
        assert_eq!(v, vec![0xac, 0x02]);
    }

    #[test]
    fn varint_max_u64() {
        let mut v = Vec::new();
        write_varint(&mut v, u64::MAX);
        // u64::MAX = 2^64 - 1 needs 10 bytes in varint.
        assert_eq!(v.len(), 10);
    }

    #[test]
    fn tag_field_10_length_delimited() {
        // tag = (10 << 3) | 2 = 82 = 0x52
        let mut v = Vec::new();
        write_tag(&mut v, 10, WIRE_TYPE_LENGTH_DELIMITED);
        assert_eq!(v, vec![0x52]);
    }

    #[test]
    fn tag_field_1_varint() {
        // tag = (1 << 3) | 0 = 8 = 0x08
        let mut v = Vec::new();
        write_tag(&mut v, 1, WIRE_TYPE_VARINT);
        assert_eq!(v, vec![0x08]);
    }

    #[test]
    fn bytes_empty_still_emits_tag_and_zero_length() {
        let mut v = Vec::new();
        write_bytes(&mut v, 9, b"");
        // tag (9 << 3 | 2) = 74 = 0x4a, len = 0
        assert_eq!(v, vec![0x4a, 0x00]);
    }

    #[test]
    fn bytes_non_empty() {
        let mut v = Vec::new();
        write_bytes(&mut v, 9, b"hi");
        assert_eq!(v, vec![0x4a, 0x02, b'h', b'i']);
    }

    #[test]
    fn string_if_nonempty_strips_empty() {
        let mut v = Vec::new();
        write_string_if_nonempty(&mut v, 1, "");
        assert!(v.is_empty());

        write_string_if_nonempty(&mut v, 1, "x");
        assert_eq!(v, vec![0x0a, 0x01, b'x']);
    }

    #[test]
    fn canonicalize_timestamp_zero_is_empty() {
        let ts = Timestamp { seconds: 0, nanos: 0 };
        assert!(canonicalize_timestamp(&ts).is_empty());
    }

    #[test]
    fn canonicalize_timestamp_round_values() {
        let ts = Timestamp { seconds: 1, nanos: 0 };
        assert_eq!(canonicalize_timestamp(&ts), vec![0x08, 0x01]);

        let ts = Timestamp { seconds: 0, nanos: 1 };
        assert_eq!(canonicalize_timestamp(&ts), vec![0x10, 0x01]);

        let ts = Timestamp { seconds: 1, nanos: 1 };
        assert_eq!(canonicalize_timestamp(&ts), vec![0x08, 0x01, 0x10, 0x01]);
    }

    #[test]
    fn canonicalize_envelope_empty_has_payload_and_nonce_tags() {
        // Every envelope, no matter how empty, must emit at least the payload
        // (tag 9) and nonce (tag 12) length-prefixed fields.
        let env = Envelope::default();
        let bytes = canonicalize_envelope(&env);
        // 0x4a 0x00  -- tag 9, len 0
        // 0x62 0x00  -- tag 12 (12<<3 | 2 = 98 = 0x62), len 0
        assert_eq!(bytes, vec![0x4a, 0x00, 0x62, 0x00]);
    }

    #[test]
    fn canonicalize_envelope_is_deterministic() {
        let env = Envelope {
            message_id: "mid".to_string(),
            source_agent_id: "agent-01".to_string(),
            source_city: "aletheia".to_string(),
            target_topic: "test.topic".to_string(),
            payload: vec![1, 2, 3],
            nonce: vec![0; 16],
            r#type: 6, // HEARTBEAT
            ..Default::default()
        };
        let a = canonicalize_envelope(&env);
        let b = canonicalize_envelope(&env);
        let c = canonicalize_envelope(&env);
        assert_eq!(a, b);
        assert_eq!(b, c);
    }

    #[test]
    fn canonicalize_envelope_excludes_signature() {
        let base = Envelope {
            message_id: "mid".to_string(),
            payload: vec![1],
            nonce: vec![9; 16],
            ..Default::default()
        };
        let mut with_sig = base.clone();
        with_sig.signature = vec![0xff; 64];

        assert_eq!(
            canonicalize_envelope(&base),
            canonicalize_envelope(&with_sig),
            "signature field must not affect canonical bytes"
        );
    }

    #[test]
    fn canonicalize_envelope_changes_with_nonce() {
        let a = Envelope {
            payload: vec![],
            nonce: vec![0; 16],
            ..Default::default()
        };
        let b = Envelope {
            payload: vec![],
            nonce: vec![1; 16],
            ..Default::default()
        };
        assert_ne!(canonicalize_envelope(&a), canonicalize_envelope(&b));
    }

    #[test]
    fn canonicalize_envelope_changes_with_payload() {
        let a = Envelope {
            payload: vec![1],
            nonce: vec![0; 16],
            ..Default::default()
        };
        let b = Envelope {
            payload: vec![2],
            nonce: vec![0; 16],
            ..Default::default()
        };
        assert_ne!(canonicalize_envelope(&a), canonicalize_envelope(&b));
    }

    #[test]
    fn canonicalize_envelope_preserves_causal_link_order() {
        let a = Envelope {
            payload: vec![],
            nonce: vec![0; 16],
            causal_message_ids: vec!["a".to_string(), "b".to_string()],
            ..Default::default()
        };
        let b = Envelope {
            payload: vec![],
            nonce: vec![0; 16],
            causal_message_ids: vec!["b".to_string(), "a".to_string()],
            ..Default::default()
        };
        // Different orderings produce different canonical bytes. This is
        // intentional: causal link order is semantic (first-cause first).
        assert_ne!(canonicalize_envelope(&a), canonicalize_envelope(&b));
    }
}
