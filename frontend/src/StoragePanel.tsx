import { useMemo } from "react";
import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";
import { PLOTLY_CONFIG } from "./plotlyConfig";
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
        font: { size: 13, color: PLOTLY_MUTED },
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
        title: { text: "MW", font: { size: 11, color: PLOTLY_MUTED } },
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
            <span>nameplate MW</span>
          </p>
          <p>max |net − target| in window</p>
        </div>
        <div className="storage-card">
          <p className="cost-sublabel">Energy</p>
          <p className="cost-big">
            {formatGwh(est.nameplateEnergyMwh)}
            <span>@ {Math.round(est.roundTripEfficiency * 100)}% RTE</span>
          </p>
          <p>
            usable {formatGwh(est.usableEnergyMwh)} (max of charge{" "}
            {formatGwh(est.chargeMwh)} / discharge {formatGwh(est.dischargeMwh)})
          </p>
        </div>
        <div className="storage-card">
          <p className="cost-sublabel">Duration</p>
          <p className="cost-big">
            {est.durationHours.toFixed(1)} h
            <span>energy ÷ power</span>
          </p>
          <p>
            Target {formatGw(est.targetMw)} · belly {formatGw(est.bellyMw)} ·
            peak {formatGw(est.peakMw)}
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
          <Plot
            data={chart.data}
            layout={{ ...chart.layout, autosize: true }}
            config={PLOTLY_CONFIG}
            style={{ width: "100%", height: "420px" }}
            useResizeHandler
          />
          <div className="chart-copy">
            <p className="chart-narrative">
              How to read this: the red line is CAISO net load. The dashed line
              is the mean net load in the 9 a.m. to 9 p.m. window (flatten
              target). Green bars are illustrative charge MW in the belly; amber
              bars are discharge MW on the evening climb. Cards above use the
              same arithmetic.
            </p>
            <p className="chart-sources">
              C8 · Weak · illustrative. {STORAGE_ASSUMPTIONS}
            </p>
          </div>
        </section>
      )}

      <p className="cost-caveat">{STORAGE_ASSUMPTIONS}</p>
    </section>
  );
}
