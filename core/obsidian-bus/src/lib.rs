// ============================================================================
// core/obsidian-bus/src/lib.rs
//
// Authorized by: M0 plan §"Build order" step 2; spec Parts 4.2, 7.
//
// obsidian-bus — the canonical envelope layer for the Obsidian Ecosystem.
//
// This crate owns five concerns, and nothing outside this crate may implement
// any of them independently:
//
//   1. Protobuf type generation for every message in /proto (see build.rs).
//   2. Canonical serialization of `Envelope` for signing / verification.
//      See `canonical::canonicalize_envelope`. The canonicalization function
//      is schema-driven but hand-written (not prost's .encode_to_vec()) so
//      that the output is bit-identical across prost versions and across
//      language implementations. The Python package `obsidian_agent.bus`
//      reproduces this function exactly; cross-language test vectors live
//      in ./test-vectors/envelopes.json.
//   3. Ed25519 signing of envelopes. See `signing`.
//   4. NATS client wiring (connect, publish, subscribe). See `nats`.
//   5. Fixed-point conversion helpers for order / fill prices. See `prices`.
//
// Public API surface:
//
//   - `proto::*`                  — all Protobuf types (Envelope, Signal, …)
//   - `canonical::canonicalize_*` — deterministic byte serialization
//   - `signing::SigningKey`       — Ed25519 keypair wrapper (gen / save / load)
//   - `signing::VerifyingKey`     — public half
//   - `envelope::EnvelopeBuilder` — ergonomic envelope construction
//   - `envelope::sign_envelope`   — sign an unsigned envelope
//   - `envelope::verify_envelope` — verify a signed envelope
//   - `nats::NatsClient`          — connect + typed publish/subscribe
//   - `prices::price_to_scaled` / `price_from_scaled`
// ============================================================================

#![deny(missing_docs)]
#![forbid(unsafe_code)]

//! Envelope (de)serialization, canonical signing, and NATS wiring for the
//! Obsidian Ecosystem.

pub mod canonical;
pub mod envelope;
pub mod error;
pub mod nats;
pub mod prices;
pub mod signing;

/// All Protobuf types generated from /proto.
///
/// The module is populated at build time by `build.rs` via `prost-build`.
pub mod proto {
    // Generated from proto/*.proto — see build.rs.
    // All messages live in the `obsidian` package per the proto files'
    // `package obsidian;` declaration.
    include!(concat!(env!("OUT_DIR"), "/obsidian.rs"));
}

pub use error::{BusError, Result};
pub use signing::{SigningKey, VerifyingKey};
pub use envelope::{sign_envelope, verify_envelope, EnvelopeBuilder};
pub use nats::{NatsClient, NatsConfig, PublicKeyRegistry, PublishOpts, Subscription,
               VerificationMode};
