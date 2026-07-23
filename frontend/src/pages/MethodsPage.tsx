import { Link, useSearchParams } from "react-router-dom";
import { CITATIONS } from "../citations";
import { PROVENANCE } from "../provenance";
import { shareSearchString } from "../shareState";
import { Cite } from "../WhyHint";
import "../App.css";

/**
 * Math + Citations. Summarizes MATH.md / BENCHMARKS.md / provenance;
 * numbered list is derived from CITATION_ORDER / PROVENANCE only.
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
          Superscripts elsewhere link to the numbered list below.
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
          (CA ISO-TAC)
          <Cite id="grid" />. The chart fill between net load and total load is
          solar plus wind, not a stack from zero. The familiar midday dip in net
          load is the duck-curve shape.
        </p>
        <p className="methods-formula">net load = load - solar - wind</p>

        <h3>EV charging overlay</h3>
        <p>
          Daily EV energy is fleet size × miles per day × 0.30 kWh/mi, then
          spread by the CEC 2022 IEPR light-duty hourly shape matched to season
          and weekday/weekend
          <Cite id={["evShape", "afdc"]} />. Primary miles/day is{" "}
          {PROVENANCE.milesPerDay.primaryMiles} (FHWA 2023 CA average)
          <Cite id="milesPerDay" />. At today&apos;s AFDC plug-in fleet that
          yields about{" "}
          {PROVENANCE.milesPerDay.midDailyEnergyMwhAtN0.toLocaleString()}{" "}
          MWh/day.
        </p>
        <p className="methods-formula">
          EV MW<sub>h</sub> = (N × miles × 0.30 / 1000) × CEC share<sub>h</sub>
        </p>

        <h3>Adoption stress test</h3>
        <p>
          Fleet size is either a share of California light-duty on-road stock (
          {PROVENANCE.population.ldvTotal.toLocaleString()}, data as of{" "}
          {PROVENANCE.population.ldvAsOf})
          <Cite id="ldv" /> or a multiple of today&apos;s AFDC plug-in count (
          {PROVENANCE.population.bevPlusPhev.toLocaleString()},{" "}
          {PROVENANCE.population.year})
          <Cite id="afdc" />. Hourly EV load scales linearly with fleet; same
          CEC shape and kWh per car. Managed participation mixes CEC with a
          net-load-weighted (lowest-strain) shape for this day. Label: stress
          arithmetic / illustrative mix, not a forecast. See{" "}
          <Link to={`/${qs}`}>Adoption</Link>.
        </p>

        <h3>PG&E TOU cost</h3>
        <p>
          For a chosen plan and charging schedule, the app averages the plan&apos;s
          ¢/kWh rates by the share of daily energy in each hour, then multiplies
          by daily kWh per car
          <Cite id="tou" />. Year and month are 365× and ÷12 of that day cost.
          Simplified model: energy charges only. See{" "}
          <Link to={`/charge${qs}`}>Cost</Link>.
        </p>
      </section>

      <section className="methods-section" aria-labelledby="methods-citations">
        <h2 id="methods-citations">Citations</h2>
        <p className="methods-cite-intro">
          Numbered list derived from <code>CITATION_ORDER</code> in{" "}
          <code>citations.ts</code>, which reads <code>PROVENANCE</code> only.
        </p>
        <ol className="methods-cite-list numbered">
          {CITATIONS.map((c) => (
            <li key={c.id} id={`cite-${c.n}`}>
              <strong>
                [{c.n}] {c.title}.
              </strong>{" "}
              {c.detail}
              {c.url ? (
                <>
                  {" "}
                  <a href={c.url} target="_blank" rel="noreferrer">
                    Primary link
                  </a>
                  .
                </>
              ) : null}
              {c.secondaryUrl ? (
                <>
                  {" "}
                  <a href={c.secondaryUrl} target="_blank" rel="noreferrer">
                    {c.secondaryLabel ?? "Related"}
                  </a>
                  .
                </>
              ) : null}
            </li>
          ))}
        </ol>
        <ul className="methods-cite-list">
          <li>
            <strong>Confirmed (proxy caveats).</strong> Carbon intensity uses{" "}
            {PROVENANCE.carbon.factorsFile}; imports use{" "}
            {PROVENANCE.carbon.importsProxySource} (
            {PROVENANCE.carbon.importsProxyLbPerMwh} lb/MWh), not hourly import
            mix.
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
          Live metrics carry locked labels C1-C9 (Strong through Weak /
          Speculative) in <code>CLAIMS.md</code>. Weak or Speculative results
          must stay labeled illustrative or stress test. Citing CEC IEPR
          EV-vs-DC framing does not upgrade C6/C7/C8.
        </p>
      </section>
    </div>
  );
}
