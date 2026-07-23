import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AnimatedPlot from "./AnimatedPlot";
import { DefinedTerm } from "./DefinedTerm";
import {
  buildCarbonIntensityTrace,
  buildFuelLayout,
  buildFuelMixTraces,
  buildMiddayEveningShareLayout,
  buildMiddayEveningShareTraces,
  computeCarbonIntensity,
  computeDailyStackCarbon,
  computeWindowChargeCarbon,
  middayEveningFuelShares,
} from "./fuelChart";
import { CI_CAVEATS, type EmissionFactor, type FuelMixRow } from "./fuelTypes";
import { shareSearchString } from "./shareState";
import { SCENARIO_META } from "./types";
import "./App.css";

/** Same intensity as Cost (insights.ts); CA-average miles → ~8.4 kWh/car·day. */
const KWH_PER_MILE = 0.3;
const CA_AVG_KWH_PER_CAR =
  SCENARIO_META.mid.miles * KWH_PER_MILE;

type Props = {
  rows: FuelMixRow[] | null;
  factors: EmissionFactor[];
  date: string;
};

export default function FuelPanel({ rows, factors, date }: Props) {
  const [showBatteries, setShowBatteries] = useState(true);
  const [showCi, setShowCi] = useState(true);
  const [searchParams] = useSearchParams();
  const qs = shareSearchString(searchParams);

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
    const daily = computeDailyStackCarbon(rows, factors);
    const charge = computeWindowChargeCarbon(
      rows,
      factors,
      CA_AVG_KWH_PER_CAR,
    );
    return {
      traces,
      layout: buildFuelLayout(showCi),
      minCi,
      maxCi,
      maxDischarge: Math.max(0, ...batt),
      maxCharge: Math.min(0, ...batt),
      daily,
      charge,
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

  const tonsRounded =
    chart != null
      ? Math.round(chart.daily.totalTons / 1000) * 1000
      : 0;

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
        <>
          <p className="chart-caption">
            What&apos;s generating California&apos;s power this hour: solar and
            wind by day, more gas and imports after dark. That mix is why{" "}
            <DefinedTerm id="netLoad" /> (demand minus wind and solar) shapes the
            duck curve.
          </p>
          <AnimatedPlot
            data={chart.traces}
            layout={chart.layout}
            style={{ width: "100%", height: "440px" }}
          />
        </>
      )}

      <div className="chart-copy">
        {chart && (
          <p className="fuel-headline-stats">
            <strong className="fuel-tons-figure">
              ~{tonsRounded.toLocaleString()} US short tons of CO₂ today
            </strong>
            <span className="fuel-ci-range">
              {" "}
              · CI ranges about {Math.round(chart.minCi)} to{" "}
              {Math.round(chart.maxCi)} lb CO₂/MWh
            </span>
          </p>
        )}
        <p className="chart-narrative">
          Stacked areas are CAISO hourly fuel mix (MW). The brown line is
          operational stack carbon intensity (lb CO₂/MWh) using cited emission
          factors.
          {chart && showBatteries && (
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
        </p>
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
          <p className="chart-caption">
            Midday versus evening generation share on this day: solar gives way
            to gas and imports after dark. Same fuel-mix story as the stack
            above, as percent of each window.
          </p>
          <AnimatedPlot
            data={periodChart.data}
            layout={periodChart.layout}
            style={{ width: "100%", height: "360px" }}
          />
          {chart?.charge && (
            <div className="chart-copy">
              <p className="chart-narrative">
                Charging one car&apos;s daily energy at midday vs evening on this
                real day produces about{" "}
                <strong>
                  {chart.charge.co2PerChargeMiddayLb.toFixed(1)} lb
                </strong>{" "}
                vs{" "}
                <strong>
                  {chart.charge.co2PerChargeEveningLb.toFixed(1)} lb
                </strong>{" "}
                of CO₂
                {chart.charge.pctDifference != null ? (
                  <>
                    , a{" "}
                    <strong>
                      {Math.round(chart.charge.pctDifference)}%
                    </strong>{" "}
                    difference
                  </>
                ) : null}
                . Illustrative: uses Cost&apos;s CA-average{" "}
                {chart.charge.kwhPerCar.toFixed(1)} kWh/car·day (same miles ×
                0.30 kWh/mi) and this day&apos;s generation-weighted stack CI in
                the 10–15 and 17–21 windows.
              </p>
              <p className="chart-narrative fuel-bridge">
                Charging timing affects not just grid strain (
                <Link to={`/${qs}`}>Fleet</Link>) and cost (
                <Link to={`/charge${qs}`}>Cost</Link>) but carbon intensity too:
                same shift in hours, third consequence.
              </p>
            </div>
          )}
        </section>
      )}

      <div className="chart-copy">
        <p className="chart-sources">{CI_CAVEATS}</p>
      </div>
    </section>
  );
}
