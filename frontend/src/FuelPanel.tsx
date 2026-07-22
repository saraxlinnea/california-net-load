import { useMemo, useState } from "react";
import Plot from "react-plotly.js";
import {
  buildCarbonIntensityTrace,
  buildFuelLayout,
  buildFuelMixTraces,
  buildMiddayEveningShareLayout,
  buildMiddayEveningShareTraces,
  computeCarbonIntensity,
  middayEveningFuelShares,
} from "./fuelChart";
import { CI_CAVEATS, type EmissionFactor, type FuelMixRow } from "./fuelTypes";
import { PLOTLY_CONFIG } from "./plotlyConfig";
import "./App.css";

type Props = {
  rows: FuelMixRow[] | null;
  factors: EmissionFactor[];
  date: string;
};

export default function FuelPanel({ rows, factors, date }: Props) {
  const [showBatteries, setShowBatteries] = useState(true);
  const [showCi, setShowCi] = useState(true);

  const chart = useMemo(() => {
    if (!rows?.length) return null;
    const traces = buildFuelMixTraces(rows, showBatteries);
    const { times, ci } = computeCarbonIntensity(rows, factors);
    if (showCi) {
      traces.push(buildCarbonIntensityTrace(times, ci));
    }
    const midCi = ci.filter((v) => v > 0);
    const minCi = midCi.length ? Math.min(...midCi) : 0;
    const maxCi = midCi.length ? Math.max(...midCi) : 0;
    const batt = rows.map((r) => Number(r.Batteries ?? 0));
    return {
      traces,
      layout: buildFuelLayout(showCi),
      minCi,
      maxCi,
      maxDischarge: Math.max(0, ...batt),
      maxCharge: Math.min(0, ...batt),
    };
  }, [rows, factors, showBatteries, showCi]);

  const periodChart = useMemo(() => {
    if (!rows?.length) return null;
    const shares = middayEveningFuelShares(rows);
    if (!shares.length) return null;
    return {
      data: buildMiddayEveningShareTraces(shares),
      layout: buildMiddayEveningShareLayout(date),
    };
  }, [rows, date]);

  if (!rows?.length) {
    return (
      <section className="fuel-panel">
        <p className="muted">Fuel mix not loaded for {date}.</p>
      </section>
    );
  }

  return (
    <section className="fuel-panel" aria-label="Fuel mix and carbon intensity">
      <div className="fuel-header">
        <h2>Fuel mix and carbon intensity</h2>
        <div className="toggles fuel-toggles">
          <label>
            <input
              type="checkbox"
              checked={showCi}
              onChange={(e) => setShowCi(e.target.checked)}
            />
            Carbon intensity line
          </label>
          <label>
            <input
              type="checkbox"
              checked={showBatteries}
              onChange={(e) => setShowBatteries(e.target.checked)}
            />
            Batteries charge/discharge
          </label>
        </div>
      </div>

      {chart && (
        <Plot
          data={chart.traces}
          layout={{ ...chart.layout, autosize: true }}
          config={PLOTLY_CONFIG}
          style={{ width: "100%", height: "440px" }}
          useResizeHandler
        />
      )}

      <div className="chart-copy">
        <p className="chart-narrative">
          Stacked areas are CAISO hourly fuel mix (MW). Midday solar rises;
          evening natural gas and imports typically fill the ramp. The brown
          line is operational stack carbon intensity (lb CO₂/MWh) using cited
          emission factors.
          {chart && (
            <>
              {" "}
              This day: CI ranges about{" "}
              <strong>{Math.round(chart.minCi)}</strong> to{" "}
              <strong>{Math.round(chart.maxCi)}</strong> lb CO₂/MWh.
              {showBatteries && (
                <>
                  {" "}
                  Batteries: up to{" "}
                  <strong>
                    {Math.round(chart.maxDischarge).toLocaleString()} MW
                  </strong>{" "}
                  discharge /{" "}
                  <strong>
                    {Math.round(Math.abs(chart.maxCharge)).toLocaleString()} MW
                  </strong>{" "}
                  charge.
                </>
              )}
            </>
          )}
        </p>
        <p className="chart-sources">{CI_CAVEATS}</p>
        <p className="chart-sources">
          Factors:{" "}
          {factors
            .filter((f) => f.lb_co2_per_mwh > 0)
            .map((f) => `${f.fuel} ${f.lb_co2_per_mwh} (${f.source})`)
            .join(" · ")}
        </p>
      </div>

      {periodChart && (
        <section
          className="chart-panel fuel-period-panel"
          aria-label="Midday versus evening generation share"
        >
          <Plot
            data={periodChart.data}
            layout={{ ...periodChart.layout, autosize: true }}
            config={PLOTLY_CONFIG}
            style={{ width: "100%", height: "360px" }}
            useResizeHandler
          />
          <div className="chart-copy">
            <p className="chart-narrative">
              How to read this: each bar is 100% of CAISO generation energy in
              that hour window (hourly MW summed as MWh). Midday (10–15) vs
              evening (17–21) shows how solar share gives way to gas and imports
              on this day. Operational generation mix only; not customer end-use
              and not a data-center pie.
            </p>
            <p className="chart-sources">{CI_CAVEATS}</p>
          </div>
        </section>
      )}
    </section>
  );
}
