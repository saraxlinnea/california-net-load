import type { Annotations, Data, Layout, Shape } from "plotly.js";
import type { EvRow, Scenario, TouPlan, TouRow } from "./types";
import { pgeSeasonForDate } from "./loadData";
import { computeEveningRamp } from "./insights";
import {
  type ChargingMode,
  cecEvLoads,
  evLoadsForMode,
  managedEvLoads,
  netPlusEv,
} from "./managedCharging";

const PERIOD_COLORS: Record<string, string> = {
  "Off-Peak": "rgba(42, 90, 72, 0.12)",
  "Partial-Peak": "rgba(196, 140, 48, 0.14)",
  Peak: "rgba(176, 58, 46, 0.16)",
};

/** Match App.css tokens (--ink, --muted, --accent-2). */
export const PLOTLY_INK = "#1a1d21";
export const PLOTLY_MUTED = "#5c636b";
export const PLOTLY_ACCENT = "#2a5a48";
export const PLOTLY_GRID = "rgba(26, 29, 33, 0.08)";
export const PLOTLY_GRID_SOFT = "rgba(26, 29, 33, 0.05)";
export const PLOTLY_FONT =
  '"IBM Plex Sans", "Segoe UI", sans-serif' as const;

export type BasePlotlyOpts = {
  margin?: { t?: number; r?: number; b?: number; l?: number; pad?: number };
  showLegend?: boolean;
  /** Dense multi-trace charts (Cost) use a right legend; default is top horizontal. */
  legendPlacement?: "top" | "right";
};

/** Shared Plotly chrome: transparent paper/plot, quiet legend + grids. */
export function basePlotlyLayout(opts: BasePlotlyOpts = {}): Partial<Layout> {
  const showLegend = opts.showLegend !== false;
  const legendPlacement = opts.legendPlacement ?? "top";
  const legend =
    !showLegend
      ? { orientation: "h" as const }
      : legendPlacement === "right"
        ? {
            orientation: "v" as const,
            x: 1.02,
            y: 0.5,
            bgcolor: "rgba(0,0,0,0)",
            borderwidth: 0,
            font: { size: 10, color: PLOTLY_MUTED },
          }
        : {
            orientation: "h" as const,
            y: 1.12,
            x: 0,
            bgcolor: "rgba(0,0,0,0)",
            borderwidth: 0,
            font: { size: 10, color: PLOTLY_MUTED },
          };
  return {
    margin: {
      t: 40,
      r: legendPlacement === "right" ? 140 : 24,
      b: 52,
      l: 60,
      ...(opts.margin ?? {}),
    },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: {
      family: PLOTLY_FONT,
      color: PLOTLY_INK,
      size: 12,
    },
    legend,
    xaxis: {
      gridcolor: PLOTLY_GRID_SOFT,
      zeroline: false,
      linecolor: PLOTLY_GRID,
      tickfont: { color: PLOTLY_MUTED, size: 11 },
      title: { font: { size: 11, color: PLOTLY_MUTED } },
    },
    yaxis: {
      gridcolor: PLOTLY_GRID,
      zeroline: false,
      linecolor: PLOTLY_GRID,
      tickfont: { color: PLOTLY_MUTED, size: 11 },
      title: { font: { size: 11, color: PLOTLY_MUTED } },
    },
    hovermode: "x unified",
    hoverlabel: {
      bgcolor: "#ffffff",
      bordercolor: PLOTLY_GRID,
      font: { family: PLOTLY_FONT, size: 12, color: PLOTLY_INK },
    },
  };
}

function hourToIso(date: string, hour: number): string {
  if (hour >= 24) {
    const [y, m, d] = date.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    const nd = next.toISOString().slice(0, 10);
    return `${nd} 00:00:00`;
  }
  const h = String(hour).padStart(2, "0");
  return `${date} ${h}:00:00`;
}

export function buildTouShapes(
  date: string,
  plan: TouPlan,
  touRows: TouRow[],
  yMax: number,
): Array<Partial<Shape>> {
  const season = pgeSeasonForDate(date);
  const bands = touRows.filter((r) => r.plan === plan && r.season === season);

  return bands.map((band) => ({
    type: "rect" as const,
    xref: "x",
    yref: "y",
    x0: hourToIso(date, band.start_hour),
    x1: hourToIso(date, band.end_hour === 24 ? 24 : band.end_hour),
    y0: 0,
    y1: yMax,
    fillcolor: PERIOD_COLORS[band.period] ?? "rgba(0,0,0,0.08)",
    line: { width: 0 },
    layer: "below" as const,
  }));
}

