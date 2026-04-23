#!/usr/bin/env python3
"""scripts/replay-day.py — M0 Acceptance Test #2 harness.

Replay a date from the Tape. The full implementation requires the Tape's
gRPC Replay service (M1). For M0, this is a placeholder that runs the
fixture end-to-end twice and compares ledger head hashes — which is the
same correctness property at smaller scope.

Usage:
  scripts/replay-day.py --date 2023-03-13
"""

from __future__ import annotations

import argparse
import hashlib
import os
import subprocess
import sys
from pathlib import Path


def compute_ledger_hash(ledger_dir: Path) -> str:
    """Hash every file under the agent's ledger directory deterministically."""
    h = hashlib.sha256()
    for p in sorted(ledger_dir.rglob("*")):
        if p.is_file() and "signing.key" not in str(p):
            h.update(p.read_bytes())
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True, help="YYYY-MM-DD of the day to replay")
    ap.add_argument("--agent", default="momentum-signal-01",
                    help="Which agent's ledger to hash-compare (default: momentum-signal-01)")
    args = ap.parse_args()

    root = Path(__file__).resolve().parent.parent
    ledger_root = root / "ledger-data" / args.agent

    # Run 1: bring stack up, wait for collector EOF, snapshot hash, bring down.
    print(f"==> run 1: stack up, replay {args.date}")
    _compose(root, "up", "-d", "--build")
    _wait_for_eof(root, timeout_s=300)
    first_hash = compute_ledger_hash(ledger_root) if ledger_root.exists() else ""
    print(f"   first ledger hash: {first_hash or '<empty>'}")
    _compose(root, "down", "-v")

    # Run 2: wipe ledger-data, bring stack up again, same fixture.
    print("==> run 2: wipe + replay")
    shutil_rmtree(root / "ledger-data")
    _compose(root, "up", "-d", "--build")
    _wait_for_eof(root, timeout_s=300)
    second_hash = compute_ledger_hash(ledger_root) if ledger_root.exists() else ""
    print(f"   second ledger hash: {second_hash or '<empty>'}")
    _compose(root, "down")

    if not first_hash or not second_hash:
        print("REPLAY FAILED: one or both ledger snapshots were empty", file=sys.stderr)
        return 1

    if first_hash == second_hash:
        print("REPLAY DETERMINISTIC: ledger hashes match")
        return 0
    else:
        print("REPLAY NON-DETERMINISTIC: ledger hashes differ", file=sys.stderr)
        return 1


def _compose(root: Path, *args: str) -> None:
    subprocess.run(["docker", "compose", *args], cwd=root, check=True)


def _wait_for_eof(root: Path, timeout_s: int) -> None:
    """Wait for the collector container to exit (signals fixture EOF)."""
    import time
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        r = subprocess.run(
            ["docker", "compose", "ps", "--status", "exited", "--services"],
            cwd=root, capture_output=True, text=True, check=False,
        )
        if "aletheia-core" in (r.stdout or ""):
            return
        time.sleep(2)
    raise RuntimeError("timed out waiting for collector EOF")


def shutil_rmtree(p: Path) -> None:
    if p.exists():
        import shutil
        shutil.rmtree(p)


if __name__ == "__main__":
    sys.exit(main())
