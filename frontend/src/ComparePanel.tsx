import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnimatedPlot from "./AnimatedPlot";
import {
  buildCompareDayTraces,
  buildCompareLayout,
  compareYRange,
} from "./compareChart";
import { DefinedTerm } from "./DefinedTerm";
import { loadEvTimeseries } from "./loadData";
import { formatGw } from "./storageSizing";
import { computeEveningRamp } from "./insights";
import type { DayOption, EvRow } from "./types";

type Props = {
  days: DayOption[];
  mildDate: string;
  peakDate: string;
  onMildDate: (date: string) => void;
  onPeakDate: (date: string) => void;
};

export default function ComparePanel({
  days,
  mildDate,
  peakDate,
  onMildDate,
  onPeakDate,
}: Props) {
  const [mildRows, setMildRows] = useState<EvRow[] | null>(null);
  const [peakRows, setPeakRows] = useState<EvRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [split, setSplit] = useState(50);
  const [dragging, setDragging] = useState(false);
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mildDate || !peakDate) return;
    let cancelled = false;
    setError(null);
    setMildRows(null);
    setPeakRows(null);
    Promise.all([loadEvTimeseries(mildDate), loadEvTimeseries(peakDate)])
      .then(([a, b]) => {
        if (cancelled) return;
        setMildRows(a);
        setPeakRows(b);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [mildDate, peakDate]);

  const mildLabel =
    days.find((d) => d.date === mildDate)?.label.split("·")[0]?.trim() ??
    mildDate;
  const peakLabel =
    days.find((d) => d.date === peakDate)?.label.split("·")[0]?.trim() ??
    peakDate;

  const yRange = useMemo(() => {
    if (!mildRows?.length || !peakRows?.length) return undefined;
    return compareYRange(mildRows, peakRows);
  }, [mildRows, peakRows]);

  const mildChart = useMemo(() => {
    if (!mildRows?.length || !yRange) return null;
    return {
      data: buildCompareDayTraces(mildRows, mildLabel, "mild"),
      layout: buildCompareLayout(
        yRange,
        `Day A · ${mildLabel} (drag handle to reveal Day B)`,
      ),
    };
  }, [mildRows, mildLabel, yRange]);

  const peakChart = useMemo(() => {
    if (!peakRows?.length || !yRange) return null;
    return {
      data: buildCompareDayTraces(peakRows, peakLabel, "peak"),
      layout: buildCompareLayout(yRange, `Day B · ${peakLabel}`),
    };
  }, [peakRows, peakLabel, yRange]);

  const mildStats = useMemo(() => dayStats(mildRows), [mildRows]);
  const peakStats = useMemo(() => dayStats(peakRows), [peakRows]);

  const deltas = useMemo(() => {
    if (!mildStats || !peakStats) return null;
    return {
      peakLoad: peakStats.peakLoad - mildStats.peakLoad,
      minNet: peakStats.minNet - mildStats.minNet,
      ramp:
        mildStats.ramp != null && peakStats.ramp != null
          ? peakStats.ramp - mildStats.ramp
          : null,
    };
  }, [mildStats, peakStats]);

  const setSplitFromClientX = useCallback((clientX: number) => {
    const el = revealRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(100, Math.max(0, next)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => setSplitFromClientX(event.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, setSplitFromClientX]);

  return (
    <section className="compare-panel" aria-label="Multi-day comparison">
      <h2>Mild day vs peak day</h2>
      <div className="compare-controls">
        <label className="field">
          <span>Day A (mild)</span>
          <select
            value={mildDate}
            onChange={(e) => onMildDate(e.target.value)}
          >
            {days.map((d) => (
              <option key={d.date} value={d.date}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Day B (peak)</span>
          <select
            value={peakDate}
            onChange={(e) => onPeakDate(e.target.value)}
          >
            {days.map((d) => (
              <option key={d.date} value={d.date}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {deltas && (
        <div className="compare-deltas" aria-label="Day B minus Day A">
          <p className="chart-caption">
            Day B minus Day A in three numbers: peak load, deepest{" "}
            <DefinedTerm id="netLoad">net-load</DefinedTerm> belly, and evening
            ramp rate. Same EV shape overlay; different grid days.
          </p>
          <div className="storage-grid compare-delta-grid">
            <div className="storage-card">
              <p className="cost-sublabel">Δ peak load</p>
              <p className="cost-big">
                {formatSignedGw(deltas.peakLoad)}
                <span>B − A</span>
              </p>
            </div>
            <div className="storage-card">
              <p className="cost-sublabel">Δ min net</p>
              <p className="cost-big">
                {formatSignedGw(deltas.minNet)}
                <span>B − A</span>
              </p>
            </div>
            <div className="storage-card">
              <p className="cost-sublabel">Δ evening ramp</p>
              <p className="cost-big">
                {deltas.ramp != null
                  ? `${deltas.ramp >= 0 ? "+" : ""}${Math.round(deltas.ramp).toLocaleString()} MW/h`
                  : "n/a"}
                <span>B − A</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {!error && (!mildChart || !peakChart) && (
        <div className="chart-skeleton chart-skeleton-block" aria-hidden="true" />
      )}
      {mildChart && peakChart && (
        <>
          <p className="chart-caption">
            Drag the handle to reveal Day A versus Day B: total load and{" "}
            <DefinedTerm id="netLoad" /> on two real <DefinedTerm id="caiso" />{" "}
            days. Use this to see how the evening climb changes with the season
            and the day, not to invent a new EV forecast.
          </p>
          <div
            className={`compare-reveal${dragging ? " is-dragging" : ""}`}
            ref={revealRef}
          >
            <div className="compare-reveal-layer compare-reveal-base">
              <AnimatedPlot
                data={peakChart.data}
                layout={{ ...peakChart.layout, autosize: true, showlegend: true }}
                style={{ width: "100%", height: "400px" }}
              />
            </div>
            <div
              className="compare-reveal-layer compare-reveal-clip"
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            >
              <AnimatedPlot
                data={mildChart.data}
                layout={{ ...mildChart.layout, autosize: true, showlegend: true }}
                style={{ width: "100%", height: "400px" }}
              />
            </div>
            <div
              className="compare-reveal-handle"
              style={{ left: `${split}%` }}
              role="slider"
              tabIndex={0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(split)}
              aria-label="Compare day reveal"
              aria-valuetext={`${Math.round(split)}% Day A, ${Math.round(100 - split)}% Day B`}
              onPointerDown={(event) => {
                event.preventDefault();
                setDragging(true);
                setSplitFromClientX(event.clientX);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  setSplit((s) => Math.max(0, s - 2));
                } else if (event.key === "ArrowRight") {
                  event.preventDefault();
                  setSplit((s) => Math.min(100, s + 2));
                } else if (event.key === "Home") {
                  event.preventDefault();
                  setSplit(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  setSplit(100);
                }
              }}
            >
              <span className="compare-reveal-knob" />
              <span className="compare-reveal-labels">
                <span>{mildLabel}</span>
                <span>{peakLabel}</span>
              </span>
            </div>
          </div>
        </>
      )}

      <div className="compare-stats">
        {mildStats && (
          <div className="storage-card">
            <h3>{mildLabel}</h3>
            <ul>
              <li>
                Peak load <strong>{formatGw(mildStats.peakLoad)}</strong>
              </li>
              <li>
                Min net <strong>{formatGw(mildStats.minNet)}</strong>
              </li>
              <li>
                Ramp{" "}
                <strong>
                  {mildStats.ramp != null
                    ? `${Math.round(mildStats.ramp).toLocaleString()} MW/h`
                    : "n/a"}
                </strong>
              </li>
            </ul>
          </div>
        )}
        {peakStats && (
          <div className="storage-card">
            <h3>{peakLabel}</h3>
            <ul>
              <li>
                Peak load <strong>{formatGw(peakStats.peakLoad)}</strong>
              </li>
              <li>
                Min net <strong>{formatGw(peakStats.minNet)}</strong>
              </li>
              <li>
                Ramp{" "}
                <strong>
                  {peakStats.ramp != null
                    ? `${Math.round(peakStats.ramp).toLocaleString()} MW/h`
                    : "n/a"}
                </strong>
              </li>
            </ul>
          </div>
        )}
      </div>
      <p className="cost-caveat">
        Hours aligned midnight to 11 p.m. for shape comparison (not the same
        calendar weather). Battery flatten estimates are on the Storage page
        (illustrative). Not the point of this comparison.
      </p>
    </section>
  );
}

function formatSignedGw(mw: number): string {
  const sign = mw > 0 ? "+" : "";
  return `${sign}${formatGw(mw)}`;
}

function dayStats(rows: EvRow[] | null) {
  if (!rows?.length) return null;
  const ramp = computeEveningRamp(rows);
  return {
    peakLoad: Math.max(...rows.map((r) => r.load_MW)),
    minNet: Math.min(...rows.map((r) => r.net_load_MW)),
    ramp: ramp?.mwPerHour ?? null,
  };
}
