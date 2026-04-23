// ============================================================================
// core/obsidian-bus/src/envelope.rs
//
// Authorized by: M0 plan §"Build order" step 2; spec Part 4.2.
//
// Envelope construction, signing, and verification.
//
// Public helpers:
//   - EnvelopeBuilder: ergonomic construction from the typical fields agents
//     know. Handles UUID v7 message_id, fresh nonce, current timestamp.
//   - sign_envelope: populate nonce (if empty) and signature fields on an
//     already-built Envelope.
//   - verify_envelope: check that the signature over the canonical bytes is
//     valid for a given VerifyingKey.
//
// An agent's publish path is always:
//
//   let env = EnvelopeBuilder::new(msg_type, topic, agent_id, city)
//               .payload(bytes)
//               .schema_version("1.0.0")
//               .build();
//   let signed = sign_envelope(env, &signing_key)?;
//   let wire = signed.encode_to_vec();
//   nats.publish(topic, wire).await?;
// ============================================================================

//! Envelope construction, signing, and verification.

use crate::canonical::canonicalize_envelope;
use crate::error::{BusError, Result};
use crate::proto::{Envelope, MessageType, Priority};
use crate::signing::{SigningKey, VerifyingKey};
use prost_types::Timestamp;
use uuid::Uuid;

/// Length of the envelope nonce in bytes.
///
/// 16 bytes is sufficient for collision resistance over the lifetime of any
/// reasonable session at any reasonable message rate (2^64 messages before a
/// 50% chance of nonce collision).
pub const NONCE_LENGTH: usize = 16;

/// Current envelope schema version. Bumped when the canonicalization scheme
/// or the set of required fields changes in a way that breaks older
/// verifiers. NOT bumped for payload schema changes.
pub const ENVELOPE_SCHEMA_VERSION: &str = "1.0.0";

/// Ergonomic builder for `Envelope`. Call `.build()` to produce an unsigned
/// envelope (signature empty). Pass it to `sign_envelope` to sign.
#[derive(Debug, Clone)]
pub struct EnvelopeBuilder {
    message_id: Option<String>,
    correlation_id: String,
    source_agent_id: String,
    source_city: String,
    target_topic: String,
    timestamp: Option<Timestamp>,
    priority: Priority,
    msg_type: MessageType,
    payload: Vec<u8>,
    causal_message_ids: Vec<String>,
    schema_version: String,
    nonce: Option<Vec<u8>>,
}

impl EnvelopeBuilder {
    /// Start a new builder. Required identifying fields are set up front so
    /// the most common call site is a single chain.
    pub fn new(
        msg_type: MessageType,
        target_topic: impl Into<String>,
        source_agent_id: impl Into<String>,
        source_city: impl Into<String>,
    ) -> Self {
        Self {
            message_id: None,
            correlation_id: String::new(),
            source_agent_id: source_agent_id.into(),
            source_city: source_city.into(),
            target_topic: target_topic.into(),
            timestamp: None,
            priority: Priority::Normal,
            msg_type,
            payload: Vec::new(),
            causal_message_ids: Vec::new(),
            schema_version: ENVELOPE_SCHEMA_VERSION.to_string(),
            nonce: None,
        }
    }

    /// Override the message_id. Only useful for tests / deterministic replay.
    /// In normal use the builder generates a UUID v7 at build time.
    pub fn message_id(mut self, id: impl Into<String>) -> Self {
        self.message_id = Some(id.into());
        self
    }

    /// Set the correlation_id for request/response chains.
    pub fn correlation_id(mut self, id: impl Into<String>) -> Self {
        self.correlation_id = id.into();
        self
    }

    /// Override the wall-clock timestamp. Defaults to now.
    pub fn timestamp(mut self, ts: Timestamp) -> Self {
        self.timestamp = Some(ts);
        self
    }

    /// Set the priority. Default is NORMAL.
    pub fn priority(mut self, p: Priority) -> Self {
        self.priority = p;
        self
    }

    /// Set the payload bytes. Default is empty.
    pub fn payload(mut self, payload: impl Into<Vec<u8>>) -> Self {
        self.payload = payload.into();
        self
    }

    /// Set a protobuf message as the payload. Convenience wrapper.
    pub fn payload_proto<M: prost::Message>(mut self, msg: &M) -> Self {
        self.payload = msg.encode_to_vec();
        self
    }

    /// Add one causal predecessor message_id.
    pub fn causal(mut self, message_id: impl Into<String>) -> Self {
        self.causal_message_ids.push(message_id.into());
        self
    }

    /// Replace all causal predecessors at once.
    pub fn causal_all(mut self, ids: Vec<String>) -> Self {
        self.causal_message_ids = ids;
        self
    }

    /// Override the schema_version. Defaults to `ENVELOPE_SCHEMA_VERSION`.
    pub fn schema_version(mut self, v: impl Into<String>) -> Self {
        self.schema_version = v.into();
        self
    }

