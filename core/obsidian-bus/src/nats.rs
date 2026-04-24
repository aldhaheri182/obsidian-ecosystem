// ============================================================================
// core/obsidian-bus/src/nats.rs
//
// Authorized by: M0 plan §"Message bus"; spec Part 4.1.
//
// NATS client wrapper that every Rust agent uses for pub/sub. Responsibilities:
//
//   - Connect with configured credentials (in M0, none — flat trust on the
//     docker-compose network; see ADR 0002. In M3+, NATS user JWTs).
//   - Build, sign, serialize, and publish Envelopes in a single call.
//   - Subscribe to topics and yield parsed+verified Envelopes on a Stream.
//   - Accept a `VerificationMode` per subscription so critical consumers
//     (Risk Overlord, Tape Recorder) can require signature verification
//     while less critical consumers can skip it for throughput.
//   - Track a monotonic `messages_published` counter per client for the
//     Heartbeat `messages_published` field.
// ============================================================================

//! NATS connection, typed publish, typed subscribe, verification policy.

use crate::envelope::{sign_envelope, verify_envelope, EnvelopeBuilder};
use crate::error::{BusError, Result};
use crate::proto::{Envelope, MessageType, Priority};
use crate::signing::{SigningKey, VerifyingKey};
use bytes::Bytes;
use futures::Stream;
use prost::Message as ProstMessage;
use std::collections::HashMap;
use std::pin::Pin;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::task::{Context, Poll};
use tokio::sync::RwLock;
use tracing::{debug, warn};

/// Configuration for connecting a `NatsClient`.
#[derive(Debug, Clone)]
pub struct NatsConfig {
    /// NATS URL, e.g. `nats://nats:4222`.
    pub url: String,
    /// Agent's identifier — copied into every published envelope as
    /// `source_agent_id`.
    pub agent_id: String,
    /// Agent's city — copied into every published envelope as `source_city`.
    pub source_city: String,
    /// Optional NATS user JWT creds path. M0: None.
    pub creds_path: Option<String>,
}

impl NatsConfig {
    /// Read the standard environment variables defined in spec Part 29.
    /// NATS_URL falls back to `nats://localhost:4222`.
    pub fn from_env(agent_id: impl Into<String>, source_city: impl Into<String>) -> Self {
        Self {
            url: std::env::var("NATS_URL")
                .unwrap_or_else(|_| "nats://localhost:4222".to_string()),
            agent_id: agent_id.into(),
            source_city: source_city.into(),
            creds_path: std::env::var("NATS_CREDS_FILE").ok(),
        }
    }
}

/// Options applied per-publish.
#[derive(Debug, Clone, Default)]
pub struct PublishOpts {
    /// Override priority (default NORMAL).
    pub priority: Option<Priority>,
    /// Correlation id for request/response chains.
    pub correlation_id: Option<String>,
    /// Ledger entry ids of causal predecessors.
    pub causal_links: Vec<String>,
    /// Override schema_version (rarely needed).
    pub schema_version: Option<String>,
}

/// Policy for verifying incoming signatures on a given subscription.
///
/// The M0 default is `NoVerification` because identity infrastructure (Vault
/// PKI, pubkey registry) lands in M3. Critical subscriptions (Risk Overlord,
/// Tape Recorder in audit mode) can opt in now with an explicit registry.
#[derive(Clone)]
pub enum VerificationMode {
    /// Skip signature verification. Envelope is parsed and delivered as-is.
    /// A warning is logged on subscription boot.
    NoVerification,
    /// Verify against a single known VerifyingKey (for 1:1 links).
    SinglePublisher(VerifyingKey),
    /// Verify against a registry lookup by `source_agent_id`.
    Registry(Arc<dyn PublicKeyRegistry>),
}

impl std::fmt::Debug for VerificationMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            VerificationMode::NoVerification => f.write_str("NoVerification"),
            VerificationMode::SinglePublisher(_) => f.write_str("SinglePublisher(<pk>)"),
            VerificationMode::Registry(_) => f.write_str("Registry(<registry>)"),
        }
    }
}

/// A trait for services that can look up an agent's `VerifyingKey`.
///
/// In M0 the canonical implementation is `FilesystemRegistry` backed by
/// `ledger-data/{agent_id}/signing.pub`. In M3+, Vault PKI replaces this.
pub trait PublicKeyRegistry: Send + Sync {
    /// Return the known `VerifyingKey` for `agent_id`, or `None` if unknown.
    fn get(&self, agent_id: &str) -> Option<VerifyingKey>;
}

/// Filesystem-backed public key registry.
///
/// Scans the `root` directory for `{agent_id}/signing.pub` files on demand.
/// Keys are cached after first read. Good enough for M0; replaced by Vault
/// lookups in M3.
pub struct FilesystemRegistry {
    root: std::path::PathBuf,
    cache: RwLock<HashMap<String, VerifyingKey>>,
}

