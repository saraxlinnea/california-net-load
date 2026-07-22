"""
Plot one verified CAISO day: load, solar, wind, and net load (duck/canyon curve).

Usage:
  python plot_duck_curve.py
  python plot_duck_curve.py data/processed/grid_timeseries_2025-08-21.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import pandas as pd

DEFAULT_CSV = Path("data/processed/grid_timeseries_2026-07-15.csv")


def plot_duck_curve(csv_path: Path) -> None:
    df = pd.read_csv(csv_path, parse_dates=["Time"])
    date = df["as_of_date"].iloc[0]

    fig, ax = plt.subplots(figsize=(11, 6))

    ax.plot(df["Time"], df["load_MW"], label="Total load", color="#333333", linewidth=2)
    ax.plot(
        df["Time"],
        df["net_load_MW"],
        label="Net load (load - solar - wind)",
        color="#c0392b",
        linewidth=2.5,
    )
    # Renewables fill the net↔total gap: wind on net floor, solar stacked above
    ax.fill_between(
        df["Time"],
        df["net_load_MW"],
        df["net_load_MW"] + df["wind_MW"],
        label="Wind (in gap)",
        color="#2980b9",
        alpha=0.45,
    )
    ax.fill_between(
        df["Time"],
        df["net_load_MW"] + df["wind_MW"],
        df["load_MW"],
        label="Solar (in gap)",
        color="#f1c40f",
        alpha=0.5,
    )

    ax.set_title(f"CAISO grid load — {date}", fontsize=14)
    ax.set_ylabel("MW")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%I %p"))
    ax.xaxis.set_major_locator(mdates.HourLocator(interval=3))
    ax.legend(loc="upper left")
    ax.grid(alpha=0.2)

    min_row = df.loc[df["net_load_MW"].idxmin()]
    max_row = df.loc[df["net_load_MW"].idxmax()]
    ax.annotate(
        f"Min net load\n{min_row['net_load_MW']:.0f} MW",
        xy=(min_row["Time"], min_row["net_load_MW"]),
        xytext=(0, -30),
        textcoords="offset points",
        ha="center",
        fontsize=9,
        color="#c0392b",
    )
    ax.annotate(
        f"Max net load\n{max_row['net_load_MW']:.0f} MW",
        xy=(max_row["Time"], max_row["net_load_MW"]),
        xytext=(0, 15),
        textcoords="offset points",
        ha="center",
        fontsize=9,
        color="#c0392b",
    )

    out_png = Path(f"duck_curve_{date}.png")
    fig.tight_layout()
    fig.savefig(out_png, dpi=150)
    print(f"Saved {out_png}")

    swing = max_row["net_load_MW"] - min_row["net_load_MW"]
    hours = (max_row["Time"] - min_row["Time"]).total_seconds() / 3600
    print(f"Net load swing: {swing:.0f} MW over {hours:.0f} hours")


def main() -> None:
    parser = argparse.ArgumentParser(description="Plot duck curve from a grid CSV")
    parser.add_argument(
        "csv",
        nargs="?",
        default=str(DEFAULT_CSV),
        help=f"path to grid_timeseries CSV (default: {DEFAULT_CSV})",
    )
    args = parser.parse_args()
    plot_duck_curve(Path(args.csv))


if __name__ == "__main__":
    main()
