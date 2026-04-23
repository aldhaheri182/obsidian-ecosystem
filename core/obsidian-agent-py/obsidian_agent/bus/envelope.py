"""Envelope construction, signing, and verification (Python).

Mirrors ``core/obsidian-bus/src/envelope.rs``.
"""

from __future__ import annotations

import os
import time
import uuid

from obsidian_agent._proto import envelope_pb2
from obsidian_agent.bus.canonical import canonicalize_envelope_proto
from obsidian_agent.bus.signing import SigningKey, VerificationError, VerifyingKey

NONCE_LENGTH = 16
ENVELOPE_SCHEMA_VERSION = "1.0.0"


class EnvelopeError(Exception):
    """Base for envelope-related errors."""


class InvalidEnvelope(EnvelopeError):
    """Raised when validate_pre_sign fails."""


class EnvelopeBuilder:
    """Mirrors ``core/obsidian-bus/src/envelope.rs::EnvelopeBuilder``."""

    def __init__(
        self,
        msg_type: int,
        target_topic: str,
        source_agent_id: str,
        source_city: str,
    ):
        self._message_id: str | None = None
        self._correlation_id = ""
        self._source_agent_id = source_agent_id
        self._source_city = source_city
        self._target_topic = target_topic
        self._timestamp_ns: int | None = None
        self._priority = 1  # PRIORITY_NORMAL
        self._msg_type = msg_type
        self._payload = b""
        self._causal_message_ids: list[str] = []
        self._schema_version = ENVELOPE_SCHEMA_VERSION
        self._nonce: bytes | None = None

    def message_id(self, mid: str) -> EnvelopeBuilder:
        self._message_id = mid
        return self

    def correlation_id(self, cid: str) -> EnvelopeBuilder:
        self._correlation_id = cid
        return self

    def timestamp_ns(self, ns: int) -> EnvelopeBuilder:
        self._timestamp_ns = ns
        return self

    def priority(self, p: int) -> EnvelopeBuilder:
        self._priority = p
        return self

    def payload(self, data: bytes) -> EnvelopeBuilder:
        self._payload = data
        return self

    def payload_proto(self, msg) -> EnvelopeBuilder:
        self._payload = msg.SerializeToString()
        return self

    def causal(self, mid: str) -> EnvelopeBuilder:
        self._causal_message_ids.append(mid)
        return self

    def causal_all(self, ids: list[str]) -> EnvelopeBuilder:
        self._causal_message_ids = list(ids)
        return self

    def schema_version(self, v: str) -> EnvelopeBuilder:
        self._schema_version = v
        return self

    def nonce(self, n: bytes) -> EnvelopeBuilder:
        self._nonce = n
        return self

    def build(self) -> envelope_pb2.Envelope:
        env = envelope_pb2.Envelope()
        env.message_id = self._message_id or str(uuid.uuid4())
        env.correlation_id = self._correlation_id
        env.source_agent_id = self._source_agent_id
        env.source_city = self._source_city
        env.target_topic = self._target_topic

        ts_ns = self._timestamp_ns if self._timestamp_ns is not None else time.time_ns()
        env.timestamp.seconds = ts_ns // 1_000_000_000
        env.timestamp.nanos = ts_ns % 1_000_000_000

        env.priority = self._priority
        env.type = self._msg_type
        env.payload = self._payload
        env.causal_message_ids.extend(self._causal_message_ids)
        env.schema_version = self._schema_version
        if self._nonce is not None:
            env.nonce = self._nonce
        # signature left empty
        return env


def validate_pre_sign(env: envelope_pb2.Envelope) -> None:
    if not env.message_id:
        raise InvalidEnvelope("message_id is empty")
    if not env.source_agent_id:
        raise InvalidEnvelope("source_agent_id is empty")
    if not env.target_topic:
        raise InvalidEnvelope("target_topic is empty")
    if env.type == 0:
        raise InvalidEnvelope("type is UNSPECIFIED")
    if not env.HasField("timestamp"):
        raise InvalidEnvelope("timestamp is missing")
    if not env.schema_version:
        raise InvalidEnvelope("schema_version is empty")
    if env.signature:
        raise InvalidEnvelope(
            "signature already set; sign_envelope must be called on an unsigned envelope"
        )


def sign_envelope(env: envelope_pb2.Envelope, key: SigningKey) -> envelope_pb2.Envelope:
    """Sign an envelope in place. Returns the same envelope."""
    validate_pre_sign(env)
    if not env.nonce:
        env.nonce = os.urandom(NONCE_LENGTH)
    elif len(env.nonce) != NONCE_LENGTH:
        raise InvalidEnvelope(f"nonce must be {NONCE_LENGTH} bytes, got {len(env.nonce)}")
    canonical = canonicalize_envelope_proto(env)
    env.signature = key.sign(canonical)
    return env


def verify_envelope(env: envelope_pb2.Envelope, key: VerifyingKey) -> None:
    """Verify an envelope signature. Raises ``VerificationError`` on failure."""
    if len(env.nonce) != NONCE_LENGTH:
        raise InvalidEnvelope(f"nonce must be {NONCE_LENGTH} bytes, got {len(env.nonce)}")
    if not env.signature:
        raise InvalidEnvelope("signature is empty")
    canonical = canonicalize_envelope_proto(env)
    key.verify(canonical, env.signature)
