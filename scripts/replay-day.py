#!/usr/bin/env python3
"""scripts/replay-day.py — M0 Acceptance Test #2 harness (orchestrator).

Deterministic-replay proof. Two independent writes of the same fixture must
produce bit-identical ledger hashes.

Original M0 design called for running the full Docker stack twice and
diffing the on-disk ``ledger-data/*``, but current M0 agents don't persist
RocksDB in production — they publish to NATS and the tape is the source of
truth. So the architectural invariant lives in the ledger crate itself:

    core/obsidian-ledger/tests/deterministic_entry_id.rs::
      two_independent_ledgers_with_same_fixture_have_same_head_hash

This harness invokes that test. The full stack-level replay (which
rebuilds every ``ledger-data/*``) becomes meaningful once agents start
persisting RocksDB in M1 and will replace this delegation.

Usage:
    scripts/replay-day.py [--date YYYY-MM-DD]   # date ignored in M0
Exit 0 iff identical inputs produce identical ledger hashes.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

RUST_IMAGE = "rust:1.88-slim-bookworm"


def _run_cargo_locally(repo_root: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            "cargo",
            "test",
            "-p",
            "obsidian-ledger",
            "--test",
            "deterministic_entry_id",
            "--",
            "--nocapture",
        ],
        cwd=repo_root,
        capture_output=True,
        text=True,
    )


def _run_cargo_in_docker(repo_root: Path) -> subprocess.CompletedProcess[str]:
    cmd = (
        "apt-get update -qq && "
        "apt-get install -y -qq pkg-config libssl-dev protobuf-compiler "
        "  libprotobuf-dev clang libclang-dev cmake 2>&1 >/dev/null && "
        "cargo test -p obsidian-ledger --test deterministic_entry_id -- --nocapture"
    )
    return subprocess.run(
        [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{repo_root}:/work",
            "-w",
            "/work",
            RUST_IMAGE,
            "bash",
            "-c",
            cmd,
        ],
        capture_output=True,
        text=True,
        timeout=15 * 60,
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default="2023-03-13",
                    help="(M0: ignored — deterministic invariant covers any date)")
    ap.add_argument("--agent", default="momentum-signal-01",
                    help="(M0: ignored — test covers agent-independent invariant)")
    _ = ap.parse_args()

    repo = Path(__file__).resolve().parent.parent
    print("==> proving replay determinism via obsidian-ledger property test...")

    if shutil.which("cargo"):
        result = _run_cargo_locally(repo)
    elif shutil.which("docker"):
        print("    (cargo not on PATH; falling back to Docker rust:1.88-slim-bookworm)")
        result = _run_cargo_in_docker(repo)
    else:
        print("REPLAY FAILED: neither cargo nor docker is on PATH", file=sys.stderr)
        return 1

    print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, file=sys.stderr, end="")

    if result.returncode != 0:
        print("REPLAY FAILED: deterministic_entry_id tests did not pass",
              file=sys.stderr)
        return 1

    if "two_independent_ledgers_with_same_fixture_have_same_head_hash" not in result.stdout:
        print("REPLAY FAILED: did not see the cross-ledger determinism test",
              file=sys.stderr)
        return 1

    print("REPLAY DETERMINISTIC: two independent ledgers with the same "
          "fixture produce bit-identical head hashes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
