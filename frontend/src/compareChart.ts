import type { Data, Layout } from "plotly.js";
import type { EvRow } from "./types";
import { PLOTLY_MUTED, basePlotlyLayout } from "./chartConfig";
import { estimateStorageToFlatten } from "./storageSizing";

function hourLabels(): string[] {
  return [...Array(24).keys()].map((h) => {
    const suffix = h >= 12 ? "p.m." : "a.m.";
    const twelve = h % 12 === 0 ? 12 : h % 12;
    return `${twelve} ${suffix}`;
  });
}

function rowsByHour(rows: EvRow[]): Map<number, EvRow> {
  return new Map(rows.map((r) => [r.hour, r]));
}

/** Align two days on hour-of-day for overlay comparison */
export function buildCompareTraces(
  mild: EvRow[],
  peak: EvRow[],
  mildLabel: string,
  peakLabel: string,
): Data[] {
  return [
    ...buildCompareDayTraces(mild, mildLabel, "mild"),
    ...buildCompareDayTraces(peak, peakLabel, "peak"),
  ];
}

/** One day's total + net load traces (for drag-to-compare layers). */
export function buildCompareDayTraces(
  rows: EvRow[],
  label: string,
  tone: "mild" | "peak",
): Data[] {
  const byHour = rowsByHour(rows);
  const hours = [...Array(24).keys()];
  const x = hourLabels();
  const load = hours.map((h) => byHour.get(h)?.load_MW ?? null);
  const net = hours.map((h) => byHour.get(h)?.net_load_MW ?? null);
  const loadColor =
    tone === "mild" ? "rgba(28,28,28,0.35)" : "rgba(28,28,28,0.7)";
  const netColor = tone === "mild" ? "#c0392b" : "#6d1a14";

  return [
    {
      x,
      y: load,
      name: `Total load · ${label}`,
      type: "scatter",
      mode: "lines",
      line: { color: loadColor, width: 1.5, dash: "dot" },
      hovertemplate: `%{y:,.0f} MW<extra>${label} load</extra>`,
    },
    {
      x,
      y: net,
      name: `Net load · ${label}`,
      type: "scatter",
      mode: "lines",
      line: { color: netColor, width: 2.5 },
      hovertemplate: `%{y:,.0f} MW<extra>${label} net</extra>`,
    },
  ];
}

/** Shared y-range so drag layers stay aligned. */
export function compareYRange(mild: EvRow[], peak: EvRow[]): [number, number] {
  const vals = [...mild, ...peak].flatMap((r) => [r.load_MW, r.net_load_MW]);
  const max = Math.max(...vals, 0);
  return [0, max * 1.05];
}

export function buildCompareLayout(
  yRange?: [number, number],
  titleText = "Two CAISO days: total load and net load",
): Partial<Layout> {
  const base = basePlotlyLayout({
    margin: { t: 56, r: 24, b: 48, l: 60 },
  });
  return {
    ...base,
    title: {
      text: titleText,
      font: { size: 14 },
      x: 0,
      xanchor: "left",
    },
    xaxis: {
      ...base.xaxis,
      title: {
        text: "Hour of day (US/Pacific, aligned)",
        font: { size: 11, color: PLOTLY_MUTED },
      },
    },
    yaxis: {
      ...base.yaxis,
      title: { text: "MW", font: { size: 11, color: PLOTLY_MUTED } },
      rangemode: "tozero",
      ...(yRange ? { range: yRange } : {}),
    },
  };
}

export function storageTargetTrace(rows: EvRow[]): Data | null {
  const est = estimateStorageToFlatten(rows);
  if (!est) return null;
  const hours = rows
    .filter((r) => r.hour >= est.windowStartHour && r.hour <= est.windowEndHour)
    .map((r) => r.Time);
  return {
    x: hours,
    y: hours.map(() => est.targetMw),
    name: "Flat target (mean net)",
    type: "scatter",
    mode: "lines",
    line: { color: "#2c5f2d", width: 1.5, dash: "dash" },
    hovertemplate: "%{y:,.0f} MW<extra>Target</extra>",
  };
}
