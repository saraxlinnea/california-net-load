import type { Data, Layout } from "plotly.js";
import type { EmissionFactor, FuelMixRow } from "./fuelTypes";
import { FUEL_COLORS, FUEL_STACK_ORDER } from "./fuelTypes";
import { PLOTLY_MUTED, basePlotlyLayout } from "./chartConfig";

export function computeCarbonIntensity(
  rows: FuelMixRow[],
  factors: EmissionFactor[],
): { times: string[]; ci: number[]; gasMw: number[]; batteryMw: number[] } {
  const ef = new Map(
    factors.map((f) => [f.fuel, f] as const),
  );
  const times: string[] = [];
  const ci: number[] = [];
  const gasMw: number[] = [];
  const batteryMw: number[] = [];

  for (const row of rows) {
    times.push(row.Time);
    gasMw.push(Number(row["Natural Gas"] ?? 0));
    batteryMw.push(Number(row.Batteries ?? 0));

    let lbs = 0;
    let mwh = 0;
    for (const fuel of FUEL_STACK_ORDER) {
      const meta = ef.get(fuel);
      if (!meta || !meta.include_in_ci) continue;
      const mw = Math.max(Number(row[fuel as keyof FuelMixRow] ?? 0), 0);
      lbs += mw * meta.lb_co2_per_mwh;
      mwh += mw;
    }
    // Battery discharge only (positive): 0 EF but dilutes CI slightly
    const batt = Number(row.Batteries ?? 0);
    const battMeta = ef.get("Batteries");
    if (batt > 0 && battMeta) {
      lbs += batt * battMeta.lb_co2_per_mwh;
      mwh += batt;
    }
    ci.push(mwh > 0 ? lbs / mwh : 0);
  }

  return { times, ci, gasMw, batteryMw };
}

export function buildFuelMixTraces(
  rows: FuelMixRow[],
  showBatteries: boolean,
): Data[] {
  const times = rows.map((r) => r.Time);
  const traces: Data[] = [];

  for (const fuel of FUEL_STACK_ORDER) {
    const y = rows.map((r) => Math.max(Number(r[fuel as keyof FuelMixRow] ?? 0), 0));
    if (y.every((v) => v === 0)) continue;
    traces.push({
      x: times,
      y,
      name: fuel,
      type: "scatter",
      mode: "none",
      stackgroup: "fuel",
      fillcolor: FUEL_COLORS[fuel] ?? "rgba(100,100,100,0.5)",
      line: { width: 0 },
      hovertemplate: "%{y:,.0f} MW<extra>" + fuel + "</extra>",
    });
  }

  if (showBatteries) {
    traces.push({
      x: times,
      y: rows.map((r) => Number(r.Batteries ?? 0)),
      name: "Batteries (+discharge / −charge)",
      type: "scatter",
      mode: "lines",
      line: { color: FUEL_COLORS.Batteries, width: 2.5 },
      hovertemplate: "%{y:,.0f} MW<extra>Batteries</extra>",
    });
  }

  return traces;
}

export function buildCarbonIntensityTrace(
  times: string[],
  ci: number[],
): Data {
  return {
    x: times,
    y: ci,
    name: "Carbon intensity (lb CO₂/MWh)",
    type: "scatter",
    mode: "lines",
    line: { color: "#5c3d2e", width: 2.5 },
    yaxis: "y2",
    hovertemplate: "%{y:.0f} lb CO₂/MWh<extra>CI</extra>",
  };
}

export function buildFuelLayout(showCi: boolean): Partial<Layout> {
  const base = basePlotlyLayout({
    margin: { t: 56, r: showCi ? 72 : 24, b: 52, l: 60 },
  });
  const layout: Partial<Layout> = {
    ...base,
    title: {
      text: "Hourly generation mix and carbon intensity",
      font: { size: 14 },
      x: 0,
      xanchor: "left",
    },
    xaxis: {
      ...base.xaxis,
      title: { text: "Hour (US/Pacific)", font: { size: 11, color: PLOTLY_MUTED } },
      tickformat: "%-I %p",
      dtick: 3 * 60 * 60 * 1000,
    },
    yaxis: {
      ...base.yaxis,
      title: {
        text: "Generation (MW)",
        font: { size: 11, color: PLOTLY_MUTED },
      },
      zeroline: true,
    },
  };
  if (showCi) {
    layout.yaxis2 = {
      title: {
        text: "lb CO₂/MWh",
        font: { size: 11, color: PLOTLY_MUTED },
      },
      overlaying: "y",
      side: "right",
      showgrid: false,
      rangemode: "tozero",
      tickfont: { color: PLOTLY_MUTED, size: 11 },
    };
  }
  return layout;
}

