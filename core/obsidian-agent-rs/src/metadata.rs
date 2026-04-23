// ============================================================================
// core/obsidian-agent-rs/src/metadata.rs
//
// Authorized by: M0 plan §"Data flow"; spec Part 5.
// ============================================================================

//! `AgentMetadata` — the identity-and-role bundle that ties an agent to its
//! NATS identity, its ledger, and its heartbeat topic.

/// Static, identity-defining properties of an agent.
///
/// These values are supplied at `AgentSpec` registration time and do not
/// change across the agent's lifetime. An agent's keypair, ledger directory,
/// and heartbeat subject are all derived from these fields.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AgentMetadata {
    /// Unique agent identifier (e.g. `"momentum-signal-01"`). Must be
    /// ASCII, lowercase, `snake-kebab-numeric`, 1-63 chars. Used in file
    /// paths, NATS topic tails, and identity certs.
    pub agent_id: String,

    /// City this agent belongs to (e.g. `"aletheia"`).
    pub city: String,

    /// Role descriptor (e.g. `"momentum-signal"`, `"risk-overlord"`,
    /// `"time-oracle"`). This is the role the Tape Recorder and telemetry
    /// views use; several agents may share a role with different agent_ids
    /// (e.g. three momentum-signal instances).
    pub role: String,
}

impl AgentMetadata {
    /// Construct. Panics on empty field (intentional — these must not be
    /// empty and discovering it later is worse than panicking here).
    pub fn new(
        agent_id: impl Into<String>,
        city: impl Into<String>,
        role: impl Into<String>,
    ) -> Self {
        let m = Self {
            agent_id: agent_id.into(),
            city: city.into(),
            role: role.into(),
        };
        assert!(!m.agent_id.is_empty(), "agent_id must not be empty");
        assert!(!m.city.is_empty(), "city must not be empty");
        assert!(!m.role.is_empty(), "role must not be empty");
        m
    }

    /// NATS heartbeat subject for this agent.
    pub fn heartbeat_topic(&self) -> String {
        format!("system.heartbeat.{}", self.agent_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn constructs_and_derives_heartbeat_topic() {
        let m = AgentMetadata::new("momentum-signal-01", "aletheia", "momentum-signal");
        assert_eq!(m.heartbeat_topic(), "system.heartbeat.momentum-signal-01");
    }

    #[test]
    #[should_panic(expected = "agent_id")]
    fn empty_agent_id_panics() {
        let _ = AgentMetadata::new("", "aletheia", "role");
    }

    #[test]
    #[should_panic(expected = "city")]
    fn empty_city_panics() {
        let _ = AgentMetadata::new("id", "", "role");
    }

    #[test]
    #[should_panic(expected = "role")]
    fn empty_role_panics() {
        let _ = AgentMetadata::new("id", "city", "");
    }
}
