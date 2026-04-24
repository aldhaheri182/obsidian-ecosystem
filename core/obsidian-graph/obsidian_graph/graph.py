"""KnowledgeGraph — Neo4j-backed structured knowledge per whitepaper §5.3."""

from __future__ import annotations

import os
from enum import Enum
from typing import Any, Dict, Iterable, List, Optional
from neo4j import AsyncGraphDatabase, AsyncDriver

from obsidian_graph.schemas import Principle, Regime, Signal as SignalNode


class NodeType(str, Enum):
    AGENT = "Agent"
    INSTRUMENT = "Instrument"
    SIGNAL = "Signal"
    ORDER = "Order"
    EVENT = "Event"
    PRINCIPLE = "Principle"
    REGIME = "Regime"
    MEMORY_NODE = "MemoryNode"


class EdgeType(str, Enum):
    CAUSES = "CAUSES"
    CORRELATES_WITH = "CORRELATES_WITH"
    PRECEDES = "PRECEDES"
    CONTRADICTS = "CONTRADICTS"
    PUBLISHED_BY = "PUBLISHED_BY"
    CITES = "CITES"
    BELONGS_TO_CITY = "BELONGS_TO_CITY"


class KnowledgeGraph:
    """Thin async wrapper over Neo4j for the Knowledge Graph.

    Opinionated: every node carries ``schema_version``; every edge carries
    a ``timestamp``; every ``CAUSES`` edge carries ``(confidence, evidence_count,
    p_value)`` per §5.3.
    """

    def __init__(self, uri: Optional[str] = None, auth: Optional[tuple] = None) -> None:
        uri = uri or os.environ.get("NEO4J_URI", "bolt://localhost:17687")
        auth = auth or (
            os.environ.get("NEO4J_USER", "neo4j"),
            os.environ.get("NEO4J_PASSWORD", "obsidian-m1"),
        )
        self._driver: AsyncDriver = AsyncGraphDatabase.driver(uri, auth=auth)

    async def close(self) -> None:
        await self._driver.close()

    # ---- constraints + indexes (run once at M1 bootstrap) ----

    async def ensure_schema(self) -> None:
        """Idempotent schema bootstrap. Run at Mnemosyne boot."""
        stmts = [
            # Uniqueness
            "CREATE CONSTRAINT agent_id IF NOT EXISTS FOR (n:Agent) REQUIRE n.agent_id IS UNIQUE",
            "CREATE CONSTRAINT instrument_symbol IF NOT EXISTS FOR (n:Instrument) REQUIRE n.symbol IS UNIQUE",
            "CREATE CONSTRAINT signal_id IF NOT EXISTS FOR (n:Signal) REQUIRE n.signal_id IS UNIQUE",
            "CREATE CONSTRAINT order_id IF NOT EXISTS FOR (n:Order) REQUIRE n.order_id IS UNIQUE",
            "CREATE CONSTRAINT event_id IF NOT EXISTS FOR (n:Event) REQUIRE n.event_id IS UNIQUE",
            "CREATE CONSTRAINT principle_id IF NOT EXISTS FOR (n:Principle) REQUIRE n.principle_id IS UNIQUE",
            "CREATE CONSTRAINT regime_id IF NOT EXISTS FOR (n:Regime) REQUIRE n.regime_id IS UNIQUE",
            "CREATE CONSTRAINT memnode_id IF NOT EXISTS FOR (n:MemoryNode) REQUIRE n.node_id IS UNIQUE",
            # Searchable indexes
            "CREATE INDEX principle_status IF NOT EXISTS FOR (n:Principle) ON (n.status)",
            "CREATE INDEX signal_timestamp IF NOT EXISTS FOR (n:Signal) ON (n.timestamp)",
            "CREATE INDEX memnode_importance IF NOT EXISTS FOR (n:MemoryNode) ON (n.importance_score)",
        ]
        async with self._driver.session() as session:
            for s in stmts:
                await session.run(s)

    # ---- Principle (the most-used node type) ----

    async def publish_principle(self, p: Principle) -> None:
        """Mint a Principle. If `status=='GOLD'`, this is a Great Library publication."""
        async with self._driver.session() as session:
            await session.run(
                """
                MERGE (n:Principle {principle_id: $principle_id})
                SET n += $props
                """,
                principle_id=p.principle_id,
                props=p.model_dump(mode="json"),
            )

    async def get_principle(self, principle_id: str) -> Optional[Principle]:
        async with self._driver.session() as session:
            r = await session.run(
                "MATCH (n:Principle {principle_id: $id}) RETURN n",
                id=principle_id,
            )
            rec = await r.single()
            if not rec:
                return None
            return Principle(**dict(rec["n"]))

    async def list_gold_nodes(self, limit: int = 100) -> List[Principle]:
        """List all currently-GOLD-status Principles. This is the Great Library read."""
        async with self._driver.session() as session:
            r = await session.run(
                """
                MATCH (n:Principle {status: 'GOLD'})
                RETURN n
                ORDER BY n.published_at DESC
                LIMIT $limit
                """,
                limit=limit,
            )
            out: List[Principle] = []
            async for rec in r:
                out.append(Principle(**dict(rec["n"])))
            return out

    # ---- Causal edges ----

    async def assert_causal(
        self,
        src: str,
        dst: str,
        confidence: float,
        evidence_count: int,
        p_value: float,
    ) -> None:
        """Assert a CAUSES edge. Causal Auditor calls this after a passing audit."""
        async with self._driver.session() as session:
            await session.run(
                """
                MATCH (a {principle_id: $src}), (b {principle_id: $dst})
                MERGE (a)-[r:CAUSES]->(b)
                SET r.confidence = $conf,
                    r.evidence_count = $n,
                    r.p_value = $p,
                    r.asserted_at = datetime()
                """,
                src=src, dst=dst,
                conf=confidence, n=evidence_count, p=p_value,
            )

    # ---- Paradox integration (L38) ----

    async def mark_contradicts(self, a_id: str, b_id: str, status: str = "UNRESOLVED") -> None:
        async with self._driver.session() as session:
            await session.run(
                """
                MATCH (a:Principle {principle_id: $a}), (b:Principle {principle_id: $b})
                MERGE (a)-[r:CONTRADICTS]->(b)
                SET r.resolution_status = $status, r.observed_at = datetime()
                """,
                a=a_id, b=b_id, status=status,
            )

    # ---- Citation lineage (L32 Idea Genealogy) ----

    async def cite(self, citer: str, cited: str) -> None:
        async with self._driver.session() as session:
            await session.run(
                """
                MATCH (a:Principle {principle_id: $citer}), (b:Principle {principle_id: $cited})
                MERGE (a)-[r:CITES]->(b)
                SET r.timestamp = datetime()
                """,
                citer=citer, cited=cited,
            )

    async def lineage(self, principle_id: str, max_depth: int = 10) -> List[Dict[str, Any]]:
        """Walk the CITES ancestry backward to roots — the Idea Genealogy DAG."""
        async with self._driver.session() as session:
            r = await session.run(
                """
                MATCH path = (n:Principle {principle_id: $id})-[:CITES*1..%d]->(ancestor:Principle)
                RETURN DISTINCT ancestor.principle_id AS id, ancestor.title AS title, length(path) AS distance
                ORDER BY distance
                """
                % max_depth,
                id=principle_id,
            )
            return [dict(rec) async for rec in r]
