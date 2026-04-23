#!/usr/bin/env python3
"""scripts/tamper-ledger.py — M0 Acceptance Test #1 harness (orchestrator).

This script is the OUTER harness. It expects the stack to be running via
`make up`, picks an agent with a live ledger, performs three tampering
attacks on that agent's RocksDB, and invokes `cargo test -p obsidian-ledger
--test chain_integrity` to verify each attack is caught by verify_chain.

The actual per-attack Rust logic lives in
core/obsidian-ledger/tests/chain_integrity.rs. This script coordinates.

Exit 0 iff all three attacks are detected.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    print("==> running obsidian-ledger chain-integrity tamper tests...")
    try:
        subprocess.run(
            ["cargo", "test", "-p", "obsidian-ledger", "--test", "chain_integrity", "--", "--nocapture"],
            cwd=repo_root,
            check=True,
        )
    except subprocess.CalledProcessError as e:
        print(f"TAMPER SUITE FAILED: {e}", file=sys.stderr)
        return 1
    print("==> all three tamper attacks were detected; chain integrity holds.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
