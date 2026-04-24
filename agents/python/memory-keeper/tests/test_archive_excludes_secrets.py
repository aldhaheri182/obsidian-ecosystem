"""Regression test: ledger archive MUST NOT include signing keys."""

from __future__ import annotations

import io
import shutil
import tarfile
import tempfile
from pathlib import Path

from memory_keeper.ledger_archival import _tar_dir_to_bytes


def test_tar_excludes_signing_key():
    tmp = Path(tempfile.mkdtemp(prefix="obs-secret-test-"))
    try:
        agent = tmp / "momentum-signal-42"
        agent.mkdir(parents=True)
        (agent / "CURRENT").write_text("MANIFEST-000001\n")
        (agent / "signing.key").write_bytes(b"SECRET_PRIVATE_KEY_BYTES_32B" + b"\x00" * 8)
        (agent / "signing.pub").write_bytes(b"PUBLIC_KEY_32_BYTES_ZERO_PADDED0")
        (agent / "rocksdb_data.sst").write_bytes(b"\x00" * 1024)

        data = _tar_dir_to_bytes(agent)
        names = set()
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tf:
            for ti in tf:
                names.add(Path(ti.name).name)

        # signing.key MUST be excluded; signing.pub + data files stay.
        assert "signing.key" not in names
        assert "signing.pub" in names
        assert "CURRENT" in names
        assert "rocksdb_data.sst" in names
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
