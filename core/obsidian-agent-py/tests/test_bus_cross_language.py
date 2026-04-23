"""Cross-language canonicalizer firewall.

Loads ``core/obsidian-bus/test-vectors/envelopes.json`` and asserts every
vector's canonical bytes match the Python canonicalizer's output. The same
JSON is consumed by the Rust test at
``core/obsidian-bus/tests/cross_language.rs``.

If this test fails, the Python canonicalizer has diverged from Rust. Inspect
the first failing vector's ``envelope_proto_hex`` and trace through.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

VECTORS_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "obsidian-bus"
    / "test-vectors"
    / "envelopes.json"
)


@pytest.mark.skipif(
    not VECTORS_PATH.exists(),
    reason=f"vectors file not found: {VECTORS_PATH}. "
    "Run `cargo run --example emit-vectors -p obsidian-bus > ...` first.",
)
def test_vectors_match_python_canonicalizer():
    """For every vector, decode the envelope proto, canonicalize, assert hex matches."""
    try:
        from obsidian_agent._proto import envelope_pb2
    except ImportError:
        pytest.skip(
            "envelope_pb2 not yet generated — run `make proto` from the repo root"
        )

    from obsidian_agent.bus.canonical import canonicalize_envelope_proto

    raw = VECTORS_PATH.read_text()
    doc = json.loads(raw)
    assert doc["version"] == "1", f"unknown vectors file version: {doc['version']}"
    assert doc["schema_version"] == "1.0.0", (
        f"envelope schema version mismatch: {doc['schema_version']}"
    )
    assert doc["vectors"], "vectors file is empty"

    for v in doc["vectors"]:
        name = v["name"]
        env_hex = v["envelope_proto_hex"]
        expected_hex = v["canonical_hex"]

        env = envelope_pb2.Envelope()
        env.ParseFromString(bytes.fromhex(env_hex))

        got = canonicalize_envelope_proto(env).hex()
        assert got == expected_hex, (
            f"vector '{name}' canonicalization mismatch.\n"
            f"  got : {got}\n  want: {expected_hex}"
        )
