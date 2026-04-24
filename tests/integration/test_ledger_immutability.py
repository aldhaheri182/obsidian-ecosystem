"""M0 Acceptance Test #1 — Ledger immutability.

Delegates the real work to the Rust test suite, which has direct access to
RocksDB to perform the three tampering attacks. This file is the
pytest-visible entrypoint so `make test-acceptance` covers all 6 tests.

If ``cargo`` is on PATH the test runs locally. Otherwise it falls back to
a pinned-Rust Docker image so the test still passes on operator hosts
that don't have the Rust toolchain installed (e.g. macOS Docker-Desktop-only).
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
RUST_IMAGE = "rust:1.88-slim-bookworm"


def _run_in_docker() -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            "docker", "run", "--rm",
            "-v", f"{REPO}:/work", "-w", "/work",
            RUST_IMAGE,
            "bash", "-c",
            (
                "apt-get update -qq && "
                "apt-get install -y -qq pkg-config libssl-dev protobuf-compiler "
                "  libprotobuf-dev clang libclang-dev cmake 2>&1 >/dev/null && "
                "cargo test -p obsidian-ledger --test chain_integrity -- --nocapture"
            ),
        ],
        capture_output=True,
        text=True,
        timeout=15 * 60,
    )


def test_all_three_tamper_attacks_are_caught():
    if shutil.which("cargo"):
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
    else:
        assert shutil.which("docker"), (
            "neither cargo nor docker is on PATH; install rust or start Docker"
        )
        result = _run_in_docker()
    assert result.returncode == 0, (
        f"chain_integrity test suite failed.\n"
        f"--- stdout ---\n{result.stdout}\n"
        f"--- stderr ---\n{result.stderr}"
    )
    # Sanity-check the expected lines appeared in stdout regardless of path.
    assert "attack_1_direct_rocksdb_write_tampers_payload" in result.stdout
    assert "attack_2_raw_file_edit_then_reopen" in result.stdout
    assert "attack_3_full_replace_with_different_key" in result.stdout
