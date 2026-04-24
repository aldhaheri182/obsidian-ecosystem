"""Smoke test for obsidian-graph against the running M1 stack.

Requires `docker compose up -d postgres neo4j qdrant minio` before running.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import uuid

import pytest

from obsidian_graph import (
    BlobArchive,
    KnowledgeGraph,
    NodeType,
    Principle,
    VectorStore,
)


@pytest.mark.asyncio
async def test_knowledge_graph_principle_roundtrip():
    kg = KnowledgeGraph()
    try:
        await kg.ensure_schema()
        pid = f"test-{uuid.uuid4().hex[:8]}"
        p = Principle(
            principle_id=pid,
            title="Test Principle — momentum decay in high VIX",
            abstract="Momentum signals lose 60% of their edge when VIX > 30.",
            confidence=0.85,
            status="GOLD",
            published_at=dt.datetime.now(dt.UTC),
            deflated_sharpe=1.4,
            pbo=0.12,
            p_value=0.001,
            keywords=["momentum", "VIX", "regime"],
        )
        await kg.publish_principle(p)
        got = await kg.get_principle(pid)
        assert got is not None
        assert got.title == p.title
        gold = await kg.list_gold_nodes(limit=10)
        assert any(g.principle_id == pid for g in gold)
    finally:
        await kg.close()


@pytest.mark.asyncio
async def test_vector_store_roundtrip():
    vs = VectorStore()
    try:
        await vs.ensure_collection("obsidian-smoke-vectors", vector_size=8)
        point_id = str(uuid.uuid4())
        hex_id = point_id.replace("-", "")
        uniq = [int(hex_id[i : i + 2], 16) / 255.0 for i in range(0, 16, 2)]
        await vs.upsert(
            "obsidian-smoke-vectors",
            point_id=point_id,
            vector=uniq,
            payload={"agent_id": "momentum-signal-01", "topic": "VIX spike"},
        )
        hits = await vs.search("obsidian-smoke-vectors", query=uniq, limit=1)
        assert hits and hits[0]["id"] == point_id
    finally:
        await vs.close()


def test_blob_archive_roundtrip():
    ba = BlobArchive()
    bucket = "obsidian-smoke-test"
    key = f"hello-{uuid.uuid4().hex[:8]}.txt"
    ba.put_bytes(bucket, key, b"hello obsidian")
    got = ba.get_bytes(bucket, key)
    assert got == b"hello obsidian"
    keys = ba.list_keys(bucket)
    assert key in keys