impl FilesystemRegistry {
    /// Create a new registry rooted at `root` (typically `./ledger-data`).
    pub fn new(root: impl Into<std::path::PathBuf>) -> Self {
        Self {
            root: root.into(),
            cache: RwLock::new(HashMap::new()),
        }
    }
}

impl PublicKeyRegistry for FilesystemRegistry {
    fn get(&self, agent_id: &str) -> Option<VerifyingKey> {
        // Fast path: cached.
        if let Some(k) = self.cache.try_read().ok().and_then(|c| c.get(agent_id).cloned()) {
            return Some(k);
        }
        // Slow path: disk.
        let path = self.root.join(agent_id).join("signing.pub");
        let key = VerifyingKey::load(&path).ok()?;
        // Best-effort insert.
        if let Ok(mut cache) = self.cache.try_write() {
            cache.insert(agent_id.to_string(), key.clone());
        }
        Some(key)
    }
}

/// The ecosystem-wide NATS client.
#[derive(Clone)]
pub struct NatsClient {
    inner: async_nats::Client,
    agent_id: String,
    source_city: String,
    signing_key: SigningKey,
    messages_published: Arc<AtomicU64>,
}

impl std::fmt::Debug for NatsClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("NatsClient")
            .field("agent_id", &self.agent_id)
            .field("source_city", &self.source_city)
            .field("messages_published", &self.messages_published)
            .finish()
    }
}

impl NatsClient {
    /// Connect to NATS and return a client tied to the given signing key.
    pub async fn connect(config: NatsConfig, signing_key: SigningKey) -> Result<Self> {
        let options = async_nats::ConnectOptions::new()
            .name(&config.agent_id)
            .retry_on_initial_connect();
        let inner = options.connect(&config.url).await?;
        debug!(agent_id = %config.agent_id, url = %config.url, "NATS connected");
        Ok(Self {
            inner,
            agent_id: config.agent_id,
            source_city: config.source_city,
            signing_key,
            messages_published: Arc::new(AtomicU64::new(0)),
        })
    }

    /// Return the cumulative number of messages this client has published
    /// since `connect`. Used by the Heartbeat.
    pub fn messages_published(&self) -> u64 {
        self.messages_published.load(Ordering::Relaxed)
    }

    /// Return this client's agent_id.
    pub fn agent_id(&self) -> &str {
        &self.agent_id
    }

    /// Return this client's verifying key (for registering in a pubkey
    /// registry).
    pub fn verifying_key(&self) -> VerifyingKey {
        self.signing_key.verifying()
    }

    /// Publish a typed payload on `topic`.
    ///
    /// The payload is Protobuf-encoded, wrapped in a freshly built Envelope,
    /// signed, serialized, and sent. Returns the Envelope's `message_id`.
    pub async fn publish<M: ProstMessage>(
        &self,
        topic: impl Into<String>,
        msg_type: MessageType,
        payload: &M,
        opts: PublishOpts,
    ) -> Result<String> {
        let topic = topic.into();
        let mut builder =
            EnvelopeBuilder::new(msg_type, topic.clone(), &self.agent_id, &self.source_city)
                .payload_proto(payload);
        if let Some(p) = opts.priority {
            builder = builder.priority(p);
        }
        if let Some(c) = opts.correlation_id {
            builder = builder.correlation_id(c);
        }
        if !opts.causal_links.is_empty() {
            builder = builder.causal_all(opts.causal_links);
        }
        if let Some(v) = opts.schema_version {
            builder = builder.schema_version(v);
        }

        let unsigned = builder.build();
        let message_id = unsigned.message_id.clone();

        let signed = sign_envelope(unsigned, &self.signing_key)?;
        let wire = signed.encode_to_vec();

        self.inner.publish(topic, Bytes::from(wire)).await?;
        self.messages_published.fetch_add(1, Ordering::Relaxed);
        Ok(message_id)
    }

    /// Publish raw bytes on a topic without envelope wrapping.
    ///
    /// Exposed only for the Tape Recorder's replay path, which needs to emit
    /// already-signed envelopes verbatim. Agents SHOULD NOT call this.
    pub async fn publish_raw(&self, topic: impl Into<String>, data: Bytes) -> Result<()> {
        self.inner.publish(topic.into(), data).await?;
        Ok(())
    }

    /// Subscribe to `topic` (may include NATS wildcards `*` and `>`).
    pub async fn subscribe(
        &self,
        topic: impl Into<String>,
        verification: VerificationMode,
    ) -> Result<Subscription> {
        let topic = topic.into();
        if matches!(verification, VerificationMode::NoVerification) {
            warn!(topic = %topic, "subscription created without signature verification (M0 default)");
        }
        let inner = self.inner.subscribe(topic.clone()).await?;
        Ok(Subscription { inner, verification, topic })
    }

