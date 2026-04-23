"""Python lifecycle state machine tests (parallel to Rust)."""

from obsidian_agent.lifecycle import Lifecycle


def test_happy_path_transitions():
    path = [
        Lifecycle.UNREGISTERED,
        Lifecycle.REGISTERING,
        Lifecycle.BOOTING,
        Lifecycle.ACTIVE,
        Lifecycle.RETIRED,
    ]
    for a, b in zip(path, path[1:]):
        assert a.can_transition_to(b), f"{a} -> {b} should be permitted"


def test_restart_loop():
    assert Lifecycle.ACTIVE.can_transition_to(Lifecycle.ERROR)
    assert Lifecycle.ERROR.can_transition_to(Lifecycle.PROBATION)
    assert Lifecycle.PROBATION.can_transition_to(Lifecycle.ACTIVE)


def test_retired_is_terminal():
    for s in (
        Lifecycle.UNREGISTERED,
        Lifecycle.REGISTERING,
        Lifecycle.BOOTING,
        Lifecycle.ACTIVE,
        Lifecycle.SLEEPING,
        Lifecycle.ERROR,
        Lifecycle.PROBATION,
    ):
        assert not Lifecycle.RETIRED.can_transition_to(s)


def test_is_live_covers_expected_states():
    live = {
        Lifecycle.BOOTING,
        Lifecycle.ACTIVE,
        Lifecycle.SLEEPING,
        Lifecycle.DREAMING,
        Lifecycle.PROBATION,
    }
    for s in Lifecycle:
        assert s.is_live() == (s in live)


def test_wire_mapping():
    assert Lifecycle.ACTIVE.to_wire() == 1
    assert Lifecycle.ERROR.to_wire() == 3
    assert Lifecycle.SLEEPING.to_wire() == 4
    assert Lifecycle.DREAMING.to_wire() == 5
    assert Lifecycle.PROBATION.to_wire() == 6
    assert Lifecycle.RETIRED.to_wire() == 7
    # Pre-boot all map to UNSPECIFIED=0
    assert Lifecycle.UNREGISTERED.to_wire() == 0
    assert Lifecycle.REGISTERING.to_wire() == 0
    assert Lifecycle.BOOTING.to_wire() == 0
