import type { Data, Layout } from "plotly.js";
import { PROVENANCE } from "./provenance";
import { PLOTLY_MUTED, basePlotlyLayout } from "./chartConfig";

const matched = PROVENANCE.ieprDemandForecast.matchedPeakGrowth2025To2045;

/** Gross peak-growth drivers only (pie-safe; negatives stay off the chart). */
export const PEAK_GROWTH_GROSS_SLICES = [
  {
    key: "electricVehicles",
    label: "Electric vehicles",
    mw: matched.grossIncreasesMw.electricVehicles,
    color: "#1f7a4c",
  },
  {
    key: "consumption",
    label: "Consumption",
    mw: matched.grossIncreasesMw.consumption,
    color: "#5a6b78",
  },
  {
    key: "dataCenters",
    label: "Data centers",
    mw: matched.grossIncreasesMw.dataCenters,
    color: "#3a4a58",
  },
  {
    key: "fuelSubstitution",
    label: "Fuel substitution",
    mw: matched.grossIncreasesMw.fuelSubstitution,
    color: "#8a6a2f",
  },
  {
    key: "climateChange",
    label: "Climate change",
    mw: matched.grossIncreasesMw.climateChange,
    color: "#a35a3a",
  },
] as const;

export function peakGrowthGrossTotalMw(): number {
  return PEAK_GROWTH_GROSS_SLICES.reduce((sum, s) => sum + s.mw, 0);
}

export function buildPeakGrowthDriversPie(): {
  data: Data[];
  layout: Partial<Layout>;
} {
  const total = peakGrowthGrossTotalMw();
  const labels = PEAK_GROWTH_GROSS_SLICES.map((s) => s.label);
  const values = PEAK_GROWTH_GROSS_SLICES.map((s) => s.mw);
  const colors = PEAK_GROWTH_GROSS_SLICES.map((s) => s.color);
  const base = basePlotlyLayout({
    margin: { t: 0, r: 0, b: 0, l: 0 },
    showLegend: false,
  });

  return {
    data: [
      {
        type: "pie",
        labels,
        values,
        sort: false,
        hole: 0.32,
        textinfo: "percent",
        textposition: "inside",
        insidetextorientation: "horizontal",
        textfont: { size: 13, color: "#f7f5f1" },
        marker: { colors, line: { width: 1, color: "#f7f5f1" } },
        domain: { x: [0.02, 0.98], y: [0.02, 0.98] },
        hovertemplate:
          "%{label}<br>+%{value:,.0f} MW<br>%{percent}<extra></extra>",
      },
    ],
    layout: {
      ...base,
      showlegend: false,
      annotations: [
        {
          text: `Gross<br>+${total.toLocaleString()} MW`,
          showarrow: false,
          x: 0.5,
          y: 0.5,
          xref: "paper",
          yref: "paper",
          font: { size: 13, color: PLOTLY_MUTED },
          align: "center",
        },
      ],
    },
  };
}
