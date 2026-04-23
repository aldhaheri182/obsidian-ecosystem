// ============================================================================
// core/obsidian-bus/src/error.rs
//
// Authorized by: M0 plan §"Build order" step 2.
// ============================================================================

//! Error types for the obsidian-bus crate.

use thiserror::Error;

/// All errors that can arise from `obsidian-bus`.
///
/// Every public API of this crate returns `Result<T, BusError>` (aliased as
/// `crate::Result<T>`). Downstream crates should bubble these up without
/// wrapping where possible — the variants are already categorized.
#[derive(Debug, Error)]
pub enum BusError {
    /// The envelope failed pre-sign validation — a required field was empty
    /// or malformed (e.g. missing message_id, wrong nonce length, type
    /// unspecified).
    #[error("envelope validation failed: {0}")]
    InvalidEnvelope(String),

    /// Protobuf encode/decode failure.
    #[error("protobuf encode failed: {0}")]
    ProtoEncode(#[from] prost::EncodeError),

    /// Protobuf decode failure.
    #[error("protobuf decode failed: {0}")]
    ProtoDecode(#[from] prost::DecodeError),

    /// Ed25519 signing failure. In practice this means the private key was
    /// mishandled; `ed25519-dalek`'s signing is infallible with a valid key.
    #[error("signing failed: {0}")]
    Signing(String),

    /// Signature verification failed. This is the expected failure mode for
    /// tampered messages; agents SHALL NOT log the envelope payload at error
    /// level in this branch, only the source_agent_id + message_id.
    #[error("signature verification failed for message {message_id} from {source_agent_id}")]
    VerificationFailed {
        /// UUID v7 of the message that failed verification.
        message_id: String,
        /// Claimed source agent of the message.
        source_agent_id: String,
    },

    /// The signer's public key could not be found in the configured registry.
    /// Only raised when VerificationMode is not NoVerification.
    #[error("no public key registered for agent_id '{0}'")]
    UnknownPublicKey(String),

    /// NATS connection or I/O failure.
    #[error("nats I/O error: {0}")]
    Nats(String),

    /// NATS subscription closed unexpectedly.
    #[error("subscription closed")]
    SubscriptionClosed,

    /// I/O error when loading or saving keypairs.
    #[error("keypair I/O error: {0}")]
    KeypairIo(#[from] std::io::Error),

    /// Keypair bytes were malformed.
    #[error("keypair malformed: {0}")]
    MalformedKeypair(String),
}

/// Crate-local `Result` alias.
pub type Result<T> = std::result::Result<T, BusError>;

impl From<async_nats::ConnectError> for BusError {
    fn from(e: async_nats::ConnectError) -> Self {
        BusError::Nats(e.to_string())
    }
}

impl From<async_nats::PublishError> for BusError {
    fn from(e: async_nats::PublishError) -> Self {
        BusError::Nats(e.to_string())
    }
}

impl From<async_nats::SubscribeError> for BusError {
    fn from(e: async_nats::SubscribeError) -> Self {
        BusError::Nats(e.to_string())
    }
}

impl From<ed25519_dalek::SignatureError> for BusError {
    fn from(e: ed25519_dalek::SignatureError) -> Self {
        BusError::Signing(e.to_string())
    }
}
