"""obsidian_agent.bus — envelope, signing, NATS."""

from obsidian_agent.bus.canonical import (
    EnvelopeFields,
    canonicalize_envelope,
    canonicalize_envelope_proto,
    canonicalize_timestamp,
)
from obsidian_agent.bus.envelope import (
    ENVELOPE_SCHEMA_VERSION,
    NONCE_LENGTH,
    EnvelopeBuilder,
    EnvelopeError,
    InvalidEnvelope,
    sign_envelope,
    validate_pre_sign,
    verify_envelope,
)
from obsidian_agent.bus.nats import (
    FilesystemRegistry,
    NatsClient,
    NatsConfig,
    PublicKeyRegistry,
    PublishOpts,
    Subscription,
    VerificationMode,
)
from obsidian_agent.bus.signing import (
    KEY_LENGTH,
    SIGNATURE_LENGTH,
    SigningKey,
    VerificationError,
    VerifyingKey,
)

__all__ = [
    "ENVELOPE_SCHEMA_VERSION",
    "EnvelopeBuilder",
    "EnvelopeError",
    "EnvelopeFields",
    "FilesystemRegistry",
    "InvalidEnvelope",
    "KEY_LENGTH",
    "NatsClient",
    "NatsConfig",
    "NONCE_LENGTH",
    "PublicKeyRegistry",
    "PublishOpts",
    "SIGNATURE_LENGTH",
    "SigningKey",
    "Subscription",
    "VerificationError",
    "VerificationMode",
    "VerifyingKey",
    "canonicalize_envelope",
    "canonicalize_envelope_proto",
    "canonicalize_timestamp",
    "sign_envelope",
    "validate_pre_sign",
    "verify_envelope",
]
