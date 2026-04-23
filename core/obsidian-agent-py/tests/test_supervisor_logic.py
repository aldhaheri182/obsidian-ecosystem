"""Tests for the pure-logic parts of the supervisor (validation, key seeding,
restart-budget bookkeeping). End-to-end lifecycle is tested against the running
stack in ``tests/integration``.
"""

from __future__ import annotations

import time
from collections import deque
from pathlib import Path

import pytest
from obsidian_agent import ObsidianAgent
from obsidian_agent.agent import ObsidianAgent as AgentBase
from obsidian_agent.context import AgentContext
from obsidian_agent.metadata import AgentMetadata
from obsidian_agent.supervisor import (
    AgentSpec,
    ConfigError,
    SubscriptionPolicy,
    Supervisor,
    SupervisorConfig,
    _exceeds_restart_budget,
)


class _NoopAgent(AgentBase):
    def __init__(self, metadata: AgentMetadata):
        self._metadata = metadata

    @property
    def metadata(self) -> AgentMetadata:
        return self._metadata

    async def run(self, ctx: AgentContext) -> None:
        await ctx.shutdown.wait()


def _make_spec(agent_id: str, city: str, policy: SubscriptionPolicy) -> AgentSpec:
    md = AgentMetadata(agent_id=agent_id, city=city, role="test-role")
    return AgentSpec.new(md, policy, lambda: _NoopAgent(md))


def _test_config(data_root: Path) -> SupervisorConfig:
    return SupervisorConfig(
        process_name="test-supervisor",
        city="aletheia",
        data_root=data_root,
        nats_url="nats://localhost:4222",
        restart_backoff_seconds=0.01,
        restart_budget=3,
        restart_window_seconds=60,
    )


def test_validate_rejects_duplicate_agent_ids(tmp_path):
    sup = (
        Supervisor(_test_config(tmp_path))
        .register(_make_spec("agent-01", "aletheia", SubscriptionPolicy.NO_VERIFICATION))
        .register(_make_spec("agent-01", "aletheia", SubscriptionPolicy.NO_VERIFICATION))
    )
    with pytest.raises(ConfigError, match="duplicate"):
        sup._validate()


def test_validate_rejects_city_mismatch(tmp_path):
    sup = Supervisor(_test_config(tmp_path)).register(
        _make_spec("agent-01", "prometheus", SubscriptionPolicy.NO_VERIFICATION)
    )
    with pytest.raises(ConfigError):
        sup._validate()


def test_validate_accepts_valid_set(tmp_path):
    sup = (
        Supervisor(_test_config(tmp_path))
        .register(_make_spec("agent-01", "aletheia", SubscriptionPolicy.NO_VERIFICATION))
        .register(_make_spec("agent-02", "aletheia", SubscriptionPolicy.REGISTRY))
    )
    sup._validate()  # should not raise


def test_seed_keys_materializes_every_agent_keypair(tmp_path):
    sup = (
        Supervisor(_test_config(tmp_path))
        .register(_make_spec("agent-a", "aletheia", SubscriptionPolicy.NO_VERIFICATION))
        .register(_make_spec("agent-b", "aletheia", SubscriptionPolicy.REGISTRY))
    )
    sup._validate()
    keys = sup._seed_keys()
    assert len(keys) == 2
    for id_ in ("agent-a", "agent-b"):
        assert (tmp_path / id_ / "signing.key").exists(), f"{id_} key missing"
        assert (tmp_path / id_ / "signing.pub").exists(), f"{id_} pubkey missing"


def test_seed_keys_is_idempotent(tmp_path):
    sup1 = Supervisor(_test_config(tmp_path)).register(
        _make_spec("agent-x", "aletheia", SubscriptionPolicy.NO_VERIFICATION)
    )
    k1 = sup1._seed_keys()

    sup2 = Supervisor(_test_config(tmp_path)).register(
        _make_spec("agent-x", "aletheia", SubscriptionPolicy.NO_VERIFICATION)
    )
    k2 = sup2._seed_keys()

    assert k1[0].verifying().as_bytes() == k2[0].verifying().as_bytes()


def test_restart_budget_not_exceeded_with_one_failure():
    h = deque()
    assert not _exceeds_restart_budget(h, time.monotonic(), 60.0, 3)


def test_restart_budget_trips_on_budget_plus_one():
    h = deque()
    base = 100.0
    for i in range(3):
        assert not _exceeds_restart_budget(h, base + i * 0.01, 60.0, 3)
    # 4th within window -> trips
    assert _exceeds_restart_budget(h, base + 0.04, 60.0, 3)


def test_restart_budget_ages_out_old_failures():
    h = deque()
    window = 60.0
    base = 100.0
    for i in range(3):
        _exceeds_restart_budget(h, base + i * 0.001, window, 3)
    # 61s later — first three age out.
    assert not _exceeds_restart_budget(h, base + 61.0, window, 3)
    assert len(h) == 1


def test_subscription_policy_values():
    assert SubscriptionPolicy.NO_VERIFICATION.value == "no_verification"
    assert SubscriptionPolicy.REGISTRY.value == "registry"
