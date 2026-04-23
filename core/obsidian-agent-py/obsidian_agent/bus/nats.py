"""NATS client wrapper — Python mirror of ``core/obsidian-bus/src/nats.rs``.

Uses ``nats-py 2.8`` for asyncio NATS.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import AsyncIterator, Optional

import nats
from nats.aio.client import Client as NATSClient
from nats.aio.subscription import Subscription as NatsSubscription

from obsidian_agent._proto import envelope_pb2
from obsidian_agent.bus.envelope import EnvelopeBuilder, sign_envelope, verify_envelope
from obsidian_agent.bus.signing import SigningKey, VerificationError, VerifyingKey

log = logging.getLogger(__name__)


@dataclass
class NatsConfig:
    url: str
    agent_id: str
    source_city: str
    creds_path: Optional[str] = None

    @classmethod
    def from_env(cls, agent_id: str, source_city: str) -> NatsConfig:
        return cls(
            url=os.environ.get("NATS_URL", "nats://localhost:4222"),
            agent_id=agent_id,
            source_city=source_city,
            creds_path=os.environ.get("NATS_CREDS_FILE"),
        )


@dataclass
class PublishOpts:
    priority: int = 1  # NORMAL
    correlation_id: str = ""
    causal_links: Optional[list[str]] = None
    schema_version: Optional[str] = None


class VerificationMode:
    """Per-subscription signature verification policy."""

    class NoVerification:
        pass

    @dataclass
    class SinglePublisher:
        verifying_key: VerifyingKey

    @dataclass
    class Registry:
        registry: "PublicKeyRegistry"


class PublicKeyRegistry:
    """Base class for pubkey lookup strategies."""

    def get(self, agent_id: str) -> VerifyingKey | None:
        raise NotImplementedError


class FilesystemRegistry(PublicKeyRegistry):
    """Resolves pubkeys from ``{root}/{agent_id}/signing.pub``.

    Matches the Rust ``FilesystemRegistry``.
    """

    def __init__(self, root: str | os.PathLike):
        self._root = Path(root)
        self._cache: dict[str, VerifyingKey] = {}

    def get(self, agent_id: str) -> VerifyingKey | None:
        cached = self._cache.get(agent_id)
        if cached is not None:
            return cached
        path = self._root / agent_id / "signing.pub"
        if not path.exists():
            return None
        try:
            key = VerifyingKey.load(path)
        except Exception as e:
            log.warning("failed to load pubkey for %s: %s", agent_id, e)
            return None
        self._cache[agent_id] = key
        return key


class NatsClient:
    """Typed NATS client; mirrors the Rust crate's ``NatsClient``."""

    def __init__(self, inner: NATSClient, agent_id: str, source_city: str, signing_key: SigningKey):
        self._inner = inner
        self._agent_id = agent_id
        self._source_city = source_city
        self._signing_key = signing_key
        self._messages_published = 0

    @classmethod
    async def connect(cls, config: NatsConfig, signing_key: SigningKey) -> NatsClient:
        kwargs: dict = {"servers": [config.url], "name": config.agent_id}
        if config.creds_path:
            kwargs["user_credentials"] = config.creds_path
        client = await nats.connect(**kwargs)
        log.info("NATS connected agent_id=%s url=%s", config.agent_id, config.url)
        return cls(client, config.agent_id, config.source_city, signing_key)

    @property
    def agent_id(self) -> str:
        return self._agent_id

    def messages_published(self) -> int:
        return self._messages_published

    def verifying_key(self) -> VerifyingKey:
        return self._signing_key.verifying()

    async def publish(
        self,
        topic: str,
        msg_type: int,
        payload: object,  # a protobuf Message
        opts: PublishOpts | None = None,
    ) -> str:
        """Build envelope, sign, publish. Returns message_id."""
        opts = opts or PublishOpts()
        builder = EnvelopeBuilder(
            msg_type=msg_type,
            target_topic=topic,
            source_agent_id=self._agent_id,
            source_city=self._source_city,
        ).payload_proto(payload).priority(opts.priority)
        if opts.correlation_id:
            builder = builder.correlation_id(opts.correlation_id)
        if opts.causal_links:
            builder = builder.causal_all(opts.causal_links)
        if opts.schema_version:
            builder = builder.schema_version(opts.schema_version)

        env = builder.build()
        message_id = env.message_id
        sign_envelope(env, self._signing_key)
        await self._inner.publish(topic, env.SerializeToString())
        self._messages_published += 1
        return message_id

    async def publish_raw(self, topic: str, data: bytes) -> None:
        """Publish already-serialized bytes. Used only by the Tape Recorder's replay path."""
        await self._inner.publish(topic, data)

    async def subscribe(
        self,
        topic: str,
        verification: object = VerificationMode.NoVerification,
    ) -> "Subscription":
        sub = await self._inner.subscribe(topic)
        if isinstance(verification, type) and verification is VerificationMode.NoVerification:
            log.warning(
                "subscription without signature verification (M0 default) topic=%s", topic
            )
        return Subscription(sub, verification, topic)

    async def flush(self) -> None:
        await self._inner.flush()

    async def close(self) -> None:
        await self._inner.drain()
        await self._inner.close()


class Subscription:
    """Wraps a nats-py subscription, yielding verified Envelopes."""

    def __init__(self, inner: NatsSubscription, verification, topic: str):
        self._inner = inner
        self._verification = verification
        self._topic = topic

    def __aiter__(self) -> AsyncIterator[envelope_pb2.Envelope]:
        return self

    async def __anext__(self) -> envelope_pb2.Envelope:
        while True:
            msg = await self._inner.next_msg(timeout=None)
            env = envelope_pb2.Envelope()
            try:
                env.ParseFromString(msg.data)
            except Exception as e:
                log.warning("dropping undecodable envelope on %s: %s", self._topic, e)
                continue
            if _verify(env, self._verification):
                return env
            # Dropped. Continue loop.

    async def unsubscribe(self) -> None:
        await self._inner.unsubscribe()


def _verify(env: envelope_pb2.Envelope, mode) -> bool:
    """Apply the configured verification policy. Returns True if the message passes."""
    if isinstance(mode, type) and mode is VerificationMode.NoVerification:
        return True
    if isinstance(mode, VerificationMode.SinglePublisher):
        try:
            verify_envelope(env, mode.verifying_key)
            return True
        except VerificationError:
            log.warning("dropping unverified envelope from %s", env.source_agent_id)
            return False
    if isinstance(mode, VerificationMode.Registry):
        vk = mode.registry.get(env.source_agent_id)
        if vk is None:
            log.warning("no public key for %s; dropping envelope", env.source_agent_id)
            return False
        try:
            verify_envelope(env, vk)
            return True
        except VerificationError:
            log.warning("dropping unverified envelope from %s", env.source_agent_id)
            return False
    # Unknown mode — fail closed.
    log.error("unknown verification mode: %r; failing closed", mode)
    return False
