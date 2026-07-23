import type { CitationId } from "./citations";
import { Cite } from "./WhyHint";

/**
 * Reusable site-header metric. Locked display strings live in SITE_STATS;
 * do not freewrite values or labels here.
 */
export type StatBubbleProps = {
  value: string;
  label: string;
  source: string;
  /** Provenance-derived citation id(s) for superscript markers. */
  cite?: CitationId | CitationId[];
};

export function StatBubble({ value, label, source, cite }: StatBubbleProps) {
  return (
    <div className="stat-bubble">
      <p className="stat-bubble-value">{value}</p>
      <p className="stat-bubble-label">{label}</p>
      <p className="stat-bubble-source">
        {source}
        {cite ? <Cite id={cite} /> : null}
      </p>
    </div>
  );
}

/** Locked StatBubble row (BENCHMARKS.md + provenance). */
export const SITE_STATS: readonly StatBubbleProps[] = [
  {
    value: "48,323 MW",
    label: "California's grid peak demand (2024)",
    source: "CAISO",
    cite: "grid",
  },
  {
    value: "1.98M",
    label: "EVs and plug-in hybrids on CA roads today",
    source: "AFDC 2024",
    cite: "afdc",
  },
  {
    value: "Up to 61%",
    label:
      "Projected rise in CAISO peak demand by ~2045 (high scenario), mostly from EVs",
    source: "CEC IEPR, adopted Jan 2026",
    cite: "ieprDemandForecast",
  },
  {
    value: "~2%",
    label: "Data centers' current share of CAISO peak",
    source: "CEC",
    cite: "dataCenters",
  },
  {
    value: "29.7M",
    label: "Light-duty vehicles on CA roads today",
    source: "CEC",
    cite: "ldv",
  },
] as const;
