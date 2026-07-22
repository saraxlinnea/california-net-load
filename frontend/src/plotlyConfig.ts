import type { Config } from "plotly.js";

/** Shared Plotly toolbar config for all charts. */
export const PLOTLY_CONFIG: Partial<Config> = {
  responsive: true,
  displayModeBar: true,
  displaylogo: false,
  modeBarButtonsToRemove: ["lasso2d", "select2d"],
};
