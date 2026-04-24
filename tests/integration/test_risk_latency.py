"""M0 Acceptance Test #3 — Risk Overlord latency p99 < 100 ms.

M0 scope: prove the code-path budget is respected on the hot breach-to-
decision path. The full-stack NATS round-trip version (published fills →
risk-override on the wire, measured in pytest) requires a signed-envelope
fill injector that lands in M1 along with the standalone decision helper.

This test delegates to the Rust integration test
``agents/rust/risk-overlord/tests/latency_budget.rs`` which measures the
hot path 1000× and asserts p99 < 100 000 µs.

Runs locally if ``cargo`` is on PATH, otherwise falls back to the pinned
Rust Docker image.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
RUST_IMAGE = "rust:1.88-slim-bookworm"


def _run_in_docker() -> subprocess.CompletedProcess[str]:
    cmd = (
        "apt-get update -qq && "
        "apt-get install -y -qq pkg-config libssl-dev protobuf-compiler "
        "  libprotobuf-dev clang libclang-dev cmake 2>&1 >/dev/null && "
        "cargo test -p risk-overlord --test latency_budget -- --nocapture"
    )
    return subprocess.run(
        [
            "docker", "run", "--rm",
            "-v", f"{REPO}:/work", "-w", "/work",
            RUST_IMAGE,
            "bash", "-c", cmd,
        ],
        capture_output=True,
        text=True,
        timeout=15 * 60,
    )


@pytest.mark.acceptance
def test_risk_overlord_p99_under_100ms():
    if shutil.which("cargo"):
        result = subprocess.run(
            [
                "cargo", "test",
                "-p", "risk-overlord",
                "--test", "latency_budget",
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
        f"latency_budget test failed.\n"
        f"--- stdout ---\n{result.stdout}\n"
        f"--- stderr ---\n{result.stderr}"
    )
    # Ensure the p99 line printed — sanity check that we actually measured.
    assert "risk-overlord hot path" in result.stdout, (
        f"latency measurement never printed; output was:\n{result.stdout}"
    )
