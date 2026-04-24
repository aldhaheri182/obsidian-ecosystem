# 7. THE AGENT RUNTIME AND OBSIDIAN AGENT SPECIFICATION

## 7.1 Agent Deployment Model

Each city is deployed as one or more Docker containers (docker-compose for development, Kubernetes for production). Within each container, a **Supervisor** process manages multiple agent tasks as async coroutines (Python `asyncio.TaskGroup` or Rust `tokio::task`).

Every agent gets:
- Its own Ed25519 keypair (generated at registration).
- Its own personal RocksDB ledger instance.
- Its own NATS client connection (for per-agent accountability).
- A unique agent ID that persists across restarts and container migrations.

## 7.2 Agent Lifecycle

```
[UNREGISTERED] → [REGISTERING] → [BOOTING] → [ACTIVE] ⇄ [SLEEPING]
                      ↓                ↓           ↓
                  [FAILED]        [PROBATION]  [DREAMING]
                                                    ↓
                                               [RETIRED] → [RESURRECTED]
```

- **Active**: Processing messages, generating signals, executing orders.
- **Sleeping**: Non-trading hours. Runs reflection, summarization, model updates.
- **Dreaming**: Optional state where the agent enters the Dream Room for historical scenario testing.
- **Probation**: New or modified agent operating with simulated capital for validation.
- **Retired**: Agent decommissioned by the Reaper. Ledger archived. Weights frozen in the Immortality Vault.
- **Resurrected**: New agent instance loaded from a retired agent's ledger and model weights.

## 7.3 Agent Base Trait (Rust)

```rust
#[async_trait]
pub trait ObsidianAgent: Send + Sync {
    /// Return metadata about this agent.
    fn metadata(&self) -> AgentMetadata;

    /// Initialize: connect to NATS, open ledger, load model.
    async fn init(&mut self, ledger: Arc<Ledger>, nats: Arc<NatsClient>) -> Result<()>;

    /// Handle an incoming message. This is the main event loop entry point.
    async fn handle_message(&self, envelope: Envelope) -> Result<()>;

    /// Publish a signed message to the bus.
    async fn publish(&self, topic: &str, msg_type: MessageType, payload: impl ProstMessage) -> Result<()>;

    /// Heartbeat loop — publish liveness at 1Hz.
    async fn heartbeat_loop(&self);

    /// Daily reflection — summarize today's events, update internal models.
    async fn reflect(&self) -> Result<Reflection>;

    /// Enter sleep mode (pause message processing, run reflection).
    async fn sleep(&self);
}
```

## 7.4 Supervisor

The Supervisor manages multiple agent tasks within a single container process:

1. **Key Seeding**: All agent keypairs are loaded or generated before any agent starts.
2. **Registry Writing**: The public keys are written to a `FilesystemRegistry` directory so that verifying agents (Risk Overlord, Tape Recorder) can validate message signatures.
3. **Agent Spawning**: Each agent task is spawned as an async task.
4. **Health Monitoring**: The Supervisor monitors heartbeats. If an agent task fails (panic or exit), the Supervisor restarts it.
5. **Restart Budget**: 5 failures in 60 seconds triggers permanent retirement. This prevents infinite restart loops.
6. **Graceful Shutdown**: On SIGTERM, the Supervisor sends shutdown signals, waits for agents to finish, and then exits.
