"""
EV load overlay on CAISO net load.

Uses REAL CEC data for the charging shape — CEC 2022 IEPR PEV Load
Shapes file, Data sheet, summed across PGE, SCE, SDGE, LADWP, and SMUD.
Shape is selected automatically by season/day-type to match the grid date.

Usage:
  python ev_load_overlay.py
  python ev_load_overlay.py data/processed/grid_timeseries_2025-08-21.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

DEFAULT_GRID = Path("data/processed/grid_timeseries_2026-07-15.csv")
EV_SHAPE_CSV = Path("data/processed/ev_load_shapes_cec_2024_all.csv")
OUT_DIR = Path("data/processed")

# kWh/mile: converged estimate from DOE FOTW / EPA / NREL (~0.30)
KWH_PER_MILE = 0.30

# miles/day: contested in literature (~2x spread)
# Low: GW/NREL odometer study ~20 mi/day
# Mid: NHTS-based average ~27 mi/day
# High: UC Davis ITS newer EVs ~33 mi/day
MILES_PER_DAY_SCENARIOS = {"low": 20, "mid": 27, "high": 33}

# AFDC 2024, BEV (1,533,900) + PHEV (447,100) — matches CEC PEV definition
N_EV = 1_981_000


def season_day_type(target_date: str) -> tuple[str, str]:
    dt = pd.Timestamp(target_date)
    month = dt.month
    season = (
        "Winter"
        if month in (12, 1, 2, 3, 4)
        else "Summer"
        if month in (6, 7, 8, 9)
        else "Spring"
    )
    day_type = "Weekend" if dt.dayofweek >= 5 else "Weekday"
    return season, day_type


def load_cec_shape(target_date: str) -> np.ndarray:
    season, day_type = season_day_type(target_date)
    shapes = pd.read_csv(EV_SHAPE_CSV)
    match = shapes[(shapes["season"] == season) & (shapes["day_type"] == day_type)]
    if match.empty:
        raise ValueError(f"No CEC shape found for season={season}, day_type={day_type}")
    print(f"EV shape: {season} {day_type} (matched to {target_date})")
    return match.sort_values("hour")["share"].values


def build_ev_timeseries(grid_df: pd.DataFrame, target_date: str) -> pd.DataFrame:
    composite_shape = load_cec_shape(target_date)
    df = grid_df.copy()
    df["hour"] = df["Time"].dt.hour

    for label, miles_per_day in MILES_PER_DAY_SCENARIOS.items():
        daily_energy_mwh = (N_EV * miles_per_day * KWH_PER_MILE) / 1000
        ev_load_mw = daily_energy_mwh * composite_shape
        col = f"ev_load_MW_{label}"
        df[col] = df["hour"].map(dict(zip(range(24), ev_load_mw)))
        df[f"net_load_plus_ev_MW_{label}"] = df["net_load_MW"] + df[col]

    return df


def plot_overlay(df: pd.DataFrame, date: str) -> None:
    fig, ax = plt.subplots(figsize=(11, 6))

    ax.plot(
        df["Time"],
        df["net_load_MW"],
        label="Net load (grid only)",
        color="#c0392b",
        linewidth=2,
    )
    ax.plot(
        df["Time"],
        df["net_load_plus_ev_MW_mid"],
        label="Net load + EV (mid scenario, real CEC shape)",
        color="#8e44ad",
        linewidth=2.5,
        linestyle="--",
    )
    ax.fill_between(
        df["Time"],
        df["net_load_plus_ev_MW_low"],
        df["net_load_plus_ev_MW_high"],
        color="#8e44ad",
        alpha=0.15,
        label="Low-high scenario range",
    )
    ax.fill_between(
        df["Time"],
        0,
        df["ev_load_MW_mid"],
        label="EV charging load (mid, CEC 2024 shape)",
        color="#27ae60",
        alpha=0.4,
    )

    ax.set_title(
        f"CAISO net load with EV charging overlay (real CEC load shape) — {date}",
        fontsize=13,
    )
    ax.set_ylabel("MW")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%I %p"))
    ax.xaxis.set_major_locator(mdates.HourLocator(interval=3))
    ax.legend(loc="upper left", fontsize=9)
    ax.grid(alpha=0.2)

    peak_idx = df["ev_load_MW_mid"].idxmax()
    peak_ev_hour = df.loc[peak_idx, "Time"]
    peak_ev_mw = df["ev_load_MW_mid"].max()
    ax.annotate(
        f"Peak EV load, mid scenario (CEC shape)\n{peak_ev_mw:.0f} MW",
        xy=(peak_ev_hour, df.loc[peak_idx, "ev_load_MW_mid"]),
        xytext=(0, 20),
        textcoords="offset points",
        ha="center",
        fontsize=9,
        color="#27ae60",
    )

    out_png = Path(f"ev_overlay_{date}.png")
    fig.tight_layout()
    fig.savefig(out_png, dpi=150)
    print(f"Saved {out_png}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build EV overlay on a grid CSV")
    parser.add_argument(
        "csv",
        nargs="?",
        default=str(DEFAULT_GRID),
        help=f"path to grid_timeseries CSV (default: {DEFAULT_GRID})",
    )
    args = parser.parse_args()

    grid_path = Path(args.csv)
    date = grid_path.name.replace("grid_timeseries_", "").replace(".csv", "")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    grid_df = pd.read_csv(grid_path, parse_dates=["Time"])
    ev_df = build_ev_timeseries(grid_df, date)

    for label, miles in MILES_PER_DAY_SCENARIOS.items():
        daily_mwh = N_EV * miles * KWH_PER_MILE / 1000
        peak = ev_df[f"ev_load_MW_{label}"].max()
        print(
            f"[{label:>4}] {miles} mi/day -> {daily_mwh:.0f} MWh/day, "
            f"peak EV load (CEC shape): {peak:.0f} MW"
        )

    shapes = pd.read_csv(EV_SHAPE_CSV)
    season, day_type = season_day_type(date)
    cec_total = shapes[
        (shapes["season"] == season) & (shapes["day_type"] == day_type)
    ]["raw_mw"].sum()
    print(f"\nCEC's own implied daily total ({season} {day_type}): {cec_total:,.0f} MWh/day")
    for label, miles in MILES_PER_DAY_SCENARIOS.items():
        daily_mwh = N_EV * miles * KWH_PER_MILE / 1000
        print(f"  {label:>4} scenario ratio to CEC's own total: {daily_mwh / cec_total:.2f}x")

    out_csv = OUT_DIR / f"ev_timeseries_{date}.csv"
    ev_df.to_csv(out_csv, index=False)
    print(f"Wrote {out_csv}")
    plot_overlay(ev_df, date)


if __name__ == "__main__":
    main()
