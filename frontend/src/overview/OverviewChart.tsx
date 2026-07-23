import AnimatedPlot from "../AnimatedPlot";
import type { Data, Layout } from "plotly.js";
import { DefinedTerm } from "../DefinedTerm";
import type { EveningRamp } from "../insights";
import { SIMPLIFIED_MODEL } from "../insights";
import { SOURCE_FOOTER } from "../provenance";

type Props = {
  error: string | null;
  loading: boolean;
  hasRows: boolean;
  chart: { data: Data[]; layout: Partial<Layout> } | null;
  ramp: EveningRamp | null;
  /** Numeric three-timings detail for this CAISO day (from buildThreeClocksCallout). */
  dayTimingsDetail?: string | null;
};

export default function OverviewChart({
  error,
  loading,
  hasRows,
  chart,
  ramp,
  dayTimingsDetail = null,
}: Props) {
  return (
    <section className="chart-panel">
      <p className="chart-caption">
        This chart shows three timings that often disagree: the evening{" "}
        <DefinedTerm id="netLoad">net-load</DefinedTerm> climb (ramp label, if
        on), when the EV charging curve peaks, and PG&E&apos;s TOU price bands or
        rate line (if on). Bill hours are not the same as grid-stress hours. Use
        Fleet for fleet scale and evening ramp; use this page for schedule
        cost.
      </p>
      {error && <p className="error">{error}</p>}
      {loading && !hasRows && (
        <div className="chart-skeleton chart-skeleton-block" aria-hidden="true" />
      )}
      {loading && !hasRows && <p className="muted">Loading…</p>}
      {chart && (
        <AnimatedPlot
          data={chart.data}
          layout={chart.layout}
          style={{ width: "100%", height: "600px" }}
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
        {dayTimingsDetail ? (
          <p className="chart-narrative">
            <strong>On this day:</strong> {dayTimingsDetail}
          </p>
        ) : null}
        <p className="chart-sources">{SOURCE_FOOTER}</p>
        <p className="chart-sources">{SIMPLIFIED_MODEL}</p>
      </div>
    </section>
  );
}
