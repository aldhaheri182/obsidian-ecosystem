#!/usr/bin/env python3
"""scripts/seed-csv.py — ensure the AAPL fixture is present.

The M0 fixture is committed to the repo at tests/fixtures/aapl_2023-03-13_1min.csv,
so this script is mostly a health check. If the file is missing, it regenerates
a synthetic fixture with plausible OHLCV structure.
"""

from __future__ import annotations

import csv
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

FIXTURE = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "aapl_2023-03-13_1min.csv"


def synthesize(rows: int = 390) -> None:
    """Generate a plausible 1-min bar sequence starting 2023-03-13 13:30 UTC."""
    start = datetime(2023, 3, 13, 13, 30, tzinfo=timezone.utc)
    price = 150.0
    rnd = random.Random(42)
    with FIXTURE.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["timestamp", "symbol", "open", "high", "low", "close", "volume", "vwap"])
        for i in range(rows):
            o = price
            drift = rnd.gauss(0, 0.05)
            c = max(0.01, o + drift)
            h = max(o, c) + abs(rnd.gauss(0, 0.05))
            low = min(o, c) - abs(rnd.gauss(0, 0.05))
            vol = 80_000 + int(abs(rnd.gauss(0, 20_000)))
            vwap = (o + c + h + low) / 4
            ts = start + timedelta(minutes=i)
            w.writerow([ts.strftime("%Y-%m-%dT%H:%M:%SZ"), "AAPL",
                        f"{o:.2f}", f"{h:.2f}", f"{low:.2f}", f"{c:.2f}", vol, f"{vwap:.2f}"])
            price = c


def main() -> None:
    if FIXTURE.exists() and FIXTURE.stat().st_size > 0:
        print(f"OK: {FIXTURE} ({FIXTURE.stat().st_size} bytes)")
        return
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    synthesize()
    print(f"synthesized: {FIXTURE}")


if __name__ == "__main__":
    main()