const MIDDAY_HOURS = new Set([10, 11, 12, 13, 14, 15]);
const EVENING_HOURS = new Set([17, 18, 19, 20, 21]);

/** Highlight fuels for midday vs evening share bars; others roll into Other. */
const PERIOD_FUELS = [
  "Solar",
  "Wind",
  "Natural Gas",
  "Imports",
  "Large Hydro",
  "Nuclear",
] as const;

export type PeriodFuelShare = {
  fuel: string;
  middayPct: number;
  eveningPct: number;
  middayMwh: number;
  eveningMwh: number;
};

function hourFromFuelTime(time: string): number {
  const match = time.match(/[ T](\d{2}):/);
  return match ? Number(match[1]) : -1;
}

/**
 * Generation energy shares by fuel for midday (10–15) vs evening (17–21).
 * Operational CAISO mix for this day; not end-use.
 */
export function middayEveningFuelShares(
  rows: FuelMixRow[],
): PeriodFuelShare[] {
  const midday: Record<string, number> = {};
  const evening: Record<string, number> = {};
  let midTotal = 0;
  let eveTotal = 0;

  const bump = (
    bag: Record<string, number>,
    fuel: string,
    mw: number,
  ) => {
    bag[fuel] = (bag[fuel] ?? 0) + mw;
  };

  for (const row of rows) {
    const h = hourFromFuelTime(row.Time);
    const inMid = MIDDAY_HOURS.has(h);
    const inEve = EVENING_HOURS.has(h);
    if (!inMid && !inEve) continue;

    for (const fuel of FUEL_STACK_ORDER) {
      const mw = Math.max(Number(row[fuel as keyof FuelMixRow] ?? 0), 0);
      if (mw <= 0) continue;
      const key = (PERIOD_FUELS as readonly string[]).includes(fuel)
        ? fuel
        : "Other";
      if (inMid) {
        bump(midday, key, mw);
        midTotal += mw;
      }
      if (inEve) {
        bump(evening, key, mw);
        eveTotal += mw;
      }
    }
  }

  const fuels = [
    ...PERIOD_FUELS.filter(
      (f) => (midday[f] ?? 0) + (evening[f] ?? 0) > 0,
    ),
    ...((midday.Other ?? 0) + (evening.Other ?? 0) > 0
      ? (["Other"] as const)
      : []),
  ];

  return fuels.map((fuel) => {
    const middayMwh = midday[fuel] ?? 0;
    const eveningMwh = evening[fuel] ?? 0;
    return {
      fuel,
      middayMwh,
      eveningMwh,
      middayPct: midTotal > 0 ? (middayMwh / midTotal) * 100 : 0,
      eveningPct: eveTotal > 0 ? (eveningMwh / eveTotal) * 100 : 0,
    };
  });
}

export function buildMiddayEveningShareTraces(
  shares: PeriodFuelShare[],
): Data[] {
  if (!shares.length) return [];
  return shares.map((s) => ({
    type: "bar" as const,
    name: s.fuel,
    x: ["Midday 10–15", "Evening 17–21"],
    y: [s.middayPct, s.eveningPct],
    marker: { color: FUEL_COLORS[s.fuel] ?? "rgba(100,100,100,0.5)" },
    hovertemplate:
      "%{fullData.name}<br>%{x}: %{y:.1f}% of period generation<extra></extra>",
  }));
}

export function buildMiddayEveningShareLayout(
  date: string,
): Partial<Layout> {
  const base = basePlotlyLayout({
    margin: { t: 56, r: 24, b: 48, l: 56 },
  });
  return {
    ...base,
    barmode: "stack",
    title: {
      text: `Midday vs evening generation share (${date})`,
      font: { size: 14 },
      x: 0,
      xanchor: "left",
    },
    xaxis: {
      ...base.xaxis,
      title: {
        text: "Period",
        font: { size: 11, color: PLOTLY_MUTED },
      },
    },
    yaxis: {
      ...base.yaxis,
      title: {
        text: "% of period generation",
        font: { size: 11, color: PLOTLY_MUTED },
      },
      range: [0, 100],
    },
  };
}
