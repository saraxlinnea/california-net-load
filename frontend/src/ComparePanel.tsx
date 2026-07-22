import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { buildCompareLayout, buildCompareTraces } from "./compareChart";
import { loadEvTimeseries } from "./loadData";
import { formatGw } from "./storageSizing";
import { computeEveningRamp } from "./insights";
import { PLOTLY_CONFIG } from "./plotlyConfig";
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

  useEffect(() => {
    if (!mildDate || !peakDate) return;
    let cancelled = false;
    setError(null);
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

  const chart = useMemo(() => {
    if (!mildRows?.length || !peakRows?.length) return null;
    return {
      data: buildCompareTraces(mildRows, peakRows, mildLabel, peakLabel),
      layout: buildCompareLayout(),
    };
  }, [mildRows, peakRows, mildLabel, peakLabel]);

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
          <p className="compare-deltas-lede">
            Day B minus Day A: peak days usually run higher load and a shallower
            midday net-load belly than spring, so evening ramps can look very
            different even with the same EV shape overlay.
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
      {chart && (
        <Plot
          data={chart.data}
          layout={{ ...chart.layout, autosize: true }}
          config={PLOTLY_CONFIG}
          style={{ width: "100%", height: "400px" }}
          useResizeHandler
        />
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
        calendar weather). Storage flatten estimates live on the Storage route
        (illustrative C8); not the Compare headline.
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
