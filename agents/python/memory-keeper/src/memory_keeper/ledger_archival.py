"""Daily ledger-archival job per whitepaper §5.2 + M1 tracker #22.

Runs inside the memory-keeper container. Once per day (and on demand via
``mnemosyne.archive.request``), walks ``/ledger-data/*`` — each subdir is
one agent's RocksDB ledger — tars it, and uploads to the MinIO bucket
``obsidian-ledger-archive`` under ``{YYYY-MM-DD}/{agent_id}.tar.gz``.

Retention: local disk keeps the live RocksDB; MinIO keeps every daily
snapshot indefinitely for M1. M5+ will flip cold snapshots to S3 Glacier.
"""

from __future__ import annotations

import asyncio
import io
import logging
import os
import tarfile
from datetime import datetime, UTC
from pathlib import Path

from obsidian_graph import BlobArchive

log = logging.getLogger(__name__)

_BUCKET = "obsidian-ledger-archive"
_DEFAULT_LEDGER_ROOT = Path(os.environ.get("LEDGER_PATH", "/data/ledger"))


_SECRET_FILENAMES = {"signing.key", "ed25519.key", "nats.creds"}


def _exclude_secrets(info: tarfile.TarInfo) -> tarfile.TarInfo | None:
    """Drop anything that looks like a private-key file.

    Ledger archival MUST NOT export signing material — the archive lives in
    MinIO / S3 and is replayable by anyone with read access.
    """
    name = Path(info.name).name
    if name in _SECRET_FILENAMES:
        return None
    return info


def _tar_dir_to_bytes(path: Path) -> bytes:
    """Pack a directory into a gzipped tar byte string, excluding secrets."""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tf:
        tf.add(str(path), arcname=path.name, filter=_exclude_secrets)
    return buf.getvalue()


def _snapshot_all(root: Path, blob: BlobArchive, today: str) -> list[str]:
    """Snapshot every agent-ledger subdir under ``root``. Returns the keys written."""
    written: list[str] = []
    if not root.exists():
        log.warning("ledger-root does not exist: %s", root)
        return written
    blob.ensure_bucket(_BUCKET)
    for agent_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        key = f"{today}/{agent_dir.name}.tar.gz"
        data = _tar_dir_to_bytes(agent_dir)
        blob.put_bytes(_BUCKET, key, data)
        log.info("archived %s (%d bytes) → s3://%s/%s", agent_dir.name, len(data), _BUCKET, key)
        written.append(key)
    return written


async def daily_archival_loop(ledger_root: Path = _DEFAULT_LEDGER_ROOT) -> None:
    """Sleep until next UTC midnight, then snapshot, forever.

    Intended to be launched as an ``asyncio.create_task`` inside the
    memory-keeper container. Also snapshots once on startup so a freshly-
    booted memory-keeper immediately has a seed archive.
    """
    blob = BlobArchive()

    # Initial snapshot on startup.
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    try:
        _snapshot_all(ledger_root, blob, today)
    except Exception:  # pragma: no cover - operational log, not fatal
        log.exception("startup ledger-archival failed; will retry at next midnight")

    while True:
        now = datetime.now(UTC)
        # Next UTC midnight + 60 s to avoid the exact tick.
        tomorrow = (now.replace(hour=0, minute=0, second=0, microsecond=0)
                    .replace(day=now.day) + _one_day(now))
        sleep_for = (tomorrow - now).total_seconds() + 60
        log.info("ledger-archival loop sleeping %.0fs until next snapshot", sleep_for)
        await asyncio.sleep(max(10.0, sleep_for))

        today = datetime.now(UTC).strftime("%Y-%m-%d")
        try:
            _snapshot_all(ledger_root, blob, today)
        except Exception:  # pragma: no cover
            log.exception("daily ledger-archival failed for %s; will retry tomorrow", today)


def _one_day(_now: datetime):
    from datetime import timedelta
    return timedelta(days=1)