export function buildTouRateTrace(
  date: string,
  plan: TouPlan,
  touRows: TouRow[],
): Data {
  const season = pgeSeasonForDate(date);
  const bands = touRows
    .filter((r) => r.plan === plan && r.season === season)
    .sort((a, b) => a.start_hour - b.start_hour);

  const xs: string[] = [];
  const ys: number[] = [];
  for (const band of bands) {
    xs.push(hourToIso(date, band.start_hour));
    ys.push(band.rate_cents_kwh);
    xs.push(hourToIso(date, band.end_hour === 24 ? 24 : band.end_hour));
    ys.push(band.rate_cents_kwh);
  }

  return {
    x: xs,
    y: ys,
    name: `${plan} rate (¢/kWh)`,
    type: "scatter",
    mode: "lines",
    line: { color: "#6b5a3e", width: 2, shape: "hv" },
    yaxis: "y2",
    hovertemplate: "%{y:.0f}¢/kWh<extra>%{fullData.name}</extra>",
  };
}

/**
 * Renewables fill the gap between net load and total load
 * (load − net = solar + wind). Wind sits on the net-load floor;
 * solar stacks on wind up to total load.
 */
export function buildChartTraces(
  rows: EvRow[],
  scenario: Scenario,
  showDuck: boolean,
  showEv: boolean,
  chargingMode: ChargingMode = "cec",
  date = "",
  plan: TouPlan = "EV2-A",
  touRows: TouRow[] = [],
): Data[] {
  const times = rows.map((r) => r.Time);
  const net = rows.map((r) => r.net_load_MW);
  const load = rows.map((r) => r.load_MW);
  const wind = rows.map((r) => r.wind_MW);
  const solar = rows.map((r) => r.solar_MW);
  const netPlusWind = rows.map((r) => r.net_load_MW + r.wind_MW);
  const traces: Data[] = [];

  if (showDuck) {
    traces.push({
      x: times,
      y: net,
      name: "_gap_base",
      type: "scatter",
      mode: "lines",
      line: { width: 0, color: "rgba(0,0,0,0)" },
      hoverinfo: "skip",
      showlegend: false,
    });
    traces.push({
      x: times,
      y: netPlusWind,
      name: "Wind (in gap)",
      type: "scatter",
      mode: "lines",
      fill: "tonexty",
      line: { width: 0 },
      fillcolor: "rgba(42, 111, 151, 0.5)",
      customdata: wind,
      hovertemplate: "%{customdata:,.0f} MW<extra>Wind</extra>",
    });
    traces.push({
      x: times,
      y: load,
      name: "Solar (in gap)",
      type: "scatter",
      mode: "lines",
      fill: "tonexty",
      line: { width: 0 },
      fillcolor: "rgba(212, 160, 23, 0.5)",
      customdata: solar,
      hovertemplate: "%{customdata:,.0f} MW<extra>Solar</extra>",
    });
    traces.push({
      x: times,
      y: load,
      name: "Total load",
      type: "scatter",
      mode: "lines",
      line: { color: "#1c1c1c", width: 2.5 },
      hovertemplate: "%{y:,.0f} MW<extra>Total load</extra>",
    });
  }

  traces.push({
    x: times,
    y: net,
    name: "Net load (grid only)",
    type: "scatter",
    mode: "lines",
    line: { color: "#b03a2e", width: 2.5 },
    hovertemplate: "%{y:,.0f} MW<extra>Net load</extra>",
  });

  if (showEv) {
    const active = evLoadsForMode(
      rows,
      scenario,
      chargingMode,
      date,
      plan,
      touRows,
    );
    const activePlus = netPlusEv(rows, active);
    const ghostMode: ChargingMode =
      chargingMode === "cec" ? "managed" : "cec";
    const ghost = evLoadsForMode(
      rows,
      scenario,
      ghostMode,
      date,
      plan,
      touRows,
    );
    const ghostPlus = netPlusEv(rows, ghost);
    const modeName = (m: ChargingMode) =>
      m === "managed" ? "midday" : m === "offpeak" ? "off-peak" : "CEC";
    const activeLabel = `EV ${modeName(chargingMode)} (${scenario})`;
    const ghostLabel = `EV ${modeName(ghostMode)} (compare)`;

    traces.push({
      x: times,
      y: ghost,
      name: ghostLabel,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(31, 122, 76, 0.35)", width: 1.5, dash: "dot" },
      hovertemplate: "%{y:,.0f} MW<extra>" + ghostLabel + "</extra>",
    });
    traces.push({
      x: times,
      y: ghostPlus,
      name: `Net + ${modeName(ghostMode)} (compare)`,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(90, 62, 110, 0.35)", width: 1.5, dash: "dot" },
      hovertemplate: "%{y:,.0f} MW<extra>Net + compare</extra>",
    });

    traces.push({
      x: times,
      y: active,
      name: activeLabel,
      type: "scatter",
      mode: "lines",
      fill: "tozeroy",
      line: {
        color: chargingMode === "cec" ? "#1f7a4c" : "#0d6e4f",
        width: 1.5,
      },
      fillcolor:
        chargingMode === "cec"
          ? "rgba(31, 122, 76, 0.35)"
          : "rgba(13, 110, 79, 0.4)",
      hovertemplate: "%{y:,.0f} MW<extra>EV active</extra>",
    });
    traces.push({
      x: times,
      y: activePlus,
      name: `Net load + EV (${modeName(chargingMode)})`,
      type: "scatter",
      mode: "lines",
      line: { color: "#5a3e6e", width: 2.5, dash: "dash" },
      hovertemplate: "%{y:,.0f} MW<extra>Net + EV</extra>",
    });

    if (chargingMode === "cec") {
      const lowPlus = rows.map((r) => r.net_load_plus_ev_MW_low);
      const highPlus = rows.map((r) => r.net_load_plus_ev_MW_high);
      traces.push({
        x: times,
        y: lowPlus,
        name: "Net+EV low",
        type: "scatter",
        mode: "lines",
        line: { width: 0 },
        hoverinfo: "skip",
        showlegend: false,
      });
      traces.push({
        x: times,
        y: highPlus,
        name: "Low-high EV range (CEC)",
        type: "scatter",
        mode: "lines",
        fill: "tonexty",
        line: { width: 0 },
        fillcolor: "rgba(90, 62, 110, 0.12)",
        hoverinfo: "skip",
      });
    }
  }

  return traces;
}

