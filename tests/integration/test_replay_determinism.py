"""M0 Acceptance Test #2 — Replay determinism.

Runs the fixture end-to-end twice (via scripts/replay-day.py) and asserts
ledger hashes match bit-for-bit. Requires `make up` to have been run.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]


@pytest.mark.acceptance
def test_replay_two_runs_produce_identical_ledger_hashes():
    result = subprocess.run(
        ["python3", "scripts/replay-day.py", "--date", "2023-03-13"],
        cwd=REPO,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, (
        f"replay-day.py failed.\n"
        f"--- stdout ---\n{result.stdout}\n"
        f"--- stderr ---\n{result.stderr}"
    )
    assert "REPLAY DETERMINISTIC" in result.stdout
