import type { Data, Layout } from "plotly.js";
import { PROVENANCE } from "./provenance";
import { PLOTLY_MUTED, basePlotlyLayout } from "./chartConfig";

const sales = PROVENANCE.ieprDemandForecast.managedSalesBySector2025Vs2045;

/** Bottom → top stack order (EV on top, site green). */
export const SECTOR_SALES_STACK_ORDER = [
  "Streetlighting",
  "Industrial Mining & Construction",
  "TCU",
  "AGWP",
  "Industrial Manufacturing",
  "Residential",
  "Commercial",
  "Electric vehicles",
] as const;

/** Short in-bar labels (full names in legend / caption). */
const SECTOR_BAR_LABEL: Record<string, string> = {
  Streetlighting: "Streetlighting",
  "Industrial Mining & Construction": "Mining & constr.",
  TCU: "TCU",
  AGWP: "AGWP",
  "Industrial Manufacturing": "Ind. mfr.",
  Residential: "Residential",
  Commercial: "Commercial",
  "Electric vehicles": "EVs",
};

/** High-contrast stack colors (avoid near-neighbor greys). */
export const SECTOR_SALES_COLORS: Record<string, string> = {
  Streetlighting: "#9aa0a6",
  "Industrial Mining & Construction": "#8b5a2b",
  TCU: "#d4760a",
  AGWP: "#0d7a8c",
  "Industrial Manufacturing": "#5c4033",
  Residential: "#2f6f8f",
  Commercial: "#1a3344",
  "Electric vehicles": "#1f7a4c",
};

/** Skip tiny slices so labels stay readable. */
const LABEL_MIN_GWH = 8_000;

export function buildSectorSalesStackedBars(): {
  data: Data[];
  layout: Partial<Layout>;
} {
  const years = ["2025", "2045"] as const;
  const byYear = {
    "2025": sales.byYear[2025],
    "2045": sales.byYear[2045],
  };
  const data: Data[] = SECTOR_SALES_STACK_ORDER.map((category) => {
    const ys = years.map((y) => byYear[y].categoriesGwh[category] ?? 0);
    return {
      type: "bar" as const,
      name: category,
      x: [...years],
      y: ys,
      marker: { color: SECTOR_SALES_COLORS[category] },
      text: ys.map((v) =>
        v >= LABEL_MIN_GWH ? SECTOR_BAR_LABEL[category] ?? category : "",
      ),
      textposition: "inside" as const,
      insidetextanchor: "middle" as const,
      textfont: { size: 11, color: "#f7f5f1" },
      cliponaxis: false,
      hovertemplate:
        "%{fullData.name}<br>%{x}: %{y:,.0f} GWh<extra></extra>",
    };
  });

  const base = basePlotlyLayout({
    margin: { t: 16, r: 16, b: 88, l: 64 },
    legendPlacement: "bottom",
  });

  return {
    data,
    layout: {
      ...base,
      barmode: "stack",
      xaxis: {
        ...base.xaxis,
        title: { text: "", font: { size: 11, color: PLOTLY_MUTED } },
      },
      yaxis: {
        ...base.yaxis,
        title: {
          text: "GWh (statewide planning sales)",
          font: { size: 11, color: PLOTLY_MUTED },
        },
        rangemode: "tozero",
      },
      showlegend: true,
    },
  };
}
