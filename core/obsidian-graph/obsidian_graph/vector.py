"""VectorStore — Qdrant-backed semantic store for reflections, news, rationales."""

from __future__ import annotations

import os
from typing import List, Optional, Sequence

from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import (
    Distance,
    PointStruct,
    VectorParams,
)


class VectorStore:
    """Thin async wrapper over Qdrant for semantic memory.

    Collection convention:
      - reflections — agent daily reflections
      - news        — news/social sentiment items
      - rationales  — signal rationales (per-signal short-form natural language)
      - principles  — titles + abstracts of Gold Nodes
    """

    def __init__(self, url: Optional[str] = None, api_key: Optional[str] = None) -> None:
        url = url or os.environ.get("QDRANT_URL", "http://localhost:16333")
        self._client = AsyncQdrantClient(url=url, api_key=api_key)

    async def close(self) -> None:
        await self._client.close()

    async def ensure_collection(self, name: str, vector_size: int = 1024) -> None:
        existing = await self._client.get_collections()
        if any(c.name == name for c in existing.collections):
            return
        await self._client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )

    async def upsert(
        self,
        collection: str,
        point_id: str,
        vector: Sequence[float],
        payload: Optional[dict] = None,
    ) -> None:
        await self._client.upsert(
            collection_name=collection,
            points=[PointStruct(id=point_id, vector=list(vector), payload=payload or {})],
        )

    async def search(
        self,
        collection: str,
        query: Sequence[float],
        limit: int = 10,
        filter_: Optional[dict] = None,
    ) -> List[dict]:
        res = await self._client.query_points(
            collection_name=collection,
            query=list(query),
            limit=limit,
            query_filter=filter_,
        )
        return [
            {"id": r.id, "score": r.score, "payload": r.payload}
            for r in res.points
        ]
