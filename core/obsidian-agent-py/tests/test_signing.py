"""Ed25519 key lifecycle tests."""

from __future__ import annotations

import os
import stat

import pytest
from obsidian_agent.bus.signing import (
    KEY_LENGTH,
    SigningKey,
    VerificationError,
    VerifyingKey,
)


def test_sign_and_verify_round_trip():
    key = SigningKey.generate()
    vk = key.verifying()
    msg = b"hello, obsidian"
    sig = key.sign(msg)
    vk.verify(msg, sig)  # should not raise


def test_verify_rejects_tampered_message():
    key = SigningKey.generate()
    sig = key.sign(b"original")
    with pytest.raises(VerificationError):
        key.verifying().verify(b"modified", sig)


def test_verify_rejects_foreign_signature():
    a = SigningKey.generate()
    b = SigningKey.generate()
    sig = a.sign(b"payload")
    with pytest.raises(VerificationError):
        b.verifying().verify(b"payload", sig)


def test_from_bytes_round_trip():
    key = SigningKey.generate()
    key2 = SigningKey.from_bytes(key.to_bytes())
    assert key.verifying().as_bytes() == key2.verifying().as_bytes()


def test_load_or_generate(tmp_path):
    path = tmp_path / "agent-01" / "signing.key"
    k1 = SigningKey.load_or_generate(path)
    assert path.exists()
    assert (path.parent / "signing.pub").exists()

    k2 = SigningKey.load_or_generate(path)
    assert k1.verifying().as_bytes() == k2.verifying().as_bytes()


@pytest.mark.skipif(os.name != "posix", reason="POSIX-only permission check")
def test_saved_private_key_is_mode_0600(tmp_path):
    path = tmp_path / "signing.key"
    SigningKey.generate().save(path)
    mode = stat.S_IMODE(path.stat().st_mode)
    assert mode == 0o600


def test_malformed_key_rejected():
    with pytest.raises(ValueError):
        SigningKey.from_bytes(b"\x00" * 16)
    with pytest.raises(ValueError):
        SigningKey.from_bytes(b"\x00" * 64)


def test_repr_redacts_private_key():
    key = SigningKey.generate()
    assert "redacted" in repr(key)
    # The private-key hex should not appear.
    assert key.to_bytes().hex() not in repr(key)


def test_verifying_key_equality():
    a = SigningKey.generate()
    assert a.verifying() == a.verifying()
    assert a.verifying() != SigningKey.generate().verifying()
