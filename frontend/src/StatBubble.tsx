import { useEffect, useRef, useState } from "react";
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
  /** Optional caption under the source line (scenario / framing notes). */
  caption?: string;
  /** Provenance-derived citation id(s) for superscript markers. */
  cite?: CitationId | CitationId[];
  /**
   * Numeric count-up target derived from the locked display string.
   * Animator formats back to the same visible value at the end.
   */
  count?: {
    end: number;
    durationMs?: number;
    format: (n: number) => string;
  };
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useCountUp(
  enabled: boolean,
  end: number,
  durationMs: number,
  format: (n: number) => string,
  finalValue: string,
): string {
  const [text, setText] = useState(enabled ? format(0) : finalValue);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!enabled || reduced) {
      setText(finalValue);
      return;
    }
    let frame = 0;
    const start = performance.now();
    setText(format(0));
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      const current = end * eased;
      setText(t >= 1 ? finalValue : format(current));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled, end, durationMs, format, finalValue, reduced]);

  return text;
}

export function StatBubble({
  value,
  label,
  source,
  caption,
  cite,
  count,
}: StatBubbleProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const display = useCountUp(
    Boolean(count) && inView,
    count?.end ?? 0,
    count?.durationMs ?? 500,
    count?.format ?? ((n) => String(n)),
    value,
  );

  return (
    <div className="stat-bubble" ref={rootRef}>
      <p className="stat-bubble-value">{count ? display : value}</p>
      <p className="stat-bubble-label">{label}</p>
      <p className="stat-bubble-source">
        {source}
        {cite ? <Cite id={cite} /> : null}
      </p>
      {caption ? <p className="stat-bubble-caption">{caption}</p> : null}
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
    count: {
      end: 48323,
      format: (n) => `${Math.round(n).toLocaleString("en-US")} MW`,
    },
  },
  {
    value: "1.98M",
    label: "EVs and plug-in hybrids on CA roads today",
    source: "AFDC 2024",
    cite: "afdc",
    count: {
      end: 1.98,
      format: (n) => `${n.toFixed(2)}M`,
    },
  },
  {
    value: "~42%",
    label:
      "Planning-scenario rise in CAISO peak demand by ~2045 versus today, mostly from EVs (CEC)",
    source: "CEC Integrated Energy Policy Report, adopted Jan 2026",
    cite: "ieprDemandForecast",
    count: {
      end: 42,
      format: (n) => `~${Math.round(n)}%`,
    },
  },
  {
    value: "~2%",
    label: "Data centers' current share of CAISO peak",
    source: "CEC",
    cite: "dataCenters",
    count: {
      end: 2,
      format: (n) => `~${Math.round(n)}%`,
    },
  },
  {
    value: "29.7M",
    label: "Light-duty vehicles on CA roads today",
    source: "CEC",
    cite: "ldv",
    count: {
      end: 29.7,
      format: (n) => `${n.toFixed(1)}M`,
    },
  },
] as const;
