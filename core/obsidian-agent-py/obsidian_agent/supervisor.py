"""Supervisor — Python mirror of ``core/obsidian-agent-rs/src/supervisor.rs``.

Hosts N agents as asyncio tasks inside a single process. Startup sequence per
ADR 0002 + user directive:

  1. Validate config (no duplicate agent_ids; city matches supervisor city).
  2. Seed every agent's keypair to {data_root}/{agent_id}/signing.key BEFORE
     any agent starts. This populates the pubkey registry so Registry-verifying
     subscribers always find the keys they need.
  3. Per agent: connect NATS with that agent's key, spawn heartbeat task,
     spawn run task with restart supervision.
"""

from __future__ import annotations

import asyncio
import enum
import logging
import os
import signal
import time
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Awaitable, Callable

from obsidian_agent.agent import ObsidianAgent
from obsidian_agent.bus import NatsClient, NatsConfig, SigningKey
from obsidian_agent.context import AgentContext
from obsidian_agent.heartbeat import StatusHandle, run_heartbeat_loop
from obsidian_agent.lifecycle import Lifecycle
from obsidian_agent.metadata import AgentMetadata

log = logging.getLogger(__name__)


class SubscriptionPolicy(enum.Enum):
    """Advisory policy documenting which agents MUST verify signatures.

    Agent code still chooses a VerificationMode at subscribe time; this is
    documentation at the registration site, not enforcement (enforcement
    lands in M3 per the M3 tracker).
    """

    NO_VERIFICATION = "no_verification"
    REGISTRY = "registry"


@dataclass
class AgentSpec:
    metadata: AgentMetadata
    subscription_policy: SubscriptionPolicy
    factory: Callable[[], ObsidianAgent]

    @classmethod
    def new(
        cls,
        metadata: AgentMetadata,
        policy: SubscriptionPolicy,
        factory: Callable[[], ObsidianAgent],
    ) -> AgentSpec:
        return cls(metadata=metadata, subscription_policy=policy, factory=factory)


@dataclass
class SupervisorConfig:
    process_name: str = field(
        default_factory=lambda: os.environ.get("SUPERVISOR_NAME", "obsidian-supervisor")
    )
    city: str = field(default_factory=lambda: os.environ.get("CITY", "unknown"))
    data_root: Path = field(
        default_factory=lambda: Path(os.environ.get("LEDGER_PATH", "./ledger-data"))
    )
    nats_url: str = field(default_factory=lambda: os.environ.get("NATS_URL", "nats://nats:4222"))
    restart_backoff_seconds: float = 1.0
    restart_budget: int = 5
    restart_window_seconds: int = 60


class ConfigError(Exception):
    pass


class RestartBudgetExceeded(Exception):
    def __init__(self, agent_id: str, restarts: int, window_secs: int):
        super().__init__(
            f"agent '{agent_id}' exceeded restart budget ({restarts} in {window_secs}s)"
        )
        self.agent_id = agent_id
        self.restarts = restarts
        self.window_secs = window_secs


def _exceeds_restart_budget(
    history: deque[float], now: float, window: float, budget: int
) -> bool:
    """Record failure at ``now``; age out entries older than window.

    Returns True if the count within the window exceeds ``budget``.
    """
    history.append(now)
    while history and (now - history[0]) > window:
        history.popleft()
    return len(history) > budget


