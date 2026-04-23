"""M0 Acceptance Test #1 — Ledger immutability.

Delegates the real work to the Rust test suite, which has direct access to
RocksDB to perform the three tampering attacks. This file is the
pytest-visible entrypoint so `make test-acceptance` covers all 6 tests.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def test_all_three_tamper_attacks_are_caught():
    result = subprocess.run(
        [
            "cargo", "test",
            "-p", "obsidian-ledger",
            "--test", "chain_integrity",
            "--", "--nocapture",
        ],
        cwd=REPO,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, (
        f"chain_integrity test suite failed.\n"
        f"--- stdout ---\n{result.stdout}\n"
        f"--- stderr ---\n{result.stderr}"
    )
