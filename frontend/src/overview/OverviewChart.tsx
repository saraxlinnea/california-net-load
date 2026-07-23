import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";
import { DefinedTerm } from "../DefinedTerm";
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
      <p className="chart-caption">
        This page is about the bill clock: PG&E time-of-use prices. Those hours
        are not the same as <DefinedTerm id="caiso" />
        &apos;s evening <DefinedTerm id="netLoad" /> climb. Use Adoption to see
        grid timing; use this page for schedule cost.
      </p>
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
        <p className="chart-identity">
          <DefinedTerm id="netLoad" /> = total load - solar - wind. Gold and blue
          fill the gap between those lines: renewable supply, not missing demand.
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
