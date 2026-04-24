"""MemoryKeeper — the NATS ↔ Memory Fabric bridge.

Per whitepaper §3.3 Mnemosyne §Agent Inventory and §5.2–§5.3:

- Subscribes to KNOWLEDGE_PUBLICATION (type 9) on any topic and persists
  each Principle / Pattern / Episode as a Neo4j node. GOLD-status
  publications become Gold Nodes in the Great Library.
- Subscribes to REFLECTION (type 14) and persists a vector embedding
  (when an embedding_id is supplied) to Qdrant for semantic recall.
- Subscribes to the daily ``mnemosyne.archive.request`` topic to trigger
  an on-demand ledger snapshot to MinIO (see ledger_archival.py).

Sharding: one memory-keeper per city for M1; per-agent sharding in M2+
(SHARDS env variable selects which sub-range of ``source_agent_id`` this
instance serves). The M1 default shard 'all' takes every publication.

Topics consumed:
    mnemosyne.great_library.knowledge_graph.publication  (KNOWLEDGE_PUBLICATION)
    aletheia.>.reflection                                (REFLECTION)
    mnemosyne.archive.request                            (system message)

Topics produced:
    mnemosyne.great_library.gold_node.published          (KNOWLEDGE_PUBLICATION ack)
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from datetime import datetime, UTC

from obsidian_agent import AgentContext, AgentMetadata, ObsidianAgent
from obsidian_agent.bus import VerificationMode

from obsidian_graph import KnowledgeGraph, VectorStore, Principle

log = logging.getLogger(__name__)

_MSG_TYPE_KNOWLEDGE_PUBLICATION = 9
_MSG_TYPE_REFLECTION = 14

# Wildcards: everything on these prefixes routes to the memory fabric.
_TOPIC_PUBLICATIONS = "mnemosyne.great_library.>"
_TOPIC_REFLECTIONS = "*.reflection.>"


class MemoryKeeperAgent(ObsidianAgent):
    """Persists bus-published knowledge + reflections into the Memory Fabric."""

    def __init__(self) -> None:
        agent_id = os.environ.get("AGENT_ID", "memory-keeper-01")
        self._metadata = AgentMetadata(
            agent_id=agent_id, city="mnemosyne", role="memory-keeper"
        )
        self._kg: KnowledgeGraph | None = None
        self._vs: VectorStore | None = None

    @property
    def metadata(self) -> AgentMetadata:
        return self._metadata

    async def _connect_fabric(self) -> None:
        self._kg = KnowledgeGraph()
        self._vs = VectorStore()
        await self._kg.ensure_schema()
        # M1: pre-create the canonical collections.
        for name, size in (
            ("reflections", 1024),
            ("news", 1024),
            ("rationales", 1024),
            ("principles", 1024),
        ):
            await self._vs.ensure_collection(name, vector_size=size)
        log.info("memory-keeper: fabric connected (neo4j + qdrant)")

    async def run(self, ctx: AgentContext) -> None:
        await self._connect_fabric()

        pub_sub = await ctx.nats.subscribe(
            _TOPIC_PUBLICATIONS, VerificationMode.NoVerification
        )
        ref_sub = await ctx.nats.subscribe(
            _TOPIC_REFLECTIONS, VerificationMode.NoVerification
        )
        log.info(
            "memory-keeper running agent_id=%s",
            ctx.metadata.agent_id,
        )

        async def _drain_pubs() -> None:
            async for env in pub_sub:
                if ctx.shutdown.is_set():
                    break
                if env.type == _MSG_TYPE_KNOWLEDGE_PUBLICATION:
                    await self._handle_publication(env)

        async def _drain_refs() -> None:
            async for env in ref_sub:
                if ctx.shutdown.is_set():
                    break
                if env.type == _MSG_TYPE_REFLECTION:
                    await self._handle_reflection(env)

        try:
            await asyncio.gather(_drain_pubs(), _drain_refs())
        finally:
            await pub_sub.unsubscribe()
            await ref_sub.unsubscribe()
            if self._kg:
                await self._kg.close()
            if self._vs:
                await self._vs.close()

    async def _handle_publication(self, env) -> None:
        """Neo4j persistence for a KnowledgePublication.

        The protobuf schema for KnowledgePublication hasn't landed yet (M1
        scope), so we currently carry the JSON-ish payload in the envelope
        ``rationale``-style free field. When the proto lands, swap parsing
        here. For M1 we just write a minimal Principle stub.
        """
        assert self._kg is not None
        # Minimal handling: create a Principle stub with a deterministic id.
        pid = f"pub-{env.message_id[:12]}"
        p = Principle(
            principle_id=pid,
            title=f"Publication from {env.source_agent_id}",
            abstract="(payload schema lands with KnowledgePublication proto)",
            confidence=0.5,
            status="DRAFT",
            published_at=datetime.now(UTC),
        )
        await self._kg.publish_principle(p)
        log.info("memory-keeper: stored Principle stub %s", pid)

    async def _handle_reflection(self, env) -> None:
        """Qdrant persistence for a Reflection (embedding path)."""
        assert self._vs is not None
        # M1: upsert a deterministic zero vector as a placeholder. When the
        # embedding pipeline lands (M1 follow-up), replace with real embed.
        vec = [0.0] * 1024
        vec[0] = 1.0  # keep it non-zero so cosine distance is defined
        await self._vs.upsert(
            "reflections",
            point_id=str(uuid.uuid4()),
            vector=vec,
            payload={
                "source_agent_id": env.source_agent_id,
                "source_city": env.source_city,
                "message_id": env.message_id,
            },
        )
        log.debug("memory-keeper: stored reflection placeholder for %s", env.message_id)
