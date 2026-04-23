// ============================================================================
// core/obsidian-bus/examples/emit_vectors.rs
//
// Authorized by: user instruction — cross-language test harness ships in
// obsidian-bus; ADR 0003.
//
// Emit the canonical test vectors used by both Rust and Python tests.
//
// Usage:
//   cargo run --example emit-vectors --manifest-path core/obsidian-bus/Cargo.toml \
//     > core/obsidian-bus/test-vectors/envelopes.json
//
// The JSON file is committed to the repository. Regenerating it must be a
// deliberate, reviewable commit — any diff indicates a canonicalizer change
// (requires ADR) or a new vector (expected during development).
// ============================================================================

use obsidian_bus::canonical::canonicalize_envelope;
use obsidian_bus::envelope::ENVELOPE_SCHEMA_VERSION;
use obsidian_bus::proto::{Envelope, MessageType, Priority};
use prost::Message as ProstMessage;
use prost_types::Timestamp;
use serde::Serialize;

#[derive(Serialize)]
struct VectorsFile {
    version: String,
    schema_version: String,
    generated_by: String,
    vectors: Vec<VectorEntry>,
}

#[derive(Serialize)]
struct VectorEntry {
    name: String,
    description: String,
    envelope_proto_hex: String,
    canonical_hex: String,
}

fn hex(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        s.push_str(&format!("{:02x}", b));
    }
    s
}

fn vector(name: &str, description: &str, env: Envelope) -> VectorEntry {
    let canonical = canonicalize_envelope(&env);
    let proto_bytes = env.encode_to_vec();
    VectorEntry {
        name: name.to_string(),
        description: description.to_string(),
        envelope_proto_hex: hex(&proto_bytes),
        canonical_hex: hex(&canonical),
    }
}

fn main() {
    let vectors = vec![
        vector(
            "empty_envelope",
            "Fully default Envelope. Only the always-present bytes fields \
             (payload, nonce) appear in canonical output.",
            Envelope::default(),
        ),
        vector(
            "zero_nonce_only",
            "Only nonce populated (16 zero bytes). Proves nonce length \
             prefix is emitted even for all-zero nonce.",
            Envelope {
                nonce: vec![0u8; 16],
                ..Default::default()
            },
        ),
        vector(
            "minimal_heartbeat",
            "A realistic minimal heartbeat envelope. All identifying fields \
             set, no payload, nonce explicit.",
            Envelope {
                message_id: "0192bba0-1f4a-7e9a-bfaa-000000000001".into(),
                source_agent_id: "momentum-signal-01".into(),
                source_city: "aletheia".into(),
                target_topic: "system.heartbeat.momentum-signal-01".into(),
                timestamp: Some(Timestamp { seconds: 1_700_000_000, nanos: 0 }),
                priority: Priority::Normal as i32,
                r#type: MessageType::Heartbeat as i32,
                schema_version: "1.0.0".into(),
                nonce: vec![0u8; 16],
                ..Default::default()
            },
        ),
        vector(
            "full_signal",
            "A Signal envelope with every canonicalized field populated, \
             including two causal links and a non-empty signature (which \
             must be stripped by canonicalization).",
            Envelope {
                message_id: "0192bba2-1f4a-7e9a-bfaa-0123456789ab".into(),
                correlation_id: "0192bba2-1f4a-7e9a-bfaa-abcdef123456".into(),
                source_agent_id: "momentum-signal-01".into(),
                source_city: "aletheia".into(),
                target_topic: "aletheia.trading_floor.momentum.alpha".into(),
                timestamp: Some(Timestamp { seconds: 1_712_000_000, nanos: 123_456_789 }),
                priority: Priority::Normal as i32,
                r#type: MessageType::Signal as i32,
                payload: vec![0xde, 0xad, 0xbe, 0xef],
                causal_message_ids: vec![
                    "0192bba0-1111-7e9a-bfaa-000000000001".into(),
                    "0192bba0-1111-7e9a-bfaa-000000000002".into(),
                ],
                schema_version: "1.0.0".into(),
                nonce: (0..16u8).collect(),
                signature: vec![0xaa; 64], // intentionally set to prove stripped
            },
        ),
        vector(
            "large_payload_300_bytes",
            "Proves multi-byte length-prefix encoding for payloads > 127 bytes.",
            Envelope {
                payload: vec![0x42; 300],
                nonce: vec![0u8; 16],
                ..Default::default()
            },
        ),
    ];

    let file = VectorsFile {
        version: "1".into(),
        schema_version: ENVELOPE_SCHEMA_VERSION.into(),
        generated_by: "cargo run --example emit-vectors".into(),
        vectors,
    };

    println!(
        "{}",
        serde_json::to_string_pretty(&file).expect("vectors JSON serialization failed")
    );
}
