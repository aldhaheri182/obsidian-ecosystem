// ============================================================================
// core/obsidian-agent-rs/tests/lifecycle_transitions.rs
//
// Authorized by: spec Part 5.1.
// ============================================================================

use obsidian_agent_rs::Lifecycle;
use obsidian_agent_rs::proto::Status as WireStatus;

#[test]
fn full_happy_path() {
    // Unregistered → Registering → Booting → Active → Retired
    let path = [
        Lifecycle::Unregistered,
        Lifecycle::Registering,
        Lifecycle::Booting,
        Lifecycle::Active,
        Lifecycle::Retired,
    ];
    for pair in path.windows(2) {
        assert!(
            pair[0].can_transition_to(pair[1]),
            "{:?} -> {:?} must be permitted",
            pair[0],
            pair[1]
        );
    }
}

#[test]
fn restart_loop_path() {
    // Active → Error → Probation → Active (a single successful restart)
    assert!(Lifecycle::Active.can_transition_to(Lifecycle::Error));
    assert!(Lifecycle::Error.can_transition_to(Lifecycle::Probation));
    assert!(Lifecycle::Probation.can_transition_to(Lifecycle::Active));
    // Probation can also end in Error again (repeated failure) or Retired.
    assert!(Lifecycle::Probation.can_transition_to(Lifecycle::Error));
    assert!(Lifecycle::Probation.can_transition_to(Lifecycle::Retired));
}

#[test]
fn invalid_skips_rejected() {
    assert!(!Lifecycle::Unregistered.can_transition_to(Lifecycle::Active));
    assert!(!Lifecycle::Booting.can_transition_to(Lifecycle::Retired));
    assert!(!Lifecycle::Active.can_transition_to(Lifecycle::Unregistered));
}

#[test]
fn retired_is_terminal() {
    for s in [
        Lifecycle::Unregistered,
        Lifecycle::Registering,
        Lifecycle::Booting,
        Lifecycle::Active,
        Lifecycle::Sleeping,
        Lifecycle::Error,
        Lifecycle::Probation,
    ] {
        assert!(
            !Lifecycle::Retired.can_transition_to(s),
            "Retired must not return to {:?}",
            s
        );
    }
}

#[test]
fn wire_mapping_covers_all_variants() {
    assert_eq!(Lifecycle::Active.to_wire(), WireStatus::Active);
    assert_eq!(Lifecycle::Sleeping.to_wire(), WireStatus::Sleeping);
    assert_eq!(Lifecycle::Dreaming.to_wire(), WireStatus::Dreaming);
    assert_eq!(Lifecycle::Probation.to_wire(), WireStatus::Probation);
    assert_eq!(Lifecycle::Error.to_wire(), WireStatus::Error);
    assert_eq!(Lifecycle::Retired.to_wire(), WireStatus::Retired);
    // Pre-boot states all collapse to UNSPECIFIED on the wire.
    assert_eq!(Lifecycle::Unregistered.to_wire(), WireStatus::Unspecified);
    assert_eq!(Lifecycle::Registering.to_wire(), WireStatus::Unspecified);
    assert_eq!(Lifecycle::Booting.to_wire(), WireStatus::Unspecified);
}
