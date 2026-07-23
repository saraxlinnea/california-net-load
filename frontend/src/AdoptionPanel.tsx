import { useMemo, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Plot from "react-plotly.js";
import type { Data } from "plotly.js";
import {
  N0,
  N_LDV,
  computeAdoptionStress,
  hasLdvTotal,
  todayAdoptionShare,
  type AdoptionStressResult,
} from "./adoptionStress";
import { buildLayout, buildRampAnnotation, basePlotlyLayout } from "./chartConfig";
import {
  buildShiftBridgeCallout,
  mixVsCecSavings,
} from "./insights";
import { PLOTLY_CONFIG } from "./plotlyConfig";
import { PROVENANCE } from "./provenance";
import {
  SHOW_SHIFT_PARTICIPATE,
  shareSearchString,
  type ShareState,
} from "./shareState";
import type { DayOption, EvRow, Scenario, TouRow } from "./types";
import { SCENARIO_META } from "./types";
import { Cite, WhyHint } from "./WhyHint";
import { DefinedTerm } from "./DefinedTerm";
import {
  estimateStorageToFlatten,
  formatGw,
  formatGwh,
} from "./storageSizing";

const HONESTY =
  "Illustrative: same CEC charging shape and kWh per car. Not a forecast.";

const MILES_PRIMARY_DISCLOSURE =
  "Assumes California's average miles driven per vehicle per day today, from federal highway data (statewide annual miles driven divided by number of vehicles). When a gas car is swapped for an EV, this model assumes the same driving habits carry over, not a change in how much someone drives.";

const MILES_SECONDARY_NOTE =
  "EV-specific studies disagree partly because today's EV owners are early adopters, not a stand-in for everyone. For a 50% or 100% fleet what-if, the statewide average is the better default.";

const FLEET_ONELINER =
  "% of California cars and light trucks (29.7M total, CEC) that are electric.";

const FLEET_DISCLOSURE =
  "Today uses the AFDC plug-in count. 50% and 100% scale today's CEC charging shape to those fleet sizes. What-if scale-up, not a forecast of when the on-road fleet turns over. ACC II sets new light-duty ZEV sales shares (35% in 2026, 68% in 2030, 100% by 2035): that is sales share, not on-road fleet share, so fleet share lags.";

const LARGE_FLEET_STRAIN_CAVEAT =
  "At 50% or 100% of California cars and light trucks, this what-if scale-up is large enough that targeting lowest-strain hours using the day's base grid net load (without the added EV charging) is less precise than at today's fleet size. Illustrative only; not a forecast or a real utility program.";

const SHIFT_DISCLOSURE =
  "This slider moves charging toward hours when this day's net load is lowest (demand minus wind and solar on the chart). That follows renewables instead of flattening total demand into a straight line. Flattening total demand still leaves midday oversupply and an evening gap; net load is the strain signal this site uses. Illustrative mix, not a real utility program.";

type Props = {
  rows: EvRow[];
  touRows: TouRow[];
  days: DayOption[];
  date: string;
  state: ShareState;
  onDateChange: (date: string) => void;
  onScenario: (scenario: Scenario) => void;
  onAdoption: (adoption: number) => void;
  onScale: (scale: number) => void;
  onParticipate: (participate: number) => void;
  onTodayFleet: () => void;
  onShowShift: () => void;
  onHalfLdvShift: () => void;
  pageGuide?: ReactNode;
};

type PresetId = "today" | "half" | "full" | "custom";

function activePreset(state: ShareState): PresetId {
  const today = todayAdoptionShare();
  if (state.scale != null && Math.abs(state.scale - 1) < 1e-6) return "today";
  if (today != null && Math.abs(state.adoption - today) < 1e-4) return "today";
  if (Math.abs(state.adoption - 0.5) < 1e-4) return "half";
  if (Math.abs(state.adoption - 1) < 1e-4) return "full";
  return "custom";
}

function formatMw(n: number): string {
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)} GW`;
  return `${Math.round(n).toLocaleString()} MW`;
}

function rowsWithNet(rows: EvRow[], netMw: number[]): EvRow[] {
  return rows.map((r, i) => ({ ...r, net_load_MW: netMw[i] ?? r.net_load_MW }));
}

function buildAdoptionTraces(
  rows: EvRow[],
  result: AdoptionStressResult,
): Data[] {
  const times = rows.map((r) => r.Time);
  const net = rows.map((r) => r.net_load_MW);
  const traces: Data[] = [
    {
      x: times,
      y: net,
      name: "Net load (grid only)",
      type: "scatter",
      mode: "lines",
      line: { color: "#b03a2e", width: 2.5 },
      hovertemplate: "%{y:,.0f} MW<extra>Net load</extra>",
    },
  ];

  if (result.participate > 0) {
    traces.push({
      x: times,
      y: result.unmanagedEvLoads,
      name: "EV unmanaged (ghost)",
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(31, 122, 76, 0.35)", width: 1.5, dash: "dot" },
      hovertemplate: "%{y:,.0f} MW<extra>Unmanaged CEC</extra>",
    });
    const ghostPlus = rows.map(
      (r, i) => r.net_load_MW + result.unmanagedEvLoads[i],
    );
    traces.push({
      x: times,
      y: ghostPlus,
      name: "Net + unmanaged (ghost)",
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(90, 62, 110, 0.35)", width: 1.5, dash: "dot" },
      hovertemplate: "%{y:,.0f} MW<extra>Net + unmanaged</extra>",
    });
  }

  const shiftPct = Math.round(result.participate * 100);
  traces.push({
    x: times,
    y: result.evLoads,
    name:
      shiftPct > 0
        ? `EV (${shiftPct}% lowest-strain shift)`
        : "EV (unmanaged CEC)",
    type: "scatter",
    mode: "lines",
    fill: "tozeroy",
    line: { color: "#1f7a4c", width: 1.5 },
    fillcolor: "rgba(31, 122, 76, 0.35)",
    hovertemplate: "%{y:,.0f} MW<extra>EV mix</extra>",
  });
  traces.push({
    x: times,
    y: result.netPlusEv,
    name: "Net load + EV",
    type: "scatter",
    mode: "lines",
    line: { color: "#5a3e6e", width: 2.5, dash: "dash" },
    hovertemplate: "%{y:,.0f} MW<extra>Net + EV</extra>",
  });

  return traces;
}

export default function AdoptionPanel({
  rows,
  touRows,
  days,
  date,
  state,
  onDateChange,
  onScenario,
  onAdoption,
  onScale,
  onParticipate,
  onTodayFleet,
  onShowShift,
  onHalfLdvShift,
  pageGuide,
}: Props) {
  const [searchParams] = useSearchParams();
  const qs = shareSearchString(searchParams);
  const ldvOk = hasLdvTotal();
  const preset = activePreset(state);
  const todayShare = todayAdoptionShare();
  const miles = PROVENANCE.milesPerDay;

  const fleetInput = useMemo(() => {
    if (state.scale != null) return { scale: state.scale };
    return { adoption: state.adoption };
  }, [state.adoption, state.scale]);

  const result = useMemo(
    () =>
      computeAdoptionStress(rows, state.scenario, {
        ...fleetInput,
        participate: state.participate,
      }),
    [rows, state.scenario, state.participate, fleetInput],
  );

  const resultUnmanaged = useMemo(
    () =>
      computeAdoptionStress(rows, state.scenario, {
        ...fleetInput,
        participate: 0,
      }),
    [rows, state.scenario, fleetInput],
  );

  const shiftBridge = useMemo(() => {
    const savings =
      touRows.length > 0
        ? mixVsCecSavings(
            rows,
            result.cecLoadsMw,
            result.evLoadsMw,
            date,
            touRows,
            state.scenario,
            "EV2-A",
          )
        : null;
    return buildShiftBridgeCallout({
      rampReliefMwPerHour: result.rampRelief,
      participate: state.participate,
      savingsYearlyPerCar: savings?.savingsYearlyPerCar ?? 0,
      savingsPlan: savings?.plan ?? "EV2-A",
      costFraming: "mixVsCec",
    });
  }, [
    rows,
    result.cecLoadsMw,
    result.evLoadsMw,
    result.rampRelief,
    state.participate,
    state.scenario,
    date,
    touRows,
  ]);

  const batteryCompare = useMemo(() => {
    const unmanagedNet = rows.map(
      (r, i) => r.net_load_MW + resultUnmanaged.unmanagedEvLoads[i],
    );
    const mixNet = rows.map((r, i) => r.net_load_MW + result.evLoads[i]);
    const todayPattern = estimateStorageToFlatten(
      rowsWithNet(rows, unmanagedNet),
    );
    const optimizedShift = estimateStorageToFlatten(rowsWithNet(rows, mixNet));
    return { todayPattern, optimizedShift };
  }, [rows, result, resultUnmanaged]);

  const chart = useMemo(() => {
    const data = buildAdoptionTraces(rows, result);
    const rampAnn = buildRampAnnotation(
      rows.map((r, i) => ({ ...r, net_load_MW: result.netPlusEv[i] })),
    );
    const base = basePlotlyLayout({
      legendPlacement: "right",
      margin: { t: 48, r: 150, b: 52, l: 60 },
    });
    const withShapes = buildLayout([], false, rampAnn ? [rampAnn] : []);
    return {
      data,
      layout: {
        ...base,
        shapes: withShapes.shapes,
        annotations: withShapes.annotations,
        title: {
          text: "Net load + EV charging",
          font: { size: 14 },
          x: 0,
          xanchor: "left" as const,
        },
        xaxis: {
          ...base.xaxis,
          title: {
            text: "Hour (US/Pacific)",
            font: { size: 11 },
          },
          tickformat: "%-I %p",
          dtick: 3 * 60 * 60 * 1000,
        },
        yaxis: {
          ...base.yaxis,
          title: { text: "MW", font: { size: 11 } },
          rangemode: "tozero" as const,
        },
      },
    };
  }, [rows, result]);

  const scaleValue = state.scale != null ? state.scale : result.scale;
  const customPct = Math.round(state.adoption * 1000) / 10;
  /** 50% / 100% CA cars & light trucks what-if (or custom at/above 50%). */
  const largeFleetScaleUp = ldvOk && result.adoption >= 0.5 - 1e-9;

  const chipToday0 =
    preset === "today" && Math.abs(state.participate) < 1e-6;
  const chipToday50 =
    preset === "today" && Math.abs(state.participate - 0.5) < 1e-4;
  const chipHalf50 =
    preset === "half" && Math.abs(state.participate - 0.5) < 1e-4;

  const dc = PROVENANCE.dataCenters;
  const dcPeakChart = useMemo(() => {
    const labels = [
      `Data centers today (${dc.asOf})`,
      "Data centers ~2040 (forecast)",
      "EV peak (this stress preset)",
    ];
    const values = [
      dc.peakMwApprox,
      dc.forecast2040PeakMwApprox,
      result.peakEvMw,
    ];
    return {
      data: [
        {
          type: "bar" as const,
          x: labels,
          y: values,
          marker: {
            color: ["#3a4a58", "#5c636b", "#1f7a4c"],
          },
          hovertemplate: "%{y:,.0f} MW<extra>%{x}</extra>",
        },
      ] as Data[],
      layout: {
        ...buildLayout([], false, []),
        title: {
          text: "Peak MW context: CEC data centers vs this EV stress peak",
          font: { size: 14 },
          x: 0,
          xanchor: "left" as const,
        },
        margin: { t: 56, r: 24, b: 96, l: 60 },
        yaxis: {
          title: { text: "MW (peak)" },
          rangemode: "tozero" as const,
        },
        xaxis: {
          title: { text: "" },
          tickangle: -15,
        },
        showlegend: false,
      },
    };
  }, [dc, result.peakEvMw]);

  return (
    <section className="adoption-panel" aria-label="Adoption stress test">
      <header className="hero hero-adoption">
        <h1>
          When EVs charge matters as much as how many there are
        </h1>
        <p className="lede">
          On a real <DefinedTerm id="caiso" /> day, the evening{" "}
          <DefinedTerm id="netLoad" /> climb is the hard window. This page scales
          California plug-in charging and shifts a share into{" "}
          <DefinedTerm id="lowestStrain" /> to see how that changes coincidence
          with the ramp, and what simplified PG&E energy $/car look like. Fleet
          presets are a what-if scale-up on today&apos;s{" "}
          <DefinedTerm id="cecShape" />, not forecasts of when the on-road fleet
          turns over.
        </p>
      </header>

      <section className="chart-panel" aria-label="Net load plus EV">
        <p className="chart-caption">
          This is a real California grid day. The midday dip is plentiful solar;
          the evening climb is when the grid has to ramp up fast. The green band
          is EV charging. Moving charging into{" "}
          <DefinedTerm id="lowestStrain" /> shows whether EVs add to that
          evening climb or avoid it.
        </p>
        <Plot
          data={chart.data}
          layout={{ ...chart.layout, autosize: true }}
          config={PLOTLY_CONFIG}
          style={{ width: "100%", height: "520px" }}
          useResizeHandler
        />
        <div className="chart-copy">
          <div
            className="adoption-chart-chips"
            role="group"
            aria-label="Quick chart presets"
          >
            <button
              type="button"
              className={
                chipToday0 ? "shift-preset chip-active" : "shift-preset"
              }
              onClick={() => {
                onTodayFleet();
                onParticipate(0);
              }}
            >
              Today · 0% shift
            </button>
            <button
              type="button"
              className={
                chipToday50 ? "shift-preset chip-active" : "shift-preset"
              }
              onClick={() => {
                onTodayFleet();
                onParticipate(0.5);
              }}
            >
              Today · 50% shift
            </button>
            <button
              type="button"
              className={
                chipHalf50 ? "shift-preset chip-active" : "shift-preset"
              }
              disabled={!ldvOk}
              onClick={onHalfLdvShift}
            >
              50% of CA cars · 50% shift
            </button>
          </div>
          {largeFleetScaleUp ? (
            <p className="field-hint fleet-scale-caveat">
              {LARGE_FLEET_STRAIN_CAVEAT}
            </p>
          ) : null}
          <p className="chart-sources">
            {HONESTY} <Link to={`/methods${qs}`}>Methods</Link>
          </p>
        </div>
      </section>

      <aside
        className="callout callout-honesty callout-share"
        aria-label="Shift charging bridge"
      >
        <p className="chart-caption">
          Same daily charging energy, different hours. Left: how much this
          illustrative shift eases the evening climb on this day. Right: PG&E
          energy charges only for that same mix, not a full utility bill.
        </p>
        <p className="callout-intro">{shiftBridge.intro}</p>
        {shiftBridge.showSplit ? (
          <div className="bridge-split">
            <div className="bridge-block">
              <p className="cost-sublabel">{shiftBridge.gridLabel}</p>
              <p className="bridge-value">{shiftBridge.gridValue}</p>
              <p className="bridge-detail">{shiftBridge.gridDetail}</p>
            </div>
            <div className="bridge-block">
              <p className="cost-sublabel">{shiftBridge.costLabel}</p>
              <p className="bridge-value">{shiftBridge.costValue}</p>
              <p className="bridge-detail">{shiftBridge.costDetail}</p>
            </div>
          </div>
        ) : null}
        <p className="callout-claims">
          Illustrative grid relief · PG&E energy charges only ·{" "}
          <Link to={`/methods${qs}`}>Methods</Link>
        </p>
      </aside>

      <aside
        className="callout callout-honesty battery-compare"
        aria-label="Battery needed to flatten net load"
      >
        <p className="chart-caption">
          How large a battery would need to be, in this back-of-envelope model,
          to smooth this day&apos;s <DefinedTerm id="netLoad" /> with today&apos;s
          charging pattern versus with more charging shifted to{" "}
          <DefinedTerm id="lowestStrain" />. Not a procurement recommendation.
        </p>
        {batteryCompare.todayPattern && batteryCompare.optimizedShift ? (
          <div className="bridge-split">
            <div className="bridge-block">
              <p className="cost-sublabel">Today&apos;s charging (unmanaged)</p>
              <p className="bridge-value">
                {formatGw(batteryCompare.todayPattern.powerMw)} ·{" "}
                {formatGwh(batteryCompare.todayPattern.nameplateEnergyMwh)}
              </p>
              <p className="bridge-detail">
                ~{batteryCompare.todayPattern.durationHours.toFixed(1)} h at
                nameplate (back-of-envelope)
              </p>
            </div>
            <div className="bridge-block">
              <p className="cost-sublabel">With optimized shift</p>
              <p className="bridge-value">
                {formatGw(batteryCompare.optimizedShift.powerMw)} ·{" "}
                {formatGwh(batteryCompare.optimizedShift.nameplateEnergyMwh)}
              </p>
              <p className="bridge-detail">
                ~{batteryCompare.optimizedShift.durationHours.toFixed(1)} h at
                nameplate (back-of-envelope)
              </p>
            </div>
          </div>
        ) : (
          <p className="bridge-detail">
            Not enough hours in the belly-to-evening window to size storage for
            this day.
          </p>
        )}
        <p className="callout-claims">
          Back-of-envelope flatten on net + EV · not a procurement study ·{" "}
          <Link to={`/methods${qs}`}>Methods</Link>
        </p>
      </aside>

      <section className="controls" aria-label="Adoption controls">
        {days.length > 0 && (
          <label className="field">
            <span>Day</span>
            <select
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
            >
              {days.map((day) => (
                <option key={day.date} value={day.date}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <fieldset className="field scenario">
          <legend className="legend-with-hint">
            <span>Fleet</span>
            <WhyHint label="Why this fleet control">
              <p>
                {FLEET_DISCLOSURE} <Cite id={["afdc", "ldv", "accIi"]} />
              </p>
              <p>{LARGE_FLEET_STRAIN_CAVEAT}</p>
            </WhyHint>
          </legend>
          <p className="field-hint fleet-oneliner">
            {FLEET_ONELINER} <Cite id="ldv" />
          </p>
          <label className={preset === "today" ? "active" : undefined}>
            <input
              type="radio"
              name="adoption-preset"
              checked={preset === "today"}
              onChange={() => onTodayFleet()}
            />
            Today&apos;s plug-ins
          </label>
          <label
            className={preset === "half" ? "active" : undefined}
            title={ldvOk ? undefined : "verify CEC light-duty total"}
          >
            <input
              type="radio"
              name="adoption-preset"
              checked={preset === "half"}
              disabled={!ldvOk}
              onChange={() => onAdoption(0.5)}
            />
            50% of CA cars &amp; light trucks
          </label>
          <label
            className={preset === "full" ? "active" : undefined}
            title={ldvOk ? undefined : "verify CEC light-duty total"}
          >
            <input
              type="radio"
              name="adoption-preset"
              checked={preset === "full"}
              disabled={!ldvOk}
              onChange={() => onAdoption(1)}
            />
            100% of CA cars &amp; light trucks
          </label>
          {largeFleetScaleUp ? (
            <p className="field-hint fleet-scale-caveat">
              {LARGE_FLEET_STRAIN_CAVEAT}
            </p>
          ) : null}
        </fieldset>

        {!ldvOk && (
          <p className="field-hint adoption-warn">
            verify CEC light-duty vehicle total
          </p>
        )}

        <details className="field advanced-fleet">
          <summary>Advanced fleet inputs</summary>
          {ldvOk && (
            <label className="field">
              <span>Custom % of CA cars &amp; light trucks</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={customPct}
                disabled={!ldvOk}
                onChange={(event) => {
                  const pct = Number(event.target.value);
                  if (!Number.isFinite(pct)) return;
                  onAdoption(Math.min(100, Math.max(0, pct)) / 100);
                }}
              />
              <span className="field-hint">
                {todayShare != null && (
                  <>
                    Today ≈ {(todayShare * 100).toFixed(2)}% of CEC total (
                    {N_LDV?.toLocaleString()})
                  </>
                )}
              </span>
            </label>
          )}
          <label className="field">
            <span>× today&apos;s plug-ins</span>
            <input
              type="number"
              min={0}
              max={50}
              step={0.1}
              value={Math.round(scaleValue * 100) / 100}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next) || next < 0) return;
                onScale(next);
              }}
            />
            <span className="field-hint">
              1× = {N0.toLocaleString()} plug-ins on the road today
            </span>
          </label>
        </details>

        <fieldset className="field scenario miles-primary">
          <legend className="legend-with-hint">
            <span>Miles/day</span>
            <WhyHint label="Why this miles assumption">
              <p>
                {MILES_PRIMARY_DISCLOSURE} <Cite id="milesPerDay" />
              </p>
            </WhyHint>
          </legend>
          <label className={state.scenario === "mid" ? "active" : undefined}>
            <input
              type="radio"
              name="adoption-scenario"
              value="mid"
              checked={state.scenario === "mid"}
              onChange={() => onScenario("mid")}
            />
            {miles.primaryMiles} mi/day (CA average, FHWA 2023)
            <Cite id="milesPerDay" />
          </label>
        </fieldset>

        <fieldset className="field scenario miles-secondary">
          <legend className="legend-with-hint">
            <span>What if EV drivers differ</span>
            <WhyHint label="Why EV-study miles differ">
              <p>{MILES_SECONDARY_NOTE}</p>
            </WhyHint>
          </legend>
          <label className={state.scenario === "low" ? "active" : undefined}>
            <input
              type="radio"
              name="adoption-scenario"
              value="low"
              checked={state.scenario === "low"}
              onChange={() => onScenario("low")}
            />
            {SCENARIO_META.low.miles} mi/day
          </label>
          <label className={state.scenario === "high" ? "active" : undefined}>
            <input
              type="radio"
              name="adoption-scenario"
              value="high"
              checked={state.scenario === "high"}
              onChange={() => onScenario("high")}
            />
            {SCENARIO_META.high.miles} mi/day
          </label>
        </fieldset>

        <label className="field">
          <span className="legend-with-hint">
            <span>
              % shifted to <DefinedTerm id="lowestStrain" /> (
              {Math.round(state.participate * 100)}%)
            </span>
            <WhyHint label="Why lowest-strain hours">
              <p>{SHIFT_DISCLOSURE}</p>
            </WhyHint>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(state.participate * 100)}
            onChange={(event) =>
              onParticipate(Number(event.target.value) / 100)
            }
          />
          <span className="field-hint">
            Same daily kWh; hours weighted toward this day&apos;s lowest{" "}
            <DefinedTerm id="caiso" /> <DefinedTerm id="netLoad" />.
            {resultUnmanaged.ramp && result.ramp ? (
              <>
                {" "}
                Evening ramp{" "}
                {Math.round(resultUnmanaged.ramp.mwPerHour).toLocaleString()}{" "}
                → {Math.round(result.ramp.mwPerHour).toLocaleString()} MW/h
                {result.rampRelief > 0
                  ? ` (eases ${Math.round(result.rampRelief).toLocaleString()})`
                  : ""}
                .
              </>
            ) : null}
          </span>
          <button type="button" className="shift-preset" onClick={onShowShift}>
            Show the shift ({Math.round(SHOW_SHIFT_PARTICIPATE * 100)}%
            lowest-strain)
          </button>
        </label>
      </section>

      <div className="adoption-key-stats" aria-label="Key numbers">
        <p>
          <strong>Peak EV</strong> {formatMw(result.peakEvMw)}
          {" · "}
          <strong>Ramp relief</strong>{" "}
          {Math.round(result.rampRelief).toLocaleString()} MW/h vs unmanaged
        </p>
      </div>

      <section
        className="chart-panel"
        aria-label="Data center peak share versus EV stress peak"
      >
        <p className="chart-caption">
          Data centers are a real load on the system. CEC&apos;s forecast still
          treats EV charging as a larger driver of California peak demand growth
          through 2045. Bars are context, not an apples-to-apples forecast match
          to the EV stress peak.
        </p>
        <Plot
          data={dcPeakChart.data}
          layout={{ ...dcPeakChart.layout, autosize: true }}
          config={PLOTLY_CONFIG}
          style={{ width: "100%", height: "320px" }}
          useResizeHandler
        />
        <div className="chart-copy">
          <p className="chart-sources">
            <a
              href={PROVENANCE.dataCenters.url}
              target="_blank"
              rel="noreferrer"
            >
              {PROVENANCE.dataCenters.source}
            </a>
            <Cite id="dataCenters" />
            {" · "}
            {PROVENANCE.dataCenters.forecast2040Label}
          </p>
        </div>
      </section>

      {pageGuide}
    </section>
  );
}

export { HONESTY as ADOPTION_HONESTY };
