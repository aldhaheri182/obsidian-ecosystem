"""Agent metadata — Python mirror of ``core/obsidian-agent-rs/src/metadata.rs``."""

from dataclasses import dataclass


@dataclass(frozen=True)
class AgentMetadata:
    agent_id: str
    city: str
    role: str

    def __post_init__(self) -> None:
        if not self.agent_id:
            raise ValueError("agent_id must not be empty")
        if not self.city:
            raise ValueError("city must not be empty")
        if not self.role:
            raise ValueError("role must not be empty")

    def heartbeat_topic(self) -> str:
        return f"system.heartbeat.{self.agent_id}"
