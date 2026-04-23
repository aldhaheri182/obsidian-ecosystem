"""Ed25519 keypair management — Python mirror of Rust ``signing.rs``.

Uses ``pynacl`` which wraps libsodium. Signatures are 64 bytes; seeds are 32.
"""

from __future__ import annotations

import os
from pathlib import Path

from nacl.exceptions import BadSignatureError
from nacl.signing import SigningKey as _NaclSigningKey
from nacl.signing import VerifyKey as _NaclVerifyKey

KEY_LENGTH = 32
SIGNATURE_LENGTH = 64


class SigningKey:
    """Ed25519 signing keypair wrapper."""

    __slots__ = ("_inner",)

    def __init__(self, inner: _NaclSigningKey):
        self._inner = inner

    def __repr__(self) -> str:
        return f"SigningKey(<redacted>, pubkey={self.verifying().as_bytes().hex()})"

    @classmethod
    def generate(cls) -> SigningKey:
        return cls(_NaclSigningKey.generate())

    @classmethod
    def from_bytes(cls, data: bytes) -> SigningKey:
        if len(data) != KEY_LENGTH:
            raise ValueError(f"expected {KEY_LENGTH} bytes, got {len(data)}")
        return cls(_NaclSigningKey(data))

    def to_bytes(self) -> bytes:
        return bytes(self._inner)

    def verifying(self) -> VerifyingKey:
        return VerifyingKey(self._inner.verify_key)

    def sign(self, message: bytes) -> bytes:
        return self._inner.sign(message).signature

    @classmethod
    def load(cls, path: str | os.PathLike) -> SigningKey:
        data = Path(path).read_bytes()
        return cls.from_bytes(data)

    def save(self, path: str | os.PathLike) -> None:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(self.to_bytes())
        try:
            os.chmod(p, 0o600)
        except OSError:
            pass  # Windows or non-POSIX; permissions are best-effort.

    @classmethod
    def load_or_generate(cls, path: str | os.PathLike) -> SigningKey:
        p = Path(path)
        if p.exists():
            return cls.load(p)
        key = cls.generate()
        key.save(p)
        # Write companion pubkey alongside.
        pub_path = p.parent / "signing.pub"
        key.verifying().save(pub_path)
        return key


class VerifyingKey:
    """Ed25519 verifying (public) key wrapper."""

    __slots__ = ("_inner",)

    def __init__(self, inner: _NaclVerifyKey):
        self._inner = inner

    def __eq__(self, other: object) -> bool:
        return isinstance(other, VerifyingKey) and self.as_bytes() == other.as_bytes()

    def __hash__(self) -> int:
        return hash(self.as_bytes())

    def __repr__(self) -> str:
        return f"VerifyingKey({self.as_bytes().hex()})"

    @classmethod
    def from_bytes(cls, data: bytes) -> VerifyingKey:
        if len(data) != KEY_LENGTH:
            raise ValueError(f"expected {KEY_LENGTH} pubkey bytes, got {len(data)}")
        return cls(_NaclVerifyKey(data))

    def as_bytes(self) -> bytes:
        return bytes(self._inner)

    def verify(self, message: bytes, signature: bytes) -> None:
        """Verify. Raises ``VerificationError`` on failure."""
        if len(signature) != SIGNATURE_LENGTH:
            raise VerificationError(
                f"expected {SIGNATURE_LENGTH}-byte signature, got {len(signature)}"
            )
        try:
            self._inner.verify(message, signature)
        except BadSignatureError as e:
            raise VerificationError(str(e)) from e

    @classmethod
    def load(cls, path: str | os.PathLike) -> VerifyingKey:
        return cls.from_bytes(Path(path).read_bytes())

    def save(self, path: str | os.PathLike) -> None:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(self.as_bytes())


class VerificationError(Exception):
    """Raised when signature verification fails."""
