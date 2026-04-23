"""Lifecycle state machine — Python mirror of ``core/obsidian-agent-rs/src/lifecycle.rs``."""

from enum import Enum

# Wire-level Status values from proto/heartbeat.proto (after prost prefix stripping).
# Mirrors the Rust ``Status`` enum's repr(i32).
_STATUS_UNSPECIFIED = 0
_STATUS_ACTIVE = 1
_STATUS_DEGRADED = 2
_STATUS_ERROR = 3
_STATUS_SLEEPING = 4
_STATUS_DREAMING = 5
_STATUS_PROBATION = 6
_STATUS_RETIRED = 7


class Lifecycle(Enum):
    UNREGISTERED = "unregistered"
    REGISTERING = "registering"
    BOOTING = "booting"
    ACTIVE = "active"
    SLEEPING = "sleeping"
    DREAMING = "dreaming"
    PROBATION = "probation"
    ERROR = "error"
    RETIRED = "retired"

    def is_live(self) -> bool:
        return self in {
            Lifecycle.BOOTING,
            Lifecycle.ACTIVE,
            Lifecycle.SLEEPING,
            Lifecycle.DREAMING,
            Lifecycle.PROBATION,
        }

    def can_transition_to(self, to: "Lifecycle") -> bool:
        if self is to:
            return True
        allowed = {
            Lifecycle.UNREGISTERED: {Lifecycle.REGISTERING},
            Lifecycle.REGISTERING: {Lifecycle.BOOTING},
            Lifecycle.BOOTING: {Lifecycle.ACTIVE, Lifecycle.ERROR},
            Lifecycle.ACTIVE: {
                Lifecycle.ERROR,
                Lifecycle.SLEEPING,
                Lifecycle.DREAMING,
                Lifecycle.RETIRED,
            },
            Lifecycle.SLEEPING: {Lifecycle.ACTIVE, Lifecycle.RETIRED},
            Lifecycle.DREAMING: {Lifecycle.ACTIVE},
            Lifecycle.ERROR: {Lifecycle.PROBATION, Lifecycle.RETIRED},
            Lifecycle.PROBATION: {Lifecycle.ACTIVE, Lifecycle.ERROR, Lifecycle.RETIRED},
            Lifecycle.RETIRED: set(),
        }
        return to in allowed.get(self, set())

    def to_wire(self) -> int:
        mapping = {
            Lifecycle.UNREGISTERED: _STATUS_UNSPECIFIED,
            Lifecycle.REGISTERING: _STATUS_UNSPECIFIED,
            Lifecycle.BOOTING: _STATUS_UNSPECIFIED,
            Lifecycle.ACTIVE: _STATUS_ACTIVE,
            Lifecycle.SLEEPING: _STATUS_SLEEPING,
            Lifecycle.DREAMING: _STATUS_DREAMING,
            Lifecycle.PROBATION: _STATUS_PROBATION,
            Lifecycle.ERROR: _STATUS_ERROR,
            Lifecycle.RETIRED: _STATUS_RETIRED,
        }
        return mapping[self]
