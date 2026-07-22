import type { Data, Layout } from "plotly.js";
import type { FuelMixRow } from "./fuelTypes";
import { FUEL_COLORS, FUEL_STACK_ORDER } from "./fuelTypes";

export type DayFuelShare = {
  fuel: string;
  mwh: number;
  pct: number;
};

/**
 * Day generation energy by fuel (MWh ≈ sum of hourly MW).
 * Batteries: discharge only (max(0, MW)); charging is energy shifting, not generation.
 */
export function dayFuelGenerationMwh(rows: FuelMixRow[]): DayFuelShare[] {
  if (!rows.length) return [];

  const totals: Record<string, number> = {};
  for (const fuel of FUEL_STACK_ORDER) {
    totals[fuel] = 0;
  }
  totals.Batteries = 0;

  for (const row of rows) {
    for (const fuel of FUEL_STACK_ORDER) {
      totals[fuel] += Math.max(Number(row[fuel] ?? 0), 0);
    }
    totals.Batteries += Math.max(Number(row.Batteries ?? 0), 0);
  }

  const order = [...FUEL_STACK_ORDER, "Batteries"] as const;
  const grand = order.reduce((s, f) => s + totals[f], 0);
  if (grand <= 0) return [];

  return order
    .map((fuel) => ({
      fuel,
      mwh: totals[fuel],
      pct: (totals[fuel] / grand) * 100,
    }))
    .filter((s) => s.mwh > 0)
    .sort((a, b) => b.mwh - a.mwh);
}

export function buildGenerationPieTraces(shares: DayFuelShare[]): Data[] {
  if (!shares.length) return [];
  return [
    {
      type: "pie",
      labels: shares.map((s) => s.fuel),
      values: shares.map((s) => s.mwh),
      hole: 0.45,
      sort: false,
      textinfo: "label+percent",
      textposition: "outside",
      marker: {
        colors: shares.map(
          (s) => FUEL_COLORS[s.fuel] ?? "rgba(100,100,100,0.5)",
        ),
      },
      hovertemplate: "%{label}<br>%{value:,.0f} MWh<br>%{percent}<extra></extra>",
    },
  ];
}

export function buildGenerationPieLayout(date: string): Partial<Layout> {
  return {
    title: {
      text: `Where this day’s CAISO generation came from (${date})`,
      font: { size: 14 },
      x: 0,
      xanchor: "left",
    },
    margin: { l: 20, r: 20, t: 48, b: 20 },
    showlegend: true,
    legend: { orientation: "v", x: 1.02, y: 0.5 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
  };
}

export const GENERATION_PIE_CAVEAT =
  "Generation by fuel for this CAISO day (hourly MW summed as MWh). Not customer end-use. Battery slice is discharge only; charging is energy shifting.";

export const END_USE_NOTE =
  "CAISO fuel mix is generation by fuel, not customer end-use; homes/industry slices are not shown. CEC cites ~1,000 MW / ~2% of CAISO peak for data centers (peak demand share, not annual energy); not a pie slice here. See Methods.";
