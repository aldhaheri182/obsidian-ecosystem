# Canonical envelope test vectors

This directory holds cross-language regression vectors for the `obsidian-bus`
canonicalizer. The same vectors are consumed by:

- `cargo test -p obsidian-bus --test cross_language` (Rust)
- `pytest obsidian_agent/tests/test_bus_cross_language.py` (Python, next commit)
- visualization CI (TypeScript, M4+)

Each reader produces its own canonical bytes for each named vector and
asserts bit equivalence with `canonical_hex`. Both languages reading the same
file and producing the same bytes IS the cross-language harness.

## Generating

From the repo root:

```sh
cargo run --example emit-vectors --manifest-path core/obsidian-bus/Cargo.toml \
  > core/obsidian-bus/test-vectors/envelopes.json
```

## Changing

A diff to `envelopes.json` is a significant event:

- **New vectors only** (only adding entries): commit with the vectors and
  reference the test case that needed it.
- **Changed existing canonical_hex**: this means the canonicalizer changed.
  A matching ADR is required. The envelope `schema_version` constant must
  be bumped in `src/envelope.rs`, and every agent in the ecosystem must be
  redeployed before traffic on the old version is drained.

## Schema

```jsonc
{
  "version": "1",                       // schema of THIS file
  "schema_version": "1.0.0",            // envelope schema version
  "generated_by": "cargo run --example emit-vectors",
  "vectors": [
    {
      "name": "empty_envelope",
      "description": "human-readable why-this-exists",
      "envelope_proto_hex": "…",        // prost-encoded envelope
      "canonical_hex": "…"              // canonicalize_envelope output
    }
  ]
}
```