export function buildRampAnnotation(rows: EvRow[]): Partial<Annotations> | null {
  const ramp = computeEveningRamp(rows);
  if (!ramp) return null;
  return {
    x: ramp.midTime,
    y: ramp.midMw,
    text: `Evening ramp<br>${ramp.mwPerHour.toLocaleString(undefined, { maximumFractionDigits: 0 })} MW/h<br>(${ramp.startLabel} → ${ramp.endLabel})`,
    showarrow: true,
    arrowhead: 2,
    arrowcolor: "#b03a2e",
    ax: 50,
    ay: -40,
    bgcolor: "rgba(255,255,255,0.94)",
    bordercolor: "rgba(176,58,46,0.4)",
    borderwidth: 1,
    font: { size: 11, color: PLOTLY_INK },
    align: "left",
  };
}

export function buildLayout(
  shapes: Array<Partial<Shape>>,
  showTouRates: boolean,
  annotations: Array<Partial<Annotations>> = [],
): Partial<Layout> {
  const dense = showTouRates;
  const base = basePlotlyLayout({
    legendPlacement: dense ? "right" : "top",
    margin: dense
      ? { t: 48, r: 160, b: 52, l: 60 }
      : { t: 40, r: 24, b: 52, l: 60 },
  });
  const layout: Partial<Layout> = {
    ...base,
    xaxis: {
      ...base.xaxis,
      ...(dense ? { domain: [0, 0.78] } : {}),
      title: { text: "Hour (US/Pacific)", font: { size: 11, color: PLOTLY_MUTED } },
      tickformat: "%-I %p",
      dtick: 3 * 60 * 60 * 1000,
    },
    yaxis: {
      ...base.yaxis,
      title: { text: "MW", font: { size: 11, color: PLOTLY_MUTED } },
      rangemode: "tozero",
    },
    shapes,
    annotations,
  };
  // Do not set yaxis2: undefined — Plotly throws
  // "Cannot read properties of undefined (reading 'anchor')".
  if (showTouRates) {
    layout.yaxis2 = {
      title: {
        text: "¢/kWh (PG&E)",
        font: { size: 11, color: PLOTLY_MUTED },
      },
      overlaying: "y",
      side: "right",
      showgrid: false,
      rangemode: "tozero",
      range: [0, 80],
      tickfont: { color: PLOTLY_MUTED, size: 11 },
    };
  }
  return layout;
}

export function yMaxForShapes(
  rows: EvRow[],
  showEv: boolean,
  scenario: Scenario = "mid",
): number {
  let max = Math.max(...rows.map((r) => r.load_MW), ...rows.map((r) => r.net_load_MW));
  if (showEv) {
    const cec = cecEvLoads(rows, scenario);
    const managed = managedEvLoads(rows, scenario);
    const cecPlus = netPlusEv(rows, cec);
    const managedPlus = netPlusEv(rows, managed);
    max = Math.max(max, ...cecPlus, ...managedPlus, ...rows.map((r) => r.net_load_plus_ev_MW_high));
  }
  return max * 1.05;
}

