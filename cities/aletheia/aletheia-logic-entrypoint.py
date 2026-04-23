"""aletheia-logic entrypoint — runs the Python Supervisor with three agents."""

from __future__ import annotations

import asyncio
import logging

from obsidian_agent import (
    AgentMetadata,
    AgentSpec,
    SubscriptionPolicy,
    Supervisor,
    SupervisorConfig,
)
from momentum_signal import MomentumSignalAgent
from signal_blender import SignalBlenderAgent
from paper_executor import PaperExecutorAgent


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    config = SupervisorConfig(
        process_name="aletheia-logic",
        city="aletheia",
    )

    sup = (
        Supervisor(config)
        .register(
            AgentSpec.new(
                AgentMetadata(agent_id="momentum-signal-01", city="aletheia", role="momentum-signal"),
                SubscriptionPolicy.NO_VERIFICATION,
                lambda: MomentumSignalAgent(),
            )
        )
        .register(
            AgentSpec.new(
                AgentMetadata(agent_id="signal-blender-01", city="aletheia", role="signal-blender"),
                SubscriptionPolicy.NO_VERIFICATION,
                lambda: SignalBlenderAgent(),
            )
        )
        .register(
            AgentSpec.new(
                AgentMetadata(agent_id="paper-executor-01", city="aletheia", role="paper-executor"),
                SubscriptionPolicy.NO_VERIFICATION,
                lambda: PaperExecutorAgent(),
            )
        )
    )

    asyncio.run(sup.run())


if __name__ == "__main__":
    main()
