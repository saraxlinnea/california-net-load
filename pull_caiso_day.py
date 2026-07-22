"""
Pull one real CAISO day:
  - grid_timeseries_YYYY-MM-DD.csv  (load, solar, wind, net load)
  - fuel_mix_YYYY-MM-DD.csv         (full hourly fuel mix for Phase C)

Usage:
  python pull_caiso_day.py 2026-07-15

If SSL fails on macOS Python.org builds:
  export SSL_CERT_FILE=$(python -c "import certifi; print(certifi.where())")
"""

from __future__ import annotations

import argparse
import enum
import sys
from pathlib import Path

if sys.version_info < (3, 11) and not hasattr(enum, "StrEnum"):

    class StrEnum(str, enum.Enum):
        def __str__(self) -> str:
            return str(self.value)

        def __format__(self, format_spec: str) -> str:
            return str.__format__(self.value, format_spec)

    enum.StrEnum = StrEnum  # type: ignore[attr-defined, assignment]

import pandas as pd
import gridstatus

OUT_DIR = Path("data/processed")
DEFAULT_DATE = "2025-08-21"
SYSTEM_TAC = "CA ISO-TAC"

PEAK_DAY_CHECKS = {
    "2025-08-21": {"expected_peak_mw": 44506, "tolerance_mw": 1500},
    "2024-09-05": {"expected_peak_mw": 48323, "tolerance_mw": 1500},
}

# Canonical fuel columns we persist (MW). Batteries may be negative (charging).
FUEL_COLUMNS = [
    "Solar",
    "Wind",
    "Geothermal",
    "Biomass",
    "Biogas",
    "Small Hydro",
    "Coal",
    "Nuclear",
    "Natural Gas",
    "Large Hydro",
    "Batteries",
    "Imports",
    "Other",
]


def _time_column(df: pd.DataFrame) -> pd.Series:
    if "Time" in df.columns:
        return df["Time"]
    if "Interval Start" in df.columns:
        return df["Interval Start"]
    raise KeyError(f"No Time / Interval Start column in {list(df.columns)}")


def build_hourly_fuel(date: str) -> pd.DataFrame:
    caiso = gridstatus.CAISO()
    fuel_df = caiso.get_fuel_mix(date).copy()
    fuel_df["Time"] = _time_column(fuel_df)
    present = [c for c in FUEL_COLUMNS if c in fuel_df.columns]
    extra = [
        c
        for c in fuel_df.columns
        if c not in ("Time", "Interval Start", "Interval End") and c not in present
    ]
    cols = present + extra
    hourly = fuel_df.set_index("Time")[cols].resample("1h").mean().reset_index()
    # Clip generation fuels at 0; keep Batteries signed (charge/discharge)
    for c in cols:
        if c == "Batteries":
            continue
        hourly[c] = hourly[c].clip(lower=0)
    hourly["source"] = "CAISO via gridstatus"
    hourly["as_of_date"] = date
    return hourly


def build_grid_timeseries(date: str, fuel_hourly: pd.DataFrame) -> pd.DataFrame:
    caiso = gridstatus.CAISO()

    load_raw = caiso.get_load_hourly(date)
    if "TAC Area Name" in load_raw.columns:
        load_raw = load_raw[load_raw["TAC Area Name"] == SYSTEM_TAC].copy()
        if load_raw.empty:
            raise ValueError(f"No rows for TAC Area Name == {SYSTEM_TAC!r}")
    load_df = load_raw.copy()
    load_df["Time"] = _time_column(load_df)
    load_df = load_df[["Time", "Load"]].sort_values("Time").drop_duplicates("Time")

    df = pd.merge(load_df, fuel_hourly, on="Time", how="inner")

    solar = df["Solar"] if "Solar" in df.columns else 0
    wind = df["Wind"] if "Wind" in df.columns else 0
    df["net_load_MW"] = df["Load"] - solar - wind

    df = df.rename(columns={"Load": "load_MW", "Solar": "solar_MW", "Wind": "wind_MW"})
    df["solar_MW"] = df["solar_MW"].clip(lower=0)
    df["wind_MW"] = df["wind_MW"].clip(lower=0)
    df["source"] = "CAISO via gridstatus"
    df["as_of_date"] = date

    return df[
        ["Time", "load_MW", "solar_MW", "wind_MW", "net_load_MW", "source", "as_of_date"]
    ]


def sanity_check(df: pd.DataFrame, date: str) -> None:
    peak = float(df["load_MW"].max())
    print(f"Peak load: {peak:.0f} MW")
    print(f"Min net load: {df['net_load_MW'].min():.0f} MW")

    check = PEAK_DAY_CHECKS.get(date)
    if not check:
        print("No peak-day benchmark for this date (OK for ordinary days).")
        return

    expected = check["expected_peak_mw"]
    tol = check["tolerance_mw"]
    delta = abs(peak - expected)
    status = "PASS" if delta <= tol else "FAIL"
    print(
        f"Sanity check [{status}]: hourly peak {peak:.0f} MW vs instantaneous "
        f"{expected:,} MW (±{tol} MW); |Δ|={delta:.0f} MW"
    )
    if status == "FAIL":
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Pull one CAISO day into data/processed/")
    parser.add_argument(
        "date",
        nargs="?",
        default=DEFAULT_DATE,
        help=f"YYYY-MM-DD (default: {DEFAULT_DATE})",
    )
    args = parser.parse_args()
    date = args.date

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fuel = build_hourly_fuel(date)
    grid = build_grid_timeseries(date, fuel)

    print(grid.head(24))
    print(f"\nGrid rows: {len(grid)}")
    print(f"Fuel columns: {[c for c in fuel.columns if c not in ('Time','source','as_of_date')]}")
    if "Batteries" in fuel.columns:
        print(
            f"Batteries range: {fuel['Batteries'].min():.0f} … {fuel['Batteries'].max():.0f} MW "
            "(neg=charge, pos=discharge)"
        )
    sanity_check(grid, date)

    grid_path = OUT_DIR / f"grid_timeseries_{date}.csv"
    fuel_path = OUT_DIR / f"fuel_mix_{date}.csv"
    grid.to_csv(grid_path, index=False)
    fuel.to_csv(fuel_path, index=False)
    print(f"Wrote {grid_path}")
    print(f"Wrote {fuel_path}")


if __name__ == "__main__":
    main()
