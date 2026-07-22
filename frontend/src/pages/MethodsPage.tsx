import { Link, useSearchParams } from "react-router-dom";
import { PGE_EV_RATES, PGE_RATE_PDF, PROVENANCE } from "../provenance";
import { shareSearchString } from "../shareState";
import "../App.css";

/**
 * Math + Citations. Summarizes MATH.md / BENCHMARKS.md / provenance;
 * does not invent figures.
 */
export default function MethodsPage() {
  const [searchParams] = useSearchParams();
  const qs = shareSearchString(searchParams);

  return (
    <div className="page methods-page">
      <header className="hero">
        <h1>Methods</h1>
        <p className="lede">
          How the charts and PG&E $/car numbers are computed, and which sources
          are Confirmed versus Unverified.
        </p>
        <p className="honesty">
          Summarizes <code>MATH.md</code>, <code>BENCHMARKS.md</code>, and{" "}
          <code>provenance.ts</code>; it does not replace primary sources.
        </p>
        <p className="verified">
          Sources verified as of <strong>{PROVENANCE.verifiedAsOf}</strong>
          {" · "}
          CEC LDV stock retrieved{" "}
          <strong>{PROVENANCE.population.ldvRetrievedAsOf}</strong>
        </p>
      </header>

      <section className="methods-section" aria-labelledby="methods-formulas">
        <h2 id="methods-formulas">Key formulas</h2>

        <h3>Net load (CAISO)</h3>
        <p>
          Hourly net load is system demand minus solar and wind for that hour
          (CA ISO-TAC). The chart fill between net load and total load is solar
          plus wind, not a stack from zero. The familiar midday dip in net load
          is the duck-curve shape.
        </p>
        <p className="methods-formula">
          net load = load − solar − wind
        </p>

        <h3>EV charging overlay</h3>
        <p>
          Daily EV energy is fleet size × miles per day × 0.30 kWh/mi, then
          spread by the CEC 2022 IEPR light-duty hourly shape matched to season
          and weekday/weekend. Mid scenario (27 mi/day) at today’s AFDC plug-in
          fleet cross-checks near the CEC file’s own summer-weekday daily total
          (~16 GWh).
        </p>
        <p className="methods-formula">
          EV MW<sub>h</sub> = (N × miles × 0.30 / 1000) × CEC share<sub>h</sub>
        </p>

        <h3>Adoption stress test</h3>
        <p>
          Fleet size is either a share of California light-duty on-road stock (
          {PROVENANCE.population.ldvTotal.toLocaleString()}, data as of{" "}
          {PROVENANCE.population.ldvAsOf}) or a multiple of today’s AFDC plug-in
          count ({PROVENANCE.population.bevPlusPhev.toLocaleString()},{" "}
          {PROVENANCE.population.year}). Hourly EV load scales linearly with
          fleet; same CEC shape and kWh per car. Managed participation mixes CEC
          with an illustrative midday solar-weighted shape. Label: stress
          arithmetic, not a forecast or resource-adequacy study. See{" "}
          <Link to={`/${qs}`}>Adoption</Link>.
        </p>

        <h3>PG&E TOU cost</h3>
        <p>
          For a chosen plan and charging schedule, the app averages the plan’s
          ¢/kWh rates by the share of daily energy in each hour, then multiplies
          by daily kWh per car. Year and month are 365× and ÷12 of that day cost.
          Simplified model: energy charges only, not a full utility bill. PG&E
          TOU windows are territory retail rates, not CAISO system peaks. See{" "}
          <Link to={`/charge${qs}`}>Cost</Link>.
        </p>
      </section>

      <section className="methods-section" aria-labelledby="methods-citations">
        <h2 id="methods-citations">Citations</h2>
        <ul className="methods-cite-list">
          <li>
            <strong>Confirmed.</strong> CAISO load and fuel mix via gridstatus (
            {PROVENANCE.grid.source}). Processed days:{" "}
            {PROVENANCE.grid.days.join(", ")}. Peak-load benchmarks (2024
            48,323 MW; 2025 44,506 MW) from CAISO Peak Load History PDF; see{" "}
            <code>BENCHMARKS.md</code>.
          </li>
          <li>
            <strong>Confirmed.</strong> {PROVENANCE.evShape.source}, year{" "}
            {PROVENANCE.evShape.year} shapes used for overlays.
          </li>
          <li>
            <strong>Confirmed.</strong> {PROVENANCE.population.source} (
            {PROVENANCE.population.year}): BEV+PHEV{" "}
            {PROVENANCE.population.bevPlusPhev.toLocaleString()}.
          </li>
          <li>
            <strong>Confirmed.</strong>{" "}
            <a
              href={PROVENANCE.population.ldvUrl}
              target="_blank"
              rel="noreferrer"
            >
              CEC light-duty vehicle population
            </a>
            : {PROVENANCE.population.ldvTotal.toLocaleString()} on-road (data as
            of {PROVENANCE.population.ldvAsOf}). Workbook:{" "}
            {PROVENANCE.population.ldvSource}.{" "}
            <a
              href={PROVENANCE.population.ldvDownloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              Download hub
            </a>
            . Retrieved {PROVENANCE.population.ldvRetrievedAsOf}.
          </li>
          <li>
            <strong>Confirmed.</strong>{" "}
            <a href={PGE_RATE_PDF} target="_blank" rel="noreferrer">
              {PROVENANCE.tou.source}
            </a>
            , effective {PROVENANCE.tou.effective}. Re-verified{" "}
            {PROVENANCE.tou.reVerifiedAsOf} ({PROVENANCE.tou.matchStatus}) vs{" "}
            <code>tou_rates_pge.csv</code>.{" "}
            <a href={PGE_EV_RATES} target="_blank" rel="noreferrer">
              PG&E EV rate plans
            </a>
            .
          </li>
          <li>
            <strong>Confirmed (proxy caveats).</strong> Carbon intensity uses{" "}
            {PROVENANCE.carbon.factorsFile}; imports use{" "}
            {PROVENANCE.carbon.importsProxySource} (
            {PROVENANCE.carbon.importsProxyLbPerMwh} lb/MWh), not hourly import
            mix.
          </li>
          <li>
            <strong>Confirmed.</strong> Data centers: about{" "}
            {PROVENANCE.dataCenters.peakMwApprox.toLocaleString()} MW, or about{" "}
            {(PROVENANCE.dataCenters.peakShareOfCaisoApprox * 100).toFixed(0)}%
            of CAISO system peak ({PROVENANCE.dataCenters.asOf}).{" "}
            <a
              href={PROVENANCE.dataCenters.url}
              target="_blank"
              rel="noreferrer"
            >
              {PROVENANCE.dataCenters.source}
            </a>
            .{" "}
            <a
              href={PROVENANCE.dataCenters.methodologyUrl}
              target="_blank"
              rel="noreferrer"
            >
              Methodology memo
            </a>
            : {PROVENANCE.dataCenters.methodologyNote}. Retrieved{" "}
            {PROVENANCE.dataCenters.retrievedAsOf}. This is a peak demand share
            of CAISO system peak, not an annual end-use energy share, and not a
            generation-mix pie slice.
          </li>
          <li>
            <strong>Unverified. Not shown as confirmed.</strong> GridLab/Brattle
            (~4,500 MW unmitigated peak contribution / ~1,600 MW managed
            potential by 2035 for a 10M-EV scenario) are marked Unverified in{" "}
            <code>BENCHMARKS.md</code>. This app does not treat them as
            validated benchmarks.
          </li>
        </ul>
      </section>

      <section className="methods-section" aria-labelledby="methods-claims">
        <h2 id="methods-claims">Claim strength</h2>
        <p>
          Live metrics carry locked labels C1–C9 (Strong through Weak /
          Speculative) in <code>CLAIMS.md</code>. Weak or Speculative results
          must stay labeled illustrative or stress test.
        </p>
      </section>
    </div>
  );
}
