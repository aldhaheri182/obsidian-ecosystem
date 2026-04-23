// ============================================================================
// core/obsidian-agent-rs/src/lifecycle.rs
//
// Authorized by: spec Part 5.1 (Agent Lifecycle) and §6.3.
//
// Explicit agent lifecycle state machine. Lives inside the supervisor, not
// inside the agent itself — agents care only that `run()` is invoked and
// `shutdown` is signalled.
// ============================================================================

//! Agent lifecycle state machine.

use crate::proto::Status as WireStatus;

/// All lifecycle states an agent can be in under the supervisor.
///
/// M0 actually uses only `Booting`, `Active`, `Error`, and `Retired`. The
/// others are defined now because (a) the wire-level `Status` enum already
/// includes them per the heartbeat.proto, and (b) introducing new states
/// later is much easier if the type exists from day one.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Lifecycle {
    /// Pre-registration. Transient; the supervisor advances past this in
    /// the same tick.
    Unregistered,
    /// Keypair is being loaded / generated.
    Registering,
    /// `ObsidianAgent::init()` is running.
    Booting,
    /// `ObsidianAgent::run()` is running normally.
    Active,
    /// Agent is paused (off-hours, manual pause). M3+ only.
    Sleeping,
    /// Agent is in Prometheus Dream Room. M5+ only.
    Dreaming,
    /// Recently restarted, under elevated scrutiny.
    Probation,
    /// Ran into an error; supervisor will restart after backoff.
    Error,
    /// Gracefully stopped. Will not be restarted.
    Retired,
}

impl Lifecycle {
    /// Whether an agent in this state is considered live for heartbeat
    /// purposes.
    pub fn is_live(self) -> bool {
        matches!(
            self,
            Lifecycle::Booting
                | Lifecycle::Active
                | Lifecycle::Sleeping
                | Lifecycle::Dreaming
                | Lifecycle::Probation
        )
    }

    /// Whether a transition from `self` to `to` is permitted.
    ///
    /// This is intentionally liberal — the supervisor is the only writer,
    /// and catching supervisor bugs via a "wrong transition" panic is
    /// helpful. M0 transitions:
    ///
    ///   Unregistered → Registering → Booting → Active
    ///                                  ↑         ↓
    ///                                  └───── Error ──→ Probation (then → Active after stable window)
    ///                                                   └─ Retired (graceful shutdown)
    pub fn can_transition_to(self, to: Lifecycle) -> bool {
        use Lifecycle::*;
        match (self, to) {
            (Unregistered, Registering) => true,
            (Registering, Booting) => true,
            (Booting, Active) => true,
            (Booting, Error) => true,
            (Active, Error) => true,
            (Active, Sleeping) => true,
            (Active, Dreaming) => true,
            (Active, Retired) => true,
            (Sleeping, Active) => true,
            (Sleeping, Retired) => true,
            (Dreaming, Active) => true,
            (Error, Probation) => true,
            (Error, Retired) => true,
            (Probation, Active) => true,
            (Probation, Error) => true,
            (Probation, Retired) => true,
            // Same-state is always allowed (idempotent).
            (a, b) if a == b => true,
            _ => false,
        }
    }

    /// Convert to the on-the-wire Status enum used in Heartbeat messages.
    pub fn to_wire(self) -> WireStatus {
        match self {
            Lifecycle::Unregistered | Lifecycle::Registering | Lifecycle::Booting => {
                // Still booting counts as not-yet-active on the wire;
                // heartbeats don't usually go out this early anyway.
                WireStatus::Unspecified
            }
            Lifecycle::Active => WireStatus::Active,
            Lifecycle::Sleeping => WireStatus::Sleeping,
            Lifecycle::Dreaming => WireStatus::Dreaming,
            Lifecycle::Probation => WireStatus::Probation,
            Lifecycle::Error => WireStatus::Error,
            Lifecycle::Retired => WireStatus::Retired,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn happy_path_transitions_are_permitted() {
        let path = [
            Lifecycle::Unregistered,
            Lifecycle::Registering,
            Lifecycle::Booting,
            Lifecycle::Active,
        ];
        for w in path.windows(2) {
            assert!(
                w[0].can_transition_to(w[1]),
                "transition {:?} -> {:?} should be permitted",
                w[0],
                w[1]
            );
        }
    }

    #[test]
    fn error_recovery_path() {
        assert!(Lifecycle::Active.can_transition_to(Lifecycle::Error));
        assert!(Lifecycle::Error.can_transition_to(Lifecycle::Probation));
        assert!(Lifecycle::Probation.can_transition_to(Lifecycle::Active));
    }

    #[test]
    fn cannot_skip_states() {
        assert!(!Lifecycle::Unregistered.can_transition_to(Lifecycle::Active));
        assert!(!Lifecycle::Unregistered.can_transition_to(Lifecycle::Booting));
    }

    #[test]
    fn retired_is_terminal() {
        let states = [
            Lifecycle::Unregistered,
            Lifecycle::Registering,
            Lifecycle::Booting,
            Lifecycle::Active,
            Lifecycle::Sleeping,
            Lifecycle::Dreaming,
            Lifecycle::Probation,
            Lifecycle::Error,
        ];
        for s in states {
            assert!(
                !Lifecycle::Retired.can_transition_to(s),
                "retired should not transition to {:?}",
                s
            );
        }
    }

    #[test]
    fn is_live_covers_expected_states() {
        assert!(Lifecycle::Active.is_live());
        assert!(Lifecycle::Booting.is_live());
        assert!(Lifecycle::Sleeping.is_live());
        assert!(Lifecycle::Dreaming.is_live());
        assert!(Lifecycle::Probation.is_live());

        assert!(!Lifecycle::Unregistered.is_live());
        assert!(!Lifecycle::Registering.is_live());
        assert!(!Lifecycle::Error.is_live());
        assert!(!Lifecycle::Retired.is_live());
    }

    #[test]
    fn wire_mapping() {
        assert_eq!(Lifecycle::Active.to_wire(), WireStatus::Active);
        assert_eq!(Lifecycle::Sleeping.to_wire(), WireStatus::Sleeping);
        assert_eq!(Lifecycle::Dreaming.to_wire(), WireStatus::Dreaming);
        assert_eq!(Lifecycle::Error.to_wire(), WireStatus::Error);
        assert_eq!(Lifecycle::Retired.to_wire(), WireStatus::Retired);
    }
}