    /// Override the nonce. Only useful for tests / deterministic replay.
    /// In normal use `sign_envelope` populates a fresh nonce.
    pub fn nonce(mut self, nonce: impl Into<Vec<u8>>) -> Self {
        self.nonce = Some(nonce.into());
        self
    }

    /// Produce an `Envelope` with signature left empty. The nonce is set
    /// only if `.nonce(...)` was called; otherwise `sign_envelope` will
    /// generate one at signing time.
    pub fn build(self) -> Envelope {
        let message_id = self.message_id.unwrap_or_else(|| Uuid::now_v7().to_string());
        let timestamp = self.timestamp.unwrap_or_else(current_timestamp);

        Envelope {
            message_id,
            correlation_id: self.correlation_id,
            source_agent_id: self.source_agent_id,
            source_city: self.source_city,
            target_topic: self.target_topic,
            timestamp: Some(timestamp),
            priority: self.priority as i32,
            r#type: self.msg_type as i32,
            payload: self.payload,
            causal_message_ids: self.causal_message_ids,
            schema_version: self.schema_version,
            nonce: self.nonce.unwrap_or_default(),
            signature: Vec::new(),
        }
    }
}

/// Produce a `Timestamp` from the current wall-clock.
pub fn current_timestamp() -> Timestamp {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("system clock is before 1970");
    Timestamp {
        seconds: now.as_secs() as i64,
        nanos: now.subsec_nanos() as i32,
    }
}

/// Validate an envelope *before* signing. Publication-time check.
///
/// Rules (from spec Part 4.2 and M0 plan):
///   - message_id, source_agent_id, target_topic must be non-empty.
///   - type must not be UNSPECIFIED (0).
///   - timestamp must be set.
///   - schema_version must be non-empty.
///   - signature must be empty (we are about to compute it).
pub fn validate_pre_sign(env: &Envelope) -> Result<()> {
    if env.message_id.is_empty() {
        return Err(BusError::InvalidEnvelope("message_id is empty".into()));
    }
    if env.source_agent_id.is_empty() {
        return Err(BusError::InvalidEnvelope("source_agent_id is empty".into()));
    }
    if env.target_topic.is_empty() {
        return Err(BusError::InvalidEnvelope("target_topic is empty".into()));
    }
    if env.r#type == MessageType::Unspecified as i32 {
        return Err(BusError::InvalidEnvelope("type is UNSPECIFIED".into()));
    }
    if env.timestamp.is_none() {
        return Err(BusError::InvalidEnvelope("timestamp is missing".into()));
    }
    if env.schema_version.is_empty() {
        return Err(BusError::InvalidEnvelope("schema_version is empty".into()));
    }
    if !env.signature.is_empty() {
        return Err(BusError::InvalidEnvelope(
            "signature already set; sign_envelope must be called on an unsigned envelope".into(),
        ));
    }
    Ok(())
}

/// Sign an envelope in place.
///
/// Steps:
///   1. Validate the envelope (fail fast on contract violations).
///   2. If nonce is empty, populate it with 16 fresh random bytes. If nonce
///      is set (e.g. set by `EnvelopeBuilder::nonce` in a test), leave it.
///   3. Canonicalize fields 1-12.
///   4. Sign the canonical bytes with the provided `SigningKey`.
///   5. Write the 64-byte signature to field 13.
///
/// Returns the signed envelope.
pub fn sign_envelope(mut env: Envelope, key: &SigningKey) -> Result<Envelope> {
    validate_pre_sign(&env)?;

    if env.nonce.is_empty() {
        use rand::RngCore;
        let mut buf = [0u8; NONCE_LENGTH];
        rand::rngs::OsRng.fill_bytes(&mut buf);
        env.nonce = buf.to_vec();
    } else if env.nonce.len() != NONCE_LENGTH {
        return Err(BusError::InvalidEnvelope(format!(
            "nonce must be {} bytes, got {}",
            NONCE_LENGTH,
            env.nonce.len()
        )));
    }

    let canonical = canonicalize_envelope(&env);
    let signature = key.sign(&canonical);
    env.signature = signature;
    Ok(env)
}

