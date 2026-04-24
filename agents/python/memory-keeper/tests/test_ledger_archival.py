"""Smoke test for the ledger-archival pipeline against the live M1 MinIO."""

from __future__ import annotations

import os
import shutil
import tempfile
import uuid
from datetime import datetime, UTC
from pathlib import Path

import pytest

from memory_keeper.ledger_archival import _snapshot_all
from obsidian_graph import BlobArchive


def _populate_fake_ledger(root: Path, agent_name: str) -> None:
    agent_dir = root / agent_name
    agent_dir.mkdir(parents=True, exist_ok=True)
    (agent_dir / "CURRENT").write_text("MANIFEST-000001\n")
    (agent_dir / "MANIFEST-000001").write_bytes(b"\x00" * 256)
    (agent_dir / "000010.log").write_bytes(os.urandom(512))


def test_snapshot_all_uploads_every_agent_dir():
    tmp = Path(tempfile.mkdtemp(prefix="obs-ledger-"))
    try:
        _populate_fake_ledger(tmp, "momentum-signal-test")
        _populate_fake_ledger(tmp, "risk-overlord-test")

        blob = BlobArchive()
        today = datetime.now(UTC).strftime("%Y-%m-%d") + f"-{uuid.uuid4().hex[:6]}"
        keys = _snapshot_all(tmp, blob, today)

        assert len(keys) == 2
        agent_names = {Path(k).stem.replace(".tar", "") for k in keys}
        assert agent_names == {"momentum-signal-test", "risk-overlord-test"}

        # Round-trip: fetch one back and check non-empty.
        data = blob.get_bytes("obsidian-ledger-archive", keys[0])
        assert len(data) > 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
