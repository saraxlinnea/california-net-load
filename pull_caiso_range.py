"""
Pull a contiguous range of CAISO days (grid + fuel mix), then optionally
build EV overlays for each day that has a grid CSV.

Usage:
  python pull_caiso_range.py 2025-08-20 2025-08-22
  python pull_caiso_range.py 2025-08-20 2025-08-22 --skip-ev

Requires network + SSL_CERT_FILE on some macOS Python builds (see README).
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def parse_day(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Pull CAISO grid+fuel for each day in [start, end]"
    )
    parser.add_argument("start", help="YYYY-MM-DD inclusive")
    parser.add_argument("end", help="YYYY-MM-DD inclusive")
    parser.add_argument(
        "--skip-ev",
        action="store_true",
        help="Only pull grid/fuel; skip ev_load_overlay.py",
    )
    args = parser.parse_args()

    start = parse_day(args.start)
    end = parse_day(args.end)
    if end < start:
        print("end must be >= start", file=sys.stderr)
        sys.exit(2)

    days = list(daterange(start, end))
    if len(days) > 31:
        print(
            f"Refusing {len(days)} days (>31). Split the range.",
            file=sys.stderr,
        )
        sys.exit(2)

    print(f"Pulling {len(days)} day(s): {start} → {end}")
    failed: list[str] = []

    for d in days:
        ds = d.isoformat()
        print(f"\n=== {ds} ===")
        r = subprocess.run(
            [sys.executable, str(ROOT / "pull_caiso_day.py"), ds],
            cwd=ROOT,
        )
        if r.returncode != 0:
            failed.append(ds)
            continue
        if args.skip_ev:
            continue
        grid = ROOT / "data" / "processed" / f"grid_timeseries_{ds}.csv"
        if grid.exists():
            r2 = subprocess.run(
                [sys.executable, str(ROOT / "ev_load_overlay.py"), str(grid)],
                cwd=ROOT,
            )
            if r2.returncode != 0:
                failed.append(f"{ds} (ev overlay)")

    if failed:
        print(f"\nFailed: {', '.join(failed)}", file=sys.stderr)
        sys.exit(1)
    print("\nDone. Run: cd frontend && npm run sync-data")


if __name__ == "__main__":
    main()