/// Verify a signed envelope against a known public key.
///
/// Returns Ok(()) iff:
///   - signature length is correct,
///   - signature verifies over canonicalize_envelope(env) under `key`,
///   - nonce length is 16.
///
/// The caller is responsible for selecting the correct `VerifyingKey` (usually
/// via a `PublicKeyRegistry` keyed on `env.source_agent_id`).
pub fn verify_envelope(env: &Envelope, key: &VerifyingKey) -> Result<()> {
    if env.nonce.len() != NONCE_LENGTH {
        return Err(BusError::InvalidEnvelope(format!(
            "nonce must be {} bytes, got {}",
            NONCE_LENGTH,
            env.nonce.len()
        )));
    }
    if env.signature.is_empty() {
        return Err(BusError::InvalidEnvelope("signature is empty".into()));
    }
    let canonical = canonicalize_envelope(env);
    match key.verify(&canonical, &env.signature) {
        Ok(()) => Ok(()),
        Err(_) => Err(BusError::VerificationFailed {
            message_id: env.message_id.clone(),
            source_agent_id: env.source_agent_id.clone(),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_env() -> Envelope {
        EnvelopeBuilder::new(
            MessageType::Heartbeat,
            "system.heartbeat.agent-01",
            "agent-01",
            "aletheia",
        )
        .payload(b"hello".to_vec())
        .build()
    }

    #[test]
    fn builder_fills_message_id_timestamp_and_schema_version() {
        let env = sample_env();
        assert!(!env.message_id.is_empty());
        assert!(env.timestamp.is_some());
        assert_eq!(env.schema_version, ENVELOPE_SCHEMA_VERSION);
    }

    #[test]
    fn builder_leaves_nonce_empty_for_signer() {
        let env = sample_env();
        assert!(env.nonce.is_empty());
    }

    #[test]
    fn sign_populates_nonce_and_signature() {
        let key = SigningKey::generate();
        let signed = sign_envelope(sample_env(), &key).unwrap();
        assert_eq!(signed.nonce.len(), NONCE_LENGTH);
        assert_eq!(signed.signature.len(), ed25519_dalek::SIGNATURE_LENGTH);
    }

    #[test]
    fn sign_then_verify_succeeds() {
        let key = SigningKey::generate();
        let vk = key.verifying();
        let signed = sign_envelope(sample_env(), &key).unwrap();
        verify_envelope(&signed, &vk).unwrap();
    }

    #[test]
    fn verify_rejects_tampered_payload() {
        let key = SigningKey::generate();
        let vk = key.verifying();
        let mut signed = sign_envelope(sample_env(), &key).unwrap();
        signed.payload.push(0x42);
        let err = verify_envelope(&signed, &vk).unwrap_err();
        matches!(err, BusError::VerificationFailed { .. });
    }

    #[test]
    fn verify_rejects_tampered_nonce() {
        let key = SigningKey::generate();
        let vk = key.verifying();
        let mut signed = sign_envelope(sample_env(), &key).unwrap();
        signed.nonce[0] ^= 0x01;
        let err = verify_envelope(&signed, &vk).unwrap_err();
        matches!(err, BusError::VerificationFailed { .. });
    }

    #[test]
    fn verify_rejects_wrong_public_key() {
        let key_a = SigningKey::generate();
        let key_b = SigningKey::generate();
        let signed = sign_envelope(sample_env(), &key_a).unwrap();
        let err = verify_envelope(&signed, &key_b.verifying()).unwrap_err();
        matches!(err, BusError::VerificationFailed { .. });
    }

    #[test]
    fn validate_pre_sign_catches_missing_fields() {
        // empty type
        let mut env = sample_env();
        env.r#type = 0;
        assert!(validate_pre_sign(&env).is_err());

        // empty source_agent_id
        let mut env = sample_env();
        env.source_agent_id = String::new();
        assert!(validate_pre_sign(&env).is_err());

        // non-empty signature (already signed)
        let mut env = sample_env();
        env.signature = vec![0; 64];
        assert!(validate_pre_sign(&env).is_err());
    }

    #[test]
    fn fresh_nonces_differ_between_signs() {
        let key = SigningKey::generate();
        let a = sign_envelope(sample_env(), &key).unwrap();
        let b = sign_envelope(sample_env(), &key).unwrap();
        assert_ne!(a.nonce, b.nonce);
        assert_ne!(a.signature, b.signature);
    }

    #[test]
    fn deterministic_signing_with_fixed_nonce() {
        // When the nonce is provided up-front (e.g. for test vectors), signing
        // is deterministic as a function of (key, envelope-without-signature).
        let key = SigningKey::generate();
        let env = EnvelopeBuilder::new(
            MessageType::Heartbeat,
            "system.heartbeat.agent-01",
            "agent-01",
            "aletheia",
        )
        .message_id("00000000-0000-0000-0000-000000000000")
        .nonce(vec![0u8; NONCE_LENGTH])
        .build();
        let a = sign_envelope(env.clone(), &key).unwrap();
        let b = sign_envelope(env, &key).unwrap();
        assert_eq!(a.signature, b.signature);
    }

    #[test]
    fn rejects_wrong_nonce_length() {
        let key = SigningKey::generate();
        let env = EnvelopeBuilder::new(
            MessageType::Heartbeat,
            "system.heartbeat.agent-01",
            "agent-01",
            "aletheia",
        )
        .nonce(vec![0u8; 8])
        .build();
        assert!(sign_envelope(env, &key).is_err());
    }
}