    /// Flush pending published messages to the server. Useful before shutdown.
    pub async fn flush(&self) -> Result<()> {
        self.inner
            .flush()
            .await
            .map_err(|e| BusError::Nats(e.to_string()))
    }

    /// Access the underlying `async_nats::Client`. Escape hatch for JetStream
    /// setup in the Tape Recorder. Regular agents SHOULD NOT use this.
    pub fn inner(&self) -> &async_nats::Client {
        &self.inner
    }
}

/// A subscription stream of verified Envelopes.
///
/// Items that fail verification are logged and silently dropped — they do not
/// appear in the stream. This is deliberate: consumers should not have to
/// handle unverified messages, and forwarding them is a latent vulnerability.
pub struct Subscription {
    inner: async_nats::Subscriber,
    verification: VerificationMode,
    topic: String,
}

impl Subscription {
    /// Receive the next Envelope, waiting if necessary. Returns `None` when
    /// the underlying subscriber is closed.
    pub async fn next(&mut self) -> Option<Result<Envelope>> {
        use futures::StreamExt;
        loop {
            let msg = self.inner.next().await?;
            match Envelope::decode(&*msg.payload) {
                Ok(env) => match verify(&env, &self.verification) {
                    Ok(()) => return Some(Ok(env)),
                    Err(e) => {
                        warn!(topic = %self.topic, error = %e, "dropping unverified envelope");
                        continue;
                    }
                },
                Err(e) => {
                    warn!(topic = %self.topic, error = %e, "dropping undecodable envelope");
                    continue;
                }
            }
        }
    }
}

impl Stream for Subscription {
    type Item = Result<Envelope>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        loop {
            match Pin::new(&mut this.inner).poll_next(cx) {
                Poll::Pending => return Poll::Pending,
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Ready(Some(msg)) => match Envelope::decode(&*msg.payload) {
                    Ok(env) => match verify(&env, &this.verification) {
                        Ok(()) => return Poll::Ready(Some(Ok(env))),
                        Err(e) => {
                            warn!(topic = %this.topic, error = %e,
                                  "dropping unverified envelope");
                            continue;
                        }
                    },
                    Err(e) => {
                        warn!(topic = %this.topic, error = %e,
                              "dropping undecodable envelope");
                        continue;
                    }
                },
            }
        }
    }
}

fn verify(env: &Envelope, mode: &VerificationMode) -> Result<()> {
    match mode {
        VerificationMode::NoVerification => Ok(()),
        VerificationMode::SinglePublisher(vk) => verify_envelope(env, vk),
        VerificationMode::Registry(reg) => match reg.get(&env.source_agent_id) {
            Some(vk) => verify_envelope(env, &vk),
            None => Err(BusError::UnknownPublicKey(env.source_agent_id.clone())),
        },
    }
}

// ---------------------------------------------------------------------------
// Tests for the non-NATS bits of this module. NATS roundtrip integration
// tests live in /tests and require a running NATS; they are `#[ignore]`d by
// default in CI.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn filesystem_registry_finds_saved_pubkey() {
        let dir = tempdir().unwrap();
        let registry = FilesystemRegistry::new(dir.path());

        let key = SigningKey::generate();
        let vk = key.verifying();
        let pub_path = dir.path().join("agent-01").join("signing.pub");
        vk.save(&pub_path).unwrap();

        let loaded = registry.get("agent-01").expect("key not found");
        assert_eq!(loaded.as_bytes(), vk.as_bytes());
    }

    #[test]
    fn filesystem_registry_returns_none_for_missing() {
        let dir = tempdir().unwrap();
        let registry = FilesystemRegistry::new(dir.path());
        assert!(registry.get("nonexistent").is_none());
    }

    #[test]
    fn verify_no_verification_is_ok() {
        let env = EnvelopeBuilder::new(
            MessageType::Heartbeat,
            "test",
            "a",
            "city",
        )
        .build();
        assert!(verify(&env, &VerificationMode::NoVerification).is_ok());
    }

    #[test]
    fn verify_single_publisher() {
        let key = SigningKey::generate();
        let env = EnvelopeBuilder::new(
            MessageType::Heartbeat,
            "test",
            "a",
            "city",
        )
        .build();
        let signed = crate::envelope::sign_envelope(env, &key).unwrap();

        assert!(verify(&signed, &VerificationMode::SinglePublisher(key.verifying())).is_ok());

        let other = SigningKey::generate().verifying();
        assert!(verify(&signed, &VerificationMode::SinglePublisher(other)).is_err());
    }
}
