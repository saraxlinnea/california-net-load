import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";
import type { EveningRamp } from "../insights";
import { SIMPLIFIED_MODEL } from "../insights";
import { PLOTLY_CONFIG } from "../plotlyConfig";
import { SOURCE_FOOTER } from "../provenance";

type Props = {
  error: string | null;
  loading: boolean;
  hasRows: boolean;
  chart: { data: Data[]; layout: Partial<Layout> } | null;
  ramp: EveningRamp | null;
};

export default function OverviewChart({
  error,
  loading,
  hasRows,
  chart,
  ramp,
}: Props) {
  return (
    <section className="chart-panel">
      {error && <p className="error">{error}</p>}
      {loading && !hasRows && <p className="muted">Loading…</p>}
      {chart && (
        <Plot
          data={chart.data}
          layout={{ ...chart.layout, autosize: true }}
          config={PLOTLY_CONFIG}
          style={{ width: "100%", height: "520px" }}
          useResizeHandler
        />
      )}
      <div className="chart-copy">
        <p className="chart-narrative">
          One California day (24 hourly points, US/Pacific). Demand often rises
          into the early evening; net load usually climbs later as solar drops.
          On PG&E EV plans, peak prices fall in the evening window, so charging
          then costs more. Switch the charging schedule to move the same daily
          energy into midday solar or off-peak hours.
        </p>
        <p className="chart-identity">
          Net load = total load − solar − wind. Gold and blue fill the gap
          between those lines: renewable supply, not missing demand.
          {ramp && (
            <>
              {" "}
              Evening net-load ramp:{" "}
              <strong>
                {Math.round(ramp.mwPerHour).toLocaleString()} MW/h
              </strong>{" "}
              from {ramp.startLabel} to {ramp.endLabel} (
              {Math.round(ramp.deltaMw).toLocaleString()} MW over {ramp.hours}{" "}
              h).
            </>
          )}
        </p>
        <p className="chart-sources">{SOURCE_FOOTER}</p>
        <p className="chart-sources">{SIMPLIFIED_MODEL}</p>
      </div>
    </section>
  );
}
