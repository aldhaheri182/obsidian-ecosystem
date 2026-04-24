"""Obsidian Ecosystem — Python agent runtime.

Public API mirrors `core/obsidian-agent-rs` (Rust).
"""

from obsidian_agent.agent import ObsidianAgent
from obsidian_agent.context import AgentContext
from obsidian_agent.lifecycle import Lifecycle
from obsidian_agent.metadata import AgentMetadata
from obsidian_agent.supervisor import (
    AgentSpec,
    SubscriptionPolicy,
    Supervisor,
    SupervisorConfig,
)

__all__ = [
    "ObsidianAgent",
    "AgentContext",
    "AgentMetadata",
    "AgentSpec",
    "Lifecycle",
    "SubscriptionPolicy",
    "Supervisor",
    "SupervisorConfig",
]