class Supervisor:
    """In-process supervisor for N agents (mirrors Rust ``Supervisor``)."""

    def __init__(self, config: SupervisorConfig | None = None):
        self.config = config or SupervisorConfig()
        self.specs: list[AgentSpec] = []
        self.shutdown_event = asyncio.Event()

    @classmethod
    def from_env(cls) -> Supervisor:
        return cls(SupervisorConfig())

    def register(self, spec: AgentSpec) -> Supervisor:
        self.specs.append(spec)
        return self

    def _validate(self) -> None:
        seen: set[str] = set()
        for spec in self.specs:
            if spec.metadata.agent_id in seen:
                raise ConfigError(f"duplicate agent_id '{spec.metadata.agent_id}'")
            seen.add(spec.metadata.agent_id)
            if spec.metadata.city != self.config.city:
                raise ConfigError(
                    f"agent '{spec.metadata.agent_id}' city '{spec.metadata.city}' does not "
                    f"match supervisor city '{self.config.city}'"
                )

    def _seed_keys(self) -> list[SigningKey]:
        self.config.data_root.mkdir(parents=True, exist_ok=True)
        keys: list[SigningKey] = []
        for spec in self.specs:
            agent_dir = self.config.data_root / spec.metadata.agent_id
            agent_dir.mkdir(parents=True, exist_ok=True)
            key_path = agent_dir / "signing.key"
            key = SigningKey.load_or_generate(key_path)
            log.info(
                "key seeded agent_id=%s city=%s role=%s policy=%s",
                spec.metadata.agent_id,
                spec.metadata.city,
                spec.metadata.role,
                spec.subscription_policy.value,
            )
            keys.append(key)
        return keys

    def _install_signal_handlers(self, loop: asyncio.AbstractEventLoop) -> None:
        def _handler() -> None:
            if not self.shutdown_event.is_set():
                log.info("signal received; shutting down")
                self.shutdown_event.set()
            else:
                log.error("second signal; aborting")
                os._exit(130)

        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, _handler)
            except NotImplementedError:
                # Windows or some tests.
                pass

    async def run(self) -> None:
        self._validate()
        keys = self._seed_keys()
        loop = asyncio.get_running_loop()
        self._install_signal_handlers(loop)

        log.info(
            "supervisor starting name=%s city=%s agents=%d",
            self.config.process_name,
            self.config.city,
            len(self.specs),
        )

        async with asyncio.TaskGroup() as tg:
            for spec, key in zip(self.specs, keys):
                tg.create_task(
                    _agent_supervisor_loop(spec, key, self.config, self.shutdown_event)
                )

        log.info("supervisor stopped name=%s", self.config.process_name)


async def _agent_supervisor_loop(
    spec: AgentSpec,
    key: SigningKey,
    config: SupervisorConfig,
    shutdown: asyncio.Event,
) -> None:
    agent_id = spec.metadata.agent_id

    # One NATS connection per agent, reused across restarts.
    nats_config = NatsConfig(
        url=config.nats_url,
        agent_id=agent_id,
        source_city=spec.metadata.city,
    )
    nats = await NatsClient.connect(nats_config, key)

    restart_history: deque[float] = deque()

    try:
        while not shutdown.is_set():
            status_handle = StatusHandle(Lifecycle.BOOTING)
            ctx = AgentContext(
                metadata=spec.metadata,
                nats=nats,
                ledger_dir=config.data_root / agent_id,
                registry_root=config.data_root,
                boot_time=time.monotonic(),
                shutdown=shutdown,
            )

            hb_task = asyncio.create_task(run_heartbeat_loop(ctx, status_handle))

            agent = spec.factory()
            assert agent.metadata.agent_id == spec.metadata.agent_id, (
                f"factory returned agent with wrong agent_id: {agent.metadata.agent_id}"
            )

            failure: Exception | None = None
            try:
                status_handle.set(Lifecycle.BOOTING)
                await agent.init(ctx)
                status_handle.set(Lifecycle.ACTIVE)
                log.info("agent active id=%s", agent_id)
                await agent.run(ctx)
                # Returned cleanly — graceful exit.
            except Exception as e:
                failure = e
                log.error("agent run error id=%s: %s", agent_id, e, exc_info=True)
            finally:
                try:
                    await agent.shutdown(ctx)
                except Exception as e:
                    log.warning("agent shutdown failed id=%s: %s", agent_id, e)

            # Stop the heartbeat task appropriately.
            if failure is None:
                await hb_task  # graceful — heartbeat saw shutdown
            else:
                hb_task.cancel()
                try:
                    await hb_task
                except asyncio.CancelledError:
                    pass

            if failure is None:
                log.info("agent exited cleanly id=%s", agent_id)
                return

            # Consult the restart budget.
            if _exceeds_restart_budget(
                restart_history,
                time.monotonic(),
                config.restart_window_seconds,
                config.restart_budget,
            ):
                log.error(
                    "restart budget exceeded id=%s restarts=%d",
                    agent_id,
                    len(restart_history),
                )
                raise RestartBudgetExceeded(
                    agent_id,
                    len(restart_history),
                    config.restart_window_seconds,
                )

            log.warning(
                "restarting agent id=%s after %.2fs backoff (restart #%d)",
                agent_id,
                config.restart_backoff_seconds,
                len(restart_history),
            )
            # Race shutdown vs backoff.
            try:
                await asyncio.wait_for(
                    shutdown.wait(), timeout=config.restart_backoff_seconds
                )
                return  # shutdown fired during backoff
            except asyncio.TimeoutError:
                pass  # backoff complete; loop and restart
    finally:
        await nats.close()
