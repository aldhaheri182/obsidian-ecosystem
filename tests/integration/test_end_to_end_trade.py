"""M0 Acceptance Test #5 — End-to-end paper trade.

Replays the AAPL fixture; asserts that at least one envelope of each of the
pipeline's MessageTypes appears on the Tape within a 60-second window of
`make up` completing.
"""

from __future__ import annotations

import time
from typing import Dict

import pytest
import urllib.request
import urllib.parse

CLICKHOUSE_URL = "http://localhost:8123"


def _ch_count(type_label: str) -> int:
    q = f"SELECT count() FROM obsidian.tape WHERE type = '{type_label}' FORMAT TabSeparated"
    r = urllib.request.urlopen(f"{CLICKHOUSE_URL}/?query={urllib.parse.quote(q)}", timeout=5)
    return int(r.read().decode().strip() or "0")


@pytest.mark.acceptance
def test_full_pipeline_reaches_tape_within_budget():
    # We expect the CSV collector to replay the fixture in ~23 s at speed
    # 1000x, then emit signals / orders / fills. Give the system 60 s.
    deadline = time.time() + 60
    need: Dict[str, int] = {
        "MARKET_DATA": 0,
        "SIGNAL": 0,
        "ORDER_REQUEST": 0,
        "FILL_REPORT": 0,
        "HEARTBEAT": 0,
    }
    while time.time() < deadline:
        try:
            done = True
            for t in list(need.keys()):
                need[t] = _ch_count(t)
                if need[t] <= 0:
                    done = False
            if done:
                break
        except Exception:
            pass
        time.sleep(2)

    for t, n in need.items():
        assert n > 0, f"tape never saw any {t}. current counts: {need}"
