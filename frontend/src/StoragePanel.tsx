import { useMemo } from "react";
import AnimatedPlot from "./AnimatedPlot";
import type { Data, Layout } from "plotly.js";
import { PLOTLY_MUTED, basePlotlyLayout } from "./chartConfig";
import {
  estimateStorageToFlatten,
  formatGw,
  formatGwh,
  storageFlattenSeries,
  STORAGE_ASSUMPTIONS,
} from "./storageSizing";
import type { EvRow } from "./types";

type Props = {
  rows: EvRow[] | null;
  date: string;
};

export default function StoragePanel({ rows, date }: Props) {
  const est = useMemo(
    () => (rows ? estimateStorageToFlatten(rows) : null),
    [rows],
  );

  const chart = useMemo(() => {
    if (!rows?.length) return null;
    const series = storageFlattenSeries(rows);
    if (!series) return null;
    const data: Data[] = [
      {
        x: series.times,
        y: series.netMw,
        name: "Net load",
        type: "scatter",
        mode: "lines",
        line: { color: "#b03a2e", width: 2.5 },
        hovertemplate: "%{y:,.0f} MW<extra>Net load</extra>",
      },
      {
        x: series.times,
        y: series.targetMw,
        name: "Flatten target (window mean)",
        type: "scatter",
        mode: "lines",
        line: { color: "#3a4a58", width: 2, dash: "dash" },
        connectgaps: false,
        hovertemplate: "%{y:,.0f} MW<extra>Target</extra>",
      },
      {
        x: series.times,
        y: series.chargeMw,
        name: "Charge (belly)",
        type: "bar",
        marker: { color: "rgba(31, 122, 76, 0.55)" },
        hovertemplate: "%{y:,.0f} MW<extra>Charge</extra>",
      },
      {
        x: series.times,
        y: series.dischargeMw,
        name: "Discharge (evening)",
        type: "bar",
        marker: { color: "rgba(138, 109, 59, 0.65)" },
        hovertemplate: "%{y:,.0f} MW<extra>Discharge</extra>",
      },
    ];
    const base = basePlotlyLayout({
      margin: { t: 48, r: 24, b: 52, l: 60 },
    });
    const layout: Partial<Layout> = {
      ...base,
      title: {
        text: `Storage flatten path (${date})`,
        font: { size: 14 },
        x: 0,
        xanchor: "left",
      },
      barmode: "relative",
      xaxis: {
        ...base.xaxis,
        title: {
          text: "Hour (US/Pacific)",
          font: { size: 11, color: PLOTLY_MUTED },
        },
        tickformat: "%-I %p",
        dtick: 3 * 60 * 60 * 1000,
      },
      yaxis: {
        ...base.yaxis,
        title: { text: "Charge / discharge (MW)", font: { size: 11, color: PLOTLY_MUTED } },
        rangemode: "tozero",
      },
    };
    return { data, layout };
  }, [rows, date]);

  if (!est) {
    return (
      <section className="storage-panel">
        <p className="muted">Storage estimate unavailable for {date}.</p>
      </section>
    );
  }

  return (
    <section className="storage-panel" aria-label="Storage sizing estimate">
      <h2>Storage to flatten belly to ramp</h2>
      <p className="storage-lede">
        Back-of-envelope BESS for <strong>{date}</strong>: charge in the midday
        net-load belly, discharge into the evening climb, toward a flat target
        (mean net load, 9 a.m. to 9 p.m.).
      </p>
      <div className="storage-grid">
        <div className="storage-card">
          <p className="cost-sublabel">Power</p>
          <p className="cost-big">
            {formatGw(est.powerMw)}
            <span>full-output MW</span>
          </p>
          <p>max |net − target| in window</p>
        </div>
        <div className="storage-card">
          <p className="cost-sublabel">Energy (lossless shift)</p>
          <p className="cost-big">
            {formatGwh(est.usableEnergyMwh)}
            <span>max(charge, discharge)</span>
          </p>
          <p>
            Charge {formatGwh(est.chargeMwh)} / discharge{" "}
            {formatGwh(est.dischargeMwh)}. Bars below are this lossless path.
            Nameplate uplift {formatGwh(est.nameplateEnergyMwh)} at{" "}
            {Math.round(est.roundTripEfficiency * 100)}% RTE is separate (not
            applied to bars).
          </p>
        </div>
        <div className="storage-card">
          <p className="cost-sublabel">Duration</p>
          <p className="cost-big">
            {est.durationHours.toFixed(1)} h
            <span>lossless E ÷ power</span>
          </p>
          <p>
            Nameplate duration {est.nameplateDurationHours.toFixed(1)} h if
            using E/η. Target {formatGw(est.targetMw)} · belly{" "}
            {formatGw(est.bellyMw)} · peak {formatGw(est.peakMw)}
            {est.rampMwPerHour != null && (
              <>
                {" "}
                · ramp {Math.round(est.rampMwPerHour).toLocaleString()} MW/h
              </>
            )}
          </p>
        </div>
      </div>

      {chart && (
        <section className="chart-panel storage-chart" aria-label="Flatten path">
          <AnimatedPlot
            data={chart.data}
            layout={chart.layout}
            style={{ width: "100%", height: "420px" }}
          />
          <div className="chart-copy">
            <p className="chart-narrative">
              How to read this: the red line is CAISO net load. The dashed line
              is the mean net load in the 9 a.m. through 9 p.m. window (flatten
              target). Green bars are lossless charge MW in the belly; amber
              bars are lossless discharge MW on the evening climb. Cards above
              use the same arithmetic; η=90% nameplate is an uplift only.
            </p>
            <p className="chart-sources">
              Illustrative. {STORAGE_ASSUMPTIONS}
            </p>
          </div>
        </section>
      )}

      <p className="cost-caveat">{STORAGE_ASSUMPTIONS}</p>
    </section>
  );
}
