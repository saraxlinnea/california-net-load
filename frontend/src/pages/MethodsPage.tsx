import { Link, useSearchParams } from "react-router-dom";
import { CITATIONS } from "../citations";
import { CLAIM, CLAIM_ORDER } from "../claims";
import { PROVENANCE } from "../provenance";
import { shareSearchString } from "../shareState";
import { Cite } from "../WhyHint";
import "../App.css";

/**
 * Formulas, assumptions, and sources. Summarizes MATH.md / BENCHMARKS.md /
 * provenance; numbered list is derived from CITATION_ORDER / PROVENANCE only.
 */
export default function MethodsPage() {
  const [searchParams] = useSearchParams();
  const qs = shareSearchString(searchParams);
  const miles = PROVENANCE.milesPerDay;

  return (
    <div className="page methods-page">
      <header className="hero">
        <h1>Formulas, assumptions, and sources</h1>
        <p className="lede">
          How California Grid Load charts and PG&E $/car figures are computed,
          which choices are model assumptions, and which numbers are Confirmed
          versus Unverified.
        </p>
        <p className="honesty">
          Summarizes <code>MATH.md</code>, <code>BENCHMARKS.md</code>, and{" "}
          <code>provenance.ts</code>; it does not replace primary sources.
          Superscripts elsewhere link to the numbered list below.
        </p>
        <p className="verified">
          Sources verified as of <strong>{PROVENANCE.verifiedAsOf}</strong>
          {" · "}
          CEC light-duty vehicle stock retrieved{" "}
          <strong>{PROVENANCE.population.ldvRetrievedAsOf}</strong>
        </p>
      </header>

      <section
        className="methods-section"
        id="methods-formulas"
        aria-labelledby="methods-formulas-heading"
      >
        <h2 id="methods-formulas-heading">Key formulas</h2>
        <p>
          Adapted from <code>MATH.md</code>. Full symbol tables and pull-script
          sanity checks stay in that file.
        </p>

        <h3 id="formula-net-load">Net load (CAISO)</h3>
        <p>
          Hourly net load is system demand minus solar and wind (CA ISO-TAC)
          <Cite id="grid" />. Small overnight negatives in solar/wind are
          clipped to 0 before subtraction. The chart fill between net and total
          load is solar plus wind (wind band then solar band), not a stack from
          zero.
        </p>
        <p className="methods-formula">net_load = load − solar − wind</p>
        <p className="methods-formula">
          load − net_load = solar + wind
        </p>

        <h3 id="formula-ramp">Evening ramp (MW/h)</h3>
        <p>
          Daytime belly = minimum net load in hours 09:00–16:00. Evening peak =
          maximum net load at or after that belly hour. Ramp is the average
          climb over that window, not the steepest single-hour slope
          <Cite id="grid" />.
        </p>
        <p className="methods-formula">
          ramp_MW/h = (net_peak − net_belly) / (hour_peak − hour_belly)
        </p>
        <p>
          Fleet ramp relief (unmanaged vs mix) locks belly and peak{" "}
          <em>hours</em> from grid-only net load, then measures both series on
          that same hour pair so the MW/h comparison does not mix different
          windows when EV load moves the peak.
        </p>
        <p className="methods-formula">
          rampRelief = rate(net+unmanaged) − rate(net+mix) &nbsp;(same hours)
        </p>
        <p>
          When solar + wind nearly match load (deep midday belly), net load is
          a small residual and is more sensitive to data and hourly-mean
          aggregation error; net-weighted charging shift inherits that.
        </p>

        <h3 id="formula-ev-overlay">EV charging overlay</h3>
        <p>
          Hourly CEC shares s<sub>h</sub> sum to 1 (season and weekday/weekend
          matched)
          <Cite id="evShape" />. Daily energy uses fleet N, miles/day m, and
          0.30 kWh/mi; primary m is {miles.primaryMiles} (FHWA)
          <Cite id={["afdc", "milesPerDay"]} />. At today&apos;s AFDC plug-in
          fleet that yields about{" "}
          {miles.midDailyEnergyMwhAtN0.toLocaleString()} MWh/day.
        </p>
        <p className="methods-formula">
          E_day (MWh) = N × m × 0.30 / 1000
        </p>
        <p className="methods-formula">
          ev_MW<sub>h</sub> = E_day × s<sub>h</sub>
        </p>
        <p>
          Series are hourly. For a 1-hour interval, 1 MW average power equals
          1 MWh of energy, so E_day × s<sub>h</sub> is both the MWh in hour h
          and the average MW that hour. Summing hourly EV MW over the day
          recovers E_day in MWh. The same Δt = 1 h convention applies wherever
          this site sums hourly MW as daily MWh (CAISO load share, fuel-mix
          totals, storage charge/discharge).
        </p>
        <p className="methods-formula">
          net_clean<sub>h</sub> = net_load<sub>h</sub> − ev_CEC<sub>h</sub>(N
          <sub>0</sub>)
        </p>
        <p className="methods-formula">
          net_plus_unmanaged<sub>h</sub> = net_clean<sub>h</sub> + ev_CEC
          <sub>h</sub>(N)
        </p>
        <p className="methods-formula">
          net_plus_shifted<sub>h</sub> = net_clean<sub>h</sub> + ev_mix
          <sub>h</sub>(N, p)
        </p>
        <p>
          CAISO metered load already embeds some EV charging. The Fleet chart
          subtracts today&apos;s modeled CEC profile at N<sub>0</sub>, then adds
          back the full selected fleet as unmanaged or shifted charging. Both
          lines use the same daily energy E(N); the comparison is timing, not
          EVs present versus absent.
        </p>

        <h3 id="formula-adoption">Fleet scale and mix</h3>
        <p>
          Fleet size is a share a of CA light-duty stock (
          {PROVENANCE.population.ldvTotal.toLocaleString()}, as of{" "}
          {PROVENANCE.population.ldvAsOf})
          <Cite id="ldv" /> or a multiple s of today&apos;s AFDC plug-ins (
          {PROVENANCE.population.bevPlusPhev.toLocaleString()},{" "}
          {PROVENANCE.population.year})
          <Cite id="afdc" />. Hourly EV load scales linearly with N (same CEC
          shape and kWh per car). Participation p mixes unmanaged CEC with the
          net-load-weighted shape below. Scale-up / mix is stress arithmetic,
          not a forecast of where new EVs appear, when stock turns over, or
          how charging behavior changes. See <Link to={`/${qs}`}>Fleet</Link>.
        </p>
        <p className="methods-formula">
          N = a · N_LDV &nbsp; or &nbsp; N = s · N<sub>0</sub>
        </p>
        <p className="methods-formula">
          ev_mix<sub>h</sub> = (1 − p) · ev_CEC<sub>h</sub> + p · ev_opt
          <sub>h</sub>
        </p>
        <p className="methods-formula">
          Σ ev_CEC(N) = Σ ev_mix(N, p) = E(N) &nbsp;(same daily kWh)
        </p>

        <h3 id="methods-lowest-strain">
          Net-load-weighted shape (Fleet page)
        </h3>
        <p>
          Same daily energy E as the CEC series at fleet N, redistributed toward
          hours when EV-removed net + unmanaged EV at that fleet is lowest
          (one-pass feedback)
          <Cite id="grid" />. ε keeps every hour eligible if the series is flat.
          Not a utility DR schedule ({CLAIM.C7.id} · {CLAIM.C7.label}).
        </p>
        <p className="methods-formula">
          n<sub>h</sub> = net_clean<sub>h</sub> + ev_CEC<sub>h</sub>; &nbsp; w
          <sub>h</sub> = max(n_max − n<sub>h</sub>, 0) + ε
        </p>
        <p className="methods-formula">
          ev_opt<sub>h</sub> = E × w<sub>h</sub> / Σ w<sub>j</sub>
        </p>

        <h3 id="formula-midday-offpeak">
          Midday solar window and off-peak split (Cost, illustrative)
        </h3>
        <p>
          Cost-page midday keeps the same daily energy E, redistributed into
          hours 10–15 weighted by solar; if solar weights sum to 0, use equal
          shares over those six hours
          <Cite id="grid" />. Off-peak schedule: equal split of E across hours
          at the plan&apos;s minimum TOU rate
          <Cite id="tou" />. Neither is a real utility program.
        </p>
        <p className="methods-formula">
          midday: w<sub>h</sub> = max(solar<sub>h</sub>, 0) for h in 10…15;
          else 0
        </p>
        <p className="methods-formula">
          ev_managed<sub>h</sub> = E × w<sub>h</sub> / Σ w<sub>j</sub>
        </p>

        <h3 id="formula-tou">PG&E TOU cost</h3>
        <p>
          For plan p and shape s (CEC, midday, or off-peak), r<sub>h</sub> is
          ¢/kWh from the verified PG&E schedule
          <Cite id="tou" />. Year and month annualize one season day. Energy
          charges only; not a full bill ({CLAIM.C5.id} · {CLAIM.C5.label}).
          Cost UI is parked; formulas stay here.
        </p>
        <p className="methods-formula">
          r̄ = Σ<sub>h∈rated</sub> (ev<sup>s</sup><sub>h</sub> / E_rated) · r
          <sub>h</sub>
          &nbsp;(renormalize over hours with a TOU rate; if none overlap, equal
          mean of available rates)
        </p>
        <p className="methods-formula">
          ¢/car·day = (m × 0.30) × r̄
        </p>
        <p className="methods-formula">
          $/car·year = 365 × ¢/car·day / 100; &nbsp; $/car·month = year / 12
        </p>

        <h3 id="formula-ci">Carbon intensity (operational stack)</h3>
        <p>
          Hourly CI from CAISO fuel-mix MW and emission factors in{" "}
          {PROVENANCE.carbon.factorsFile}. For each hour, MW × 1 h ≡ MWh in the
          CI denominator. Generation floored at 0; batteries count discharge
          only at EF = 0. Imports use{" "}
          {PROVENANCE.carbon.importsProxyLbPerMwh} lb CO₂/MWh (
          {PROVENANCE.carbon.importsProxySource}), not hourly import mix (
          {CLAIM.C9.id} · {CLAIM.C9.label}). See <Link to={`/fuel${qs}`}>Fuel</Link>.
        </p>
        <p className="methods-formula">
          CI<sub>t</sub> = Σ (g⁺<sub>f,t</sub> · EF<sub>f</sub>) / Σ g⁺
          <sub>f,t</sub> &nbsp; (lb CO₂/MWh)
        </p>
        <p>
          Fuel-page daily CO₂ totals are in <strong>US short tons</strong> (1
          short ton = 2000 lb), not SI tonnes. Midday vs evening lb CO₂ per car
          charge uses generation-weighted <em>average</em> stack CI in that
          window times one car&apos;s daily kWh; it is not marginal dispatch
          carbon or lifecycle emissions.
        </p>

        <h3 id="methods-storage">Storage flatten (back-of-envelope, C8 Weak)</h3>
        <p>
          Window W = hours 09–21 inclusive (9 a.m. through 9 p.m.). Target T =
          mean net load on W. Charge when net &lt; T; discharge when net &gt; T.
          Primary E and duration use a lossless shift (bars match). Optional
          nameplate uplift E/η with η = 0.90 is shown separately and is not
          applied to the path. This is not a chronological state-of-charge
          dispatch: hour order and intermediate SOC limits are not simulated,
          so the implied path may be infeasible. Perfect foresight, hourly
          averages; not RA or interconnection ({CLAIM.C8.id} · {CLAIM.C8.label}
          ). See <Link to={`/storage${qs}`}>Storage</Link>.
        </p>
        <p className="methods-formula">T = mean(net_load on W)</p>
        <p className="methods-formula">
          E_charge = Σ max(T − net<sub>h</sub>, 0); &nbsp; E_discharge = Σ
          max(net<sub>h</sub> − T, 0)
        </p>
        <p className="methods-formula">
          P = max |net<sub>h</sub> − T|; &nbsp; E_usable = max(E_charge,
          E_discharge); &nbsp; duration_h = E_usable / P
        </p>
        <p className="methods-formula">
          E_nameplate = E_usable / 0.90 &nbsp;(optional uplift only)
        </p>
      </section>

      <section
        className="methods-section"
        id="methods-worked-example"
        aria-labelledby="methods-worked-example-heading"
      >
        <h2 id="methods-worked-example-heading">Worked example</h2>
        <p>
          Today&apos;s AFDC plug-in fleet at primary miles/day, then one hour of
          CEC-shaped MW. All figures are locked in{" "}
          <code>provenance.ts</code> / <code>MATH.md</code>.
        </p>
        <ol className="methods-worked-steps">
          <li>
            Fleet N<sub>0</sub> ={" "}
            {PROVENANCE.population.bevPlusPhev.toLocaleString()} BEV+PHEV (
            {PROVENANCE.population.year})
            <Cite id="afdc" />.
          </li>
          <li>
            Miles/day m = {miles.primaryMiles} (FHWA 2023 CA average)
            <Cite id="milesPerDay" />; intensity k = 0.30 kWh/mi (
            <code>MATH.md</code>).
          </li>
          <li>
            Daily energy: E_day = N<sub>0</sub> × m × 0.30 / 1000 ≈{" "}
            {miles.midDailyEnergyMwhAtN0.toLocaleString()} MWh/day.
          </li>
          <li>
            One hour: ev_MW<sub>h</sub> = E_day × s<sub>h</sub>, where s
            <sub>h</sub> is that hour&apos;s CEC share (shares sum to 1; late
            night carries more of the day than midday)
            <Cite id="evShape" />. No single peak-hour share is locked as a UI
            constant here.
          </li>
          <li>
            Chart identity (same day, without EV): net_load = load − solar −
            wind
            <Cite id="grid" />. Overlay adds ev_MW<sub>h</sub> to net load.
          </li>
          <li>
            PG&E ¢/car·day uses that day&apos;s hourly energy shares × plan
            rates (energy ¢ only)
            <Cite id="tou" />. Cost UI is parked; see TOU formulas above.
          </li>
        </ol>
      </section>

      <section
        className="methods-section"
        aria-labelledby="methods-assumptions-heading"
        id="methods-assumptions"
      >
        <h2 id="methods-assumptions-heading">Assumptions</h2>
        <p>
          Model choices that sit on top of primary sources. Each item states
          what we assume, why, and where the evidence lives. Strength labels
          (C1–C9) are defined under Claim strength below.
        </p>

        <article className="methods-assumption">
          <h3>Energy intensity: 0.30 kWh/mi</h3>
          <p>
            <strong>Assumption.</strong> Every modeled car uses 0.30 kWh per
            mile when converting miles/day into daily charging energy.
          </p>
          <p>
            <strong>Why.</strong> A single planning factor keeps fleet
            scale-ups comparable. It is not vehicle-specific efficiency.
          </p>
          <p>
            <strong>Evidence.</strong> Model choice documented in{" "}
            <code>MATH.md</code> as a DOE / EPA / NREL planning-range value
            (no separate citation id in <code>CITATION_ORDER</code> yet).
            Feeds C2 daily-energy arithmetic ({CLAIM.C2.label}).
          </p>
        </article>

        <article className="methods-assumption">
          <h3>
            Miles/day: {miles.primaryMiles} primary; what-if{" "}
            {miles.lowWhatIfMiles} / {miles.highWhatIfMiles}
          </h3>
          <p>
            <strong>Assumption.</strong> Fleet and Cost default to{" "}
            {miles.primaryMiles} mi/day (CA average). Drivers may optionally
            use {miles.lowWhatIfMiles} or {miles.highWhatIfMiles} mi/day as
            what-ifs.
          </p>
          <p>
            <strong>Why.</strong> Statewide average miles keep the base case
            tied to how California vehicles are driven today; the secondary
            chips explore EV-study ranges without replacing the primary.
          </p>
          <p>
            <strong>Evidence.</strong> Primary from FHWA 2023 Table VM-2 (VMT ÷
            registered vehicles ÷ 365)
            <Cite id="milesPerDay" />. Secondary what-ifs are labeled as such
            in the UI (GW/NREL and UC Davis ranges in{" "}
            <code>BENCHMARKS.md</code>). C2 ({CLAIM.C2.label}).
          </p>
        </article>

        <article className="methods-assumption">
          <h3>Today&apos;s plug-in share of CA light-duty stock</h3>
          <p>
            <strong>Assumption.</strong> Display share a<sub>0</sub> ≈ N
            <sub>0</sub> / N<sub>LDV</sub> uses AFDC {PROVENANCE.population.year}{" "}
            plug-ins ({PROVENANCE.population.bevPlusPhev.toLocaleString()}) over
            CEC light-duty vehicle stock as of {PROVENANCE.population.ldvAsOf} (
            {PROVENANCE.population.ldvTotal.toLocaleString()}).
          </p>
          <p>
            <strong>Why.</strong> Those are the best locked primary counts for
            plug-ins and all light-duty stock, even though the years differ by
            one.
          </p>
          <p>
            <strong>Evidence.</strong>
            <Cite id={["afdc", "ldv"]} /> Claim {CLAIM.C4.id} ({CLAIM.C4.label})
            because the stock years are not identical.
          </p>
        </article>

        <article className="methods-assumption">
          <h3>Linear fleet scale-up</h3>
          <p>
            <strong>Assumption.</strong> At any fleet size N, hourly EV MW keep
            the same CEC shape and the same kWh per car; only N scales.
          </p>
          <p>
            <strong>Why.</strong> Makes 50% / 100% of CA cars &amp; light trucks
            transparent stress arithmetic. This viewer does not invent where
            incremental charging lands (county, feeder, workplace vs home), when
            stock turns over, or how behavior and rates will change the shape.
            Keeping today&apos;s CEC shape and kWh per car fixed is the least
            invented way to show scale; it is not a forecast, RA study, or
            distribution analysis. (IEPR and similar forecasts do model
            geography and turnover; those are separate from this slider.)
          </p>
          <p>
            <strong>Evidence.</strong> Model choice in <code>MATH.md</code> §3b
            and <code>adoptionStress.ts</code>. Shape from CEC
            <Cite id="evShape" />. Claim {CLAIM.C6.id} ({CLAIM.C6.label}).
          </p>
        </article>

        <article className="methods-assumption">
          <h3>EV-removed baseline, then full fleet</h3>
          <p>
            <strong>Assumption.</strong> Historical CAISO load already includes
            some EV charging. The Fleet chart subtracts today&apos;s modeled CEC
            profile at N<sub>0</sub> from net load, then adds back the full
            selected fleet as unmanaged CEC or as the p-mix with lowest-strain
            hours. Unmanaged and mix conserve the same daily energy E(N).
          </p>
          <p>
            <strong>Why.</strong> Avoids double-counting today&apos;s embedded
            EV charging when N differs from N<sub>0</sub>, while comparing
            timing at one fleet size rather than &quot;with EVs vs without
            EVs.&quot;
          </p>
          <p>
            <strong>Evidence.</strong> Model choice in <code>MATH.md</code> §3 /
            §3b and <code>adoptionStress.ts</code>. Claim {CLAIM.C6.id} (
            {CLAIM.C6.label}).
          </p>
        </article>

        <article className="methods-assumption">
          <h3>Lowest-strain mix uses EV-removed net + unmanaged EV</h3>
          <p>
            <strong>Assumption.</strong> Participation p mixes unmanaged CEC
            charging with a shape weighted toward hours when EV-removed net +
            unmanaged EV at fleet N is lowest (one-pass feedback). Still
            illustrative.
          </p>
          <p>
            <strong>Why.</strong> At large fleets, ignoring EV already placed on
            the day understates strain; one feedback pass is a small honesty
            upgrade without claiming an iterative OPF.
          </p>
          <p>
            <strong>Evidence.</strong> Model choice (
            <code>redistributeEnergyToLowestNet</code>, <code>MATH.md</code>{" "}
            §4a). Large-fleet caveat on Fleet. Claim {CLAIM.C7.id} (
            {CLAIM.C7.label}): modeled mix, not a real utility program.
          </p>
        </article>

        <article className="methods-assumption">
          <h3>Cost midday schedule ≠ Fleet lowest-strain mix</h3>
          <p>
            <strong>Assumption.</strong> Cost-page midday charging
            redistributes the same daily kWh into hours 10–15 weighted by
            solar. Fleet&apos;s shift uses the net-load-weighted mix above.
            They are two different model schedules.
          </p>
          <p>
            <strong>Why.</strong> Cost tells a PG&E bill-clock story
            (solar-window DR). Fleet tells a grid-strain story (lowest net
            load). Merging them would blur both claims.
          </p>
          <p>
            <strong>Evidence.</strong> Model choice in <code>MATH.md</code> §4a
            vs §4b; <code>managedEvLoads</code> vs{" "}
            <code>netLoadOptimizedEvLoads</code>. Related claims {CLAIM.C5.id}{" "}
            ({CLAIM.C5.label}) and {CLAIM.C7.id} ({CLAIM.C7.label}).
          </p>
        </article>

        <article className="methods-assumption">
          <h3>TOU costs: energy ¢ only, PG&E only</h3>
          <p>
            <strong>Assumption.</strong> $/car figures use PG&E EV2-A / EV-B
            energy rates only. No fixed charges, taxes, CARE, or other
            utilities (SCE / SDG&E not verified here).
          </p>
          <p>
            <strong>Why.</strong> Keeps the schedule comparison honest and
            territory-scoped until other IOU rates are verified and pasted.
          </p>
          <p>
            <strong>Evidence.</strong>
            <Cite id="tou" /> Claim {CLAIM.C5.id} ({CLAIM.C5.label});
            simplified bill model in <code>MATH.md</code> §5.
          </p>
        </article>

        <article className="methods-assumption">
          <h3>Annualize one season day × 365 (then ÷12)</h3>
          <p>
            <strong>Assumption.</strong> $/car·year = 365 × that day&apos;s
            ¢/car·day; $/car·month = year ÷ 12.
          </p>
          <p>
            <strong>Why.</strong> Gives a readable yearly/monthly headline from
            a single locked season day without claiming a full weather-year
            bill.
          </p>
          <p>
            <strong>Evidence.</strong> Model choice in <code>MATH.md</code> §5.
            Claim {CLAIM.C5.id} ({CLAIM.C5.label}) with annualization caveat.
          </p>
        </article>

        <article className="methods-assumption">
          <h3>Imports carbon: eGRID CAMX annual proxy</h3>
          <p>
            <strong>Assumption.</strong> Import MW in the fuel stack use{" "}
            {PROVENANCE.carbon.importsProxyLbPerMwh} lb CO₂/MWh (
            {PROVENANCE.carbon.importsProxySource}), not the true hourly import
            mix.
          </p>
          <p>
            <strong>Why.</strong> Hourly import carbon is not in the processed
            CAISO fuel-mix files this app uses.
          </p>
          <p>
            <strong>Evidence.</strong> Documented in <code>MATH.md</code> §7 and{" "}
            <code>provenance.ts</code> ({PROVENANCE.carbon.factorsFile}). Claim{" "}
            {CLAIM.C9.id} ({CLAIM.C9.label}).
          </p>
        </article>

        <article className="methods-assumption">
          <h3>Storage flatten window (back-of-envelope)</h3>
          <p>
            <strong>Assumption.</strong> Battery size targets a flat mean net
            load over the 9 a.m. through 9 p.m. window (hours 09–21), with
            charge below target and discharge above. Primary E / duration and
            chart bars are a lossless shift; η = 90% appears only as an optional
            nameplate uplift, not applied to the path.
          </p>
          <p>
            <strong>Why.</strong> A single belly-to-evening window is enough to
            illustrate order-of-magnitude MW / MWh, not to site or procure
            storage. Separating lossless E from η avoids contradictory physics
            on the chart.
          </p>
          <p>
            <strong>Evidence.</strong> Model choice in <code>MATH.md</code> §8
            and <code>storageSizing.ts</code>. Claim {CLAIM.C8.id} (
            {CLAIM.C8.label}).
          </p>
        </article>
      </section>

      <section
        className="methods-section"
        id="methods-citations"
        aria-labelledby="methods-citations-heading"
      >
        <h2 id="methods-citations-heading">Citations</h2>
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

      <section
        className="methods-section"
        id="methods-claims"
        aria-labelledby="methods-claims-heading"
      >
        <h2 id="methods-claims-heading">Claim strength</h2>
        <p>
          Charts and callouts carry a confidence label so Strong facts are not
          confused with illustrative stress tests. When you see C1–C9 next to a
          number, it maps to the list below.
        </p>
        <dl className="methods-claim-scale">
          <div>
            <dt>Strong</dt>
            <dd>
              Tied to a primary source or a definitional identity (for example
              net load = load − solar − wind).
            </dd>
          </div>
          <div>
            <dt>Moderate</dt>
            <dd>
              Built from verified inputs, with known simplifications (year
              mismatch, energy-only bill, annual imports proxy).
            </dd>
          </div>
          <div>
            <dt>Weak</dt>
            <dd>
              Back-of-envelope or heavy assumptions. Treat as order-of-magnitude,
              not a forecast you can bank on.
            </dd>
          </div>
          <div>
            <dt>Weak / Speculative</dt>
            <dd>
              Illustrative model behavior (for example a “lowest-strain” mix).
              Not a real utility program or procurement study.
            </dd>
          </div>
        </dl>
        <p>
          Weak and Speculative results on the site are labeled illustrative or
          stress test. The CEC&apos;s finding that EV charging (not data centers)
          is the largest projected driver of CAISO peak growth
          <Cite id="ieprDemandForecast" /> is a forecast citation in the site
          intro; it does not make this site&apos;s fleet scale-up (C6), charging
          shift (C7), or storage sizing (C8) Strong. Peak Forecast coincident
          levels imply EV growth +
          {PROVENANCE.ieprDemandForecast.matchedPeakLevels2025Vs2045.growthEvMw.toLocaleString()}{" "}
          MW (2045 minus 2025), while Item 6 slide 10 lists +
          {PROVENANCE.ieprDemandForecast.matchedPeakGrowth2025To2045.evMw.toLocaleString()}{" "}
          MW for EVs; data-center growth is +
          {PROVENANCE.ieprDemandForecast.matchedPeakLevels2025Vs2045.growthDataCentersMw.toLocaleString()}{" "}
          MW in both.
        </p>
        <ul className="methods-claim-list">
          {CLAIM_ORDER.map((id) => {
            const c = CLAIM[id];
            return (
              <li key={id}>
                <strong>
                  {c.id} · {c.label}.
                </strong>{" "}
                {c.summary}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
