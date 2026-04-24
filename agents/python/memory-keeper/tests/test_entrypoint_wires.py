"""Regression test for the M1.0 supervisor wiring bug.

Pre-fix the entrypoint called ``Supervisor(cfg, [spec])`` against a
``Supervisor.__init__(config=None)`` signature, raising TypeError at boot.
The fix uses ``Supervisor(cfg).register(spec)``. This test guards that
contract by importing the entrypoint module and constructing the same
supervisor it would build in production, asserting no TypeError and
exactly one registered spec.

Hermetic: no NATS, no Neo4j, no Qdrant, no MinIO connections are made.
"""

from __future__ import annotations

import importlib
from pathlib import Path

from obsidian_agent.supervisor import (
    AgentSpec,
    SubscriptionPolicy,
    Supervisor,
    SupervisorConfig,
)
from obsidian_agent.metadata import AgentMetadata

from memory_keeper.agent import MemoryKeeperAgent


def test_main_module_importable():
    """The entrypoint module imports without side-effects."""
    mod = importlib.import_module("memory_keeper.__main__")
    assert hasattr(mod, "_main")


def test_supervisor_wires_with_register_not_positional():
    """Mirror the production wiring; assert it constructs without TypeError."""
    spec = AgentSpec.new(
        AgentMetadata(agent_id="memory-keeper-01", city="mnemosyne", role="memory-keeper"),
        SubscriptionPolicy.NO_VERIFICATION,
        MemoryKeeperAgent,
    )
    cfg = SupervisorConfig(
        process_name="mnemosyne-core",
        city="mnemosyne",
        data_root=Path("/tmp/obs-test-ledger-does-not-need-to-exist"),
        nats_url="nats://nats:4222",
    )
    supervisor = Supervisor(cfg).register(spec)
    assert supervisor.config.city == "mnemosyne"
    assert len(supervisor.specs) == 1
    assert supervisor.specs[0].metadata.agent_id == "memory-keeper-01"


def test_supervisor_rejects_positional_specs_arg():
    """Document that the buggy call signature still fails — guards against regress."""
    cfg = SupervisorConfig(
        process_name="mnemosyne-core",
        city="mnemosyne",
        data_root=Path("/tmp/obs-test"),
        nats_url="nats://nats:4222",
    )
    spec = AgentSpec.new(
        AgentMetadata(agent_id="x", city="mnemosyne", role="memory-keeper"),
        SubscriptionPolicy.NO_VERIFICATION,
        MemoryKeeperAgent,
    )
    try:
        Supervisor(cfg, [spec])  # type: ignore[call-arg]
    except TypeError:
        return
    raise AssertionError("Supervisor accepted positional specs arg; signature changed?")
