/**
 * Reusable site-header metric. Locked display strings live in SITE_STATS;
 * do not freewrite values or labels here.
 */
export type StatBubbleProps = {
  value: string;
  label: string;
  source: string;
};

export function StatBubble({ value, label, source }: StatBubbleProps) {
  return (
    <div className="stat-bubble">
      <p className="stat-bubble-value">{value}</p>
      <p className="stat-bubble-label">{label}</p>
      <p className="stat-bubble-source">{source}</p>
    </div>
  );
}

/** Locked StatBubble row (BENCHMARKS.md + provenance). */
export const SITE_STATS: readonly StatBubbleProps[] = [
  {
    value: "48,323 MW",
    label: "California's grid peak demand (2024)",
    source: "CAISO",
  },
  {
    value: "1.98M",
    label: "EVs and plug-in hybrids on CA roads today",
    source: "AFDC 2024",
  },
  {
    value: "Up to 61%",
    label:
      "Projected rise in CAISO peak demand by ~2045 (high scenario), mostly from EVs",
    source: "CEC IEPR, adopted Jan 2026",
  },
  {
    value: "~2%",
    label: "Data centers' current share of CAISO peak",
    source: "CEC",
  },
  {
    value: "29.7M",
    label: "Light-duty vehicles on CA roads today",
    source: "CEC",
  },
] as const;
