import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Plot from "react-plotly.js";
import type { Config, Data, Layout, PlotlyHTMLElement } from "plotly.js";
import { PLOTLY_CONFIG } from "./plotlyConfig";

export type AnimatedPlotProps = {
  data: Data[];
  layout: Partial<Layout>;
  config?: Partial<Config>;
  style?: CSSProperties;
  className?: string;
  /** Min skeleton visibility while a control-driven update runs. */
  skeletonMs?: number;
  /** Kept for API compatibility; remount replaces animate transitions. */
  transitionMs?: number;
};

function annotationFingerprint(layout: Partial<Layout>): string {
  const anns = layout.annotations;
  if (!Array.isArray(anns) || anns.length === 0) return "";
  return anns
    .map((a) => {
      if (!a || typeof a !== "object") return "";
      const text = "text" in a && a.text != null ? String(a.text) : "";
      const x = "x" in a && a.x != null ? String(a.x) : "";
      const y = "y" in a && a.y != null ? String(a.y) : "";
      return `${text}|${x}|${y}`;
    })
    .join(";");
}

function chartFingerprint(data: Data[], layout: Partial<Layout>): string {
  const title =
    typeof layout.title === "string"
      ? layout.title
      : (layout.title?.text ?? "");
  const traces = data.map((trace) => {
    const y = (trace as { y?: unknown }).y;
    const x = (trace as { x?: unknown }).x;
    const yArr = Array.isArray(y) ? y : [];
    const xArr = Array.isArray(x) ? x : [];
    const y0 = yArr.length ? String(yArr[0]) : "";
    const yN = yArr.length ? String(yArr[yArr.length - 1]) : "";
    const yMid = yArr.length
      ? String(yArr[Math.floor(yArr.length / 2)])
      : "";
    return `${trace.name ?? ""}:${yArr.length}:${xArr.length}:${y0}:${yMid}:${yN}`;
  });
  return `${title}|${traces.join(";")}|${annotationFingerprint(layout)}`;
}

/**
 * Plotly chart that drives live data/layout into react-plotly.
 * Remounts on fingerprint change so annotations (e.g. evening ramp) stay in sync.
 */
export default function AnimatedPlot({
  data,
  layout,
  config = PLOTLY_CONFIG,
  style,
  className,
  skeletonMs = 200,
}: AnimatedPlotProps) {
  const gdRef = useRef<PlotlyHTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const prevFp = useRef<string>("");
  const fingerprint = useMemo(
    () => chartFingerprint(data, layout),
    [data, layout],
  );

  useEffect(() => {
    if (!prevFp.current) {
      prevFp.current = fingerprint;
      return;
    }
    if (prevFp.current === fingerprint) return;
    prevFp.current = fingerprint;
    setBusy(true);
    const timer = window.setTimeout(() => setBusy(false), skeletonMs);
    return () => window.clearTimeout(timer);
  }, [fingerprint, skeletonMs]);

  return (
    <div
      className={`animated-plot${busy ? " is-updating" : ""}${className ? ` ${className}` : ""}`}
    >
      {busy ? (
        <div className="chart-skeleton" aria-hidden="true" />
      ) : null}
      <Plot
        key={fingerprint}
        data={data}
        layout={{
          ...layout,
          autosize: true,
          datarevision: fingerprint,
        }}
        config={config}
        style={style}
        useResizeHandler
        onInitialized={(_figure, gd) => {
          gdRef.current = gd as PlotlyHTMLElement;
        }}
      />
    </div>
  );
}
