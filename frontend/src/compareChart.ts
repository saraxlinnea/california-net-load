import type { Data, Layout } from "plotly.js";
import type { EvRow } from "./types";
import { PLOTLY_MUTED, basePlotlyLayout } from "./chartConfig";
import { estimateStorageToFlatten } from "./storageSizing";

/** Align two days on hour-of-day for overlay comparison */
export function buildCompareTraces(
  mild: EvRow[],
  peak: EvRow[],
  mildLabel: string,
  peakLabel: string,
): Data[] {
  const mildByHour = new Map(mild.map((r) => [r.hour, r]));
  const peakByHour = new Map(peak.map((r) => [r.hour, r]));
  const hours = [...Array(24).keys()];
  const x = hours.map((h) => {
    const suffix = h >= 12 ? "p.m." : "a.m.";
    const twelve = h % 12 === 0 ? 12 : h % 12;
    return `${twelve} ${suffix}`;
  });

  const mildNet = hours.map((h) => mildByHour.get(h)?.net_load_MW ?? null);
  const peakNet = hours.map((h) => peakByHour.get(h)?.net_load_MW ?? null);
  const mildLoad = hours.map((h) => mildByHour.get(h)?.load_MW ?? null);
  const peakLoad = hours.map((h) => peakByHour.get(h)?.load_MW ?? null);

  return [
    {
      x,
      y: mildLoad,
      name: `Total load · ${mildLabel}`,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(28,28,28,0.35)", width: 1.5, dash: "dot" },
      hovertemplate: "%{y:,.0f} MW<extra>Mild load</extra>",
    },
    {
      x,
      y: peakLoad,
      name: `Total load · ${peakLabel}`,
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(28,28,28,0.7)", width: 1.5, dash: "dot" },
      hovertemplate: "%{y:,.0f} MW<extra>Peak load</extra>",
    },
    {
      x,
      y: mildNet,
      name: `Net load · ${mildLabel}`,
      type: "scatter",
      mode: "lines",
      line: { color: "#c0392b", width: 2.5 },
      hovertemplate: "%{y:,.0f} MW<extra>Mild net</extra>",
    },
    {
      x,
      y: peakNet,
      name: `Net load · ${peakLabel}`,
      type: "scatter",
      mode: "lines",
      line: { color: "#6d1a14", width: 2.5 },
      hovertemplate: "%{y:,.0f} MW<extra>Peak net</extra>",
    },
  ];
}

export function buildCompareLayout(): Partial<Layout> {
  const base = basePlotlyLayout({
    margin: { t: 40, r: 24, b: 48, l: 60 },
  });
  return {
    ...base,
    xaxis: {
      ...base.xaxis,
      title: {
        text: "Hour of day (aligned)",
        font: { size: 11, color: PLOTLY_MUTED },
      },
    },
    yaxis: {
      ...base.yaxis,
      title: { text: "MW", font: { size: 11, color: PLOTLY_MUTED } },
      rangemode: "tozero",
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
