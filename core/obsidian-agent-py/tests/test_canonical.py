"""Python-side canonicalizer tests.

Parallel to ``core/obsidian-bus/tests/canonical_determinism.rs`` and
``canonical_vectors.rs``. The bit-equivalence-with-Rust firewall lives in
``test_bus_cross_language.py``.
"""

from obsidian_agent.bus.canonical import (
    EnvelopeFields,
    canonicalize_envelope,
    canonicalize_timestamp,
)


def _hex(b: bytes) -> str:
    return b.hex()


def test_empty_envelope_is_4a006200():
    env = EnvelopeFields()
    assert _hex(canonicalize_envelope(env)) == "4a006200"
    assert len(canonicalize_envelope(env)) == 4


def test_zero_nonce_only():
    env = EnvelopeFields(nonce=b"\x00" * 16)
    expected = "4a00" "6210" + "00" * 16
    assert _hex(canonicalize_envelope(env)) == expected


def test_payload_and_nonce():
    env = EnvelopeFields(
        payload=b"\x42",
        nonce=bytes(range(1, 17)),
    )
    expected = "4a0142" "6210" + bytes(range(1, 17)).hex()
    assert _hex(canonicalize_envelope(env)) == expected


def test_determinism():
    env = EnvelopeFields(
        message_id="mid",
        source_agent_id="agent-01",
        source_city="aletheia",
        target_topic="test.topic",
        payload=b"\x01\x02\x03",
        nonce=b"\x00" * 16,
        type=6,
    )
    a = canonicalize_envelope(env)
    b = canonicalize_envelope(env)
    c = canonicalize_envelope(env)
    assert a == b == c


def test_timestamp_proto3_defaults():
    assert canonicalize_timestamp(0, 0) == b""
    assert canonicalize_timestamp(1, 0) == b"\x08\x01"
    assert canonicalize_timestamp(0, 1) == b"\x10\x01"
    assert canonicalize_timestamp(1, 1) == b"\x08\x01\x10\x01"


def test_causal_link_order_matters():
    a = EnvelopeFields(nonce=b"\x00" * 16, causal_message_ids=["a", "b"])
    b = EnvelopeFields(nonce=b"\x00" * 16, causal_message_ids=["b", "a"])
    assert canonicalize_envelope(a) != canonicalize_envelope(b)


def test_large_payload_multibyte_length():
    env = EnvelopeFields(payload=b"\x42" * 300, nonce=b"\x00" * 16)
    out = canonicalize_envelope(env)
    # 0x4a 0xac 0x02 -- tag 9, length 300 as multi-byte varint
    assert out[:3] == b"\x4a\xac\x02"
    assert out[3 : 3 + 300] == b"\x42" * 300
