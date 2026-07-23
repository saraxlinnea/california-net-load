import { useMemo, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AnimatedPlot from "./AnimatedPlot";
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
import { PROVENANCE } from "./provenance";
import {
  shareSearchString,
  type ShareState,
} from "./shareState";
import type { DayOption, EvRow, Scenario } from "./types";
import { SCENARIO_META } from "./types";
import { Cite, WhyHint } from "./WhyHint";
import { DefinedTerm } from "./DefinedTerm";
import {
  estimateStorageToFlatten,
  formatGw,
  formatGwh,
} from "./storageSizing";
import {
  PEAK_GROWTH_GROSS_SLICES,
  buildPeakGrowthDriversPie,
  peakGrowthGrossTotalMw,
} from "./peakGrowthDriversPie";
import { buildSectorSalesStackedBars } from "./sectorSalesStackedBar";

const HONESTY =
  "Same CEC charging shape and kWh per car, scaled linearly with fleet size. Not a forecast of where new EVs appear, when stock turns over, or how behavior and rates will change the shape. CAISO load already embeds some EV charging: at today's AFDC fleet the green band is a counterfactual profile, not extra MW on this day. Above today's count, green is incremental growth (N − N0) only.";

const PAGE_INTRO =
  "Scale California's plug-in fleet on a real CAISO day. Above today's stock, green is growth only, because historical load already includes some EVs.";

const MILES_PRIMARY_DISCLOSURE =
  "Assumes California's average miles driven per vehicle per day today, from federal highway data (statewide annual miles driven divided by number of vehicles, then by 365). When a gas car is swapped for an EV, this model keeps the same driving habits rather than changing how much someone drives.";

const MILES_SECONDARY_NOTE =
  "EV-specific studies disagree partly because today's EV owners are early adopters, not a stand-in for everyone. For high fleet shares, the statewide average is the better default.";

const FLEET_DISCLOSURE =
  "The slider scales today's CEC charging shape to a chosen share of CEC light-duty stock (~29.7M). Today (~6.7%) uses the AFDC EV count (~1.98M BEV+PHEV). Historical CAISO load already includes some of that charging, so today's overlay is not additive MW. Above today's count, the chart plots only the increment (N − N0). We keep shape and kWh per car fixed because this viewer does not invent where incremental charging lands (county, feeder, workplace vs home), when stock turns over, or how behavior and rates will reshape the day. Uniform scale is transparent stress arithmetic, not a forecast. ACC II's 35% / 68% / 100% figures (2026 / 2030 / 2035) are new-sales shares, not on-road fleet share, so fleet share lags.";

const LARGE_FLEET_STRAIN_CAVEAT =
  "Lowest-strain hours use one pass on this day's net load plus unmanaged EV at the chosen fleet (illustrative C7). Still not a forecast or a real utility program.";

const SHIFT_DISCLOSURE =
  "Moves charging toward hours when this day's net load (plus unmanaged EV at the chosen fleet) is lowest. That follows renewables instead of flattening total demand into a straight line. Net load is the strain signal this site uses.";

type Props = {
  rows: EvRow[];
  days: DayOption[];
  date: string;
  state: ShareState;
  onDateChange: (date: string) => void;
  onScenario: (scenario: Scenario) => void;
  onAdoption: (adoption: number) => void;
  onScale: (scale: number) => void;
  onParticipate: (participate: number) => void;
  pageGuide?: ReactNode;
};

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
      name: "EV unmanaged charging (ghost)",
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(31, 122, 76, 0.35)", width: 1.5, dash: "dot" },
      hovertemplate: "%{y:,.0f} MW<extra>Unmanaged charging (CEC)</extra>",
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
  const incremental = result.usesIncrementalOverlay;
  const evName =
    shiftPct > 0
      ? incremental
        ? `EV growth (${shiftPct}% lowest-strain shift)`
        : `EV counterfactual (${shiftPct}% lowest-strain shift)`
      : incremental
        ? "EV growth above today (AFDC N0)"
        : "EV (counterfactual profile; not incremental MW)";
  traces.push({
    x: times,
    y: result.evLoads,
    name: evName,
    type: "scatter",
    mode: "lines",
    fill: "tozeroy",
    line: { color: "#1f7a4c", width: 1.5 },
    fillcolor: "rgba(31, 122, 76, 0.35)",
    hovertemplate: incremental
      ? "%{y:,.0f} MW<extra>Signed growth (can be &lt;0 vs today mix)</extra>"
      : shiftPct > 0
        ? "%{y:,.0f} MW<extra>Counterfactual EV mix</extra>"
        : "%{y:,.0f} MW<extra>Counterfactual; not incremental MW</extra>",
  });
  traces.push({
    x: times,
    y: result.netPlusEv,
    name: incremental
      ? "Net load + EV growth"
      : "Net load + EV (counterfactual)",
    type: "scatter",
    mode: "lines",
    line: { color: "#5a3e6e", width: 2.5, dash: "dash" },
    hovertemplate: incremental
      ? "%{y:,.0f} MW<extra>Net + signed growth</extra>"
      : "%{y:,.0f} MW<extra>Net + counterfactual EV</extra>",
  });

  return traces;
}

export default function AdoptionPanel({
  rows,
  days,
  date,
  state,
  onDateChange,
  onScenario,
  onAdoption,
  onScale,
  onParticipate,
  pageGuide,
}: Props) {
  const [searchParams] = useSearchParams();
  const qs = shareSearchString(searchParams);
  const ldvOk = hasLdvTotal();
  const todayShare = todayAdoptionShare();
  const miles = PROVENANCE.milesPerDay;
  const fleetPct = Math.round(state.adoption * 1000) / 10;
  const todayPct =
    todayShare != null ? Math.round(todayShare * 1000) / 10 : null;
  const fullStockAsMultipleOfToday =
    N_LDV != null && N0 > 0 ? Math.round((N_LDV / N0) * 100) / 100 : null;

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
      legendPlacement: "bottom",
      margin: { t: 24, r: 24, b: 140, l: 60 },
    });
    const withShapes = buildLayout([], false, rampAnn ? [rampAnn] : []);
    return {
      data,
      layout: {
        ...base,
        shapes: withShapes.shapes,
        annotations: withShapes.annotations,
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

  const iepr = PROVENANCE.ieprDemandForecast;
  const matchedPeak = iepr.matchedPeakGrowth2025To2045;
  const matchedLevels = iepr.matchedPeakLevels2025Vs2045;
  const dcPeakChart = useMemo(() => {
    const labels = [
      "EV 2025",
      "EV 2045",
      "Data center 2025",
      "Data center 2045",
    ];
    const values = [
      matchedLevels.ev2025Mw,
      matchedLevels.ev2045Mw,
      matchedLevels.dataCenters2025Mw,
      matchedLevels.dataCenters2045Mw,
    ];
    return {
      data: [
        {
          type: "bar" as const,
          x: labels,
          y: values,
          marker: {
            color: ["#1f7a4c", "#1f7a4c", "#3a4a58", "#3a4a58"],
          },
          hovertemplate: "%{y:,.0f} MW<extra>%{x}</extra>",
          text: values.map((v) => `${v.toLocaleString()} MW`),
          textposition: "inside" as const,
          insidetextanchor: "end" as const,
          textfont: { size: 12, color: "#f7f5f1" },
          cliponaxis: false,
        },
      ] as Data[],
      layout: {
        ...buildLayout([], false, []),
        margin: { t: 12, r: 12, b: 48, l: 56 },
        yaxis: {
          title: { text: "MW (at coincident system peak)" },
          rangemode: "tozero" as const,
          automargin: true,
        },
        xaxis: {
          title: { text: "" },
          automargin: true,
        },
        showlegend: false,
      },
    };
  }, [matchedLevels]);

  const peakDriversPie = useMemo(() => buildPeakGrowthDriversPie(), []);
  const peakGrossTotalMw = peakGrowthGrossTotalMw();
  const sectorSalesBars = useMemo(() => buildSectorSalesStackedBars(), []);
  const sectorSales = iepr.managedSalesBySector2025Vs2045;

  const rampHint =
    resultUnmanaged.ramp && result.ramp
      ? `Evening ramp goes from ${Math.round(resultUnmanaged.ramp.mwPerHour).toLocaleString()} to ${Math.round(result.ramp.mwPerHour).toLocaleString()} MW/h on this day${
          result.rampRelief > 0
            ? ` (eases ${Math.round(result.rampRelief).toLocaleString()} in this model)`
            : ""
        }.`
      : null;

  return (
    <section className="adoption-panel" aria-label="Fleet and charging on a CAISO day">
      <p className="page-intro-line">{PAGE_INTRO}</p>

      <section
        className="chart-block chart-panel-tall"
        aria-label="Net load plus EV"
      >
        <h2 className="chart-block-title">Net load + EV charging</h2>
        <AnimatedPlot
          key={date}
          data={chart.data}
          layout={chart.layout}
          style={{ width: "100%", height: "480px" }}
        />
        <div className="chart-block-body">
          <p className="chart-caption">
            CAISO <DefinedTerm id="netLoad" /> for this day. Midday dip is
            solar; the steep evening rise is the ramp. Green is{" "}
            {result.usesIncrementalOverlay
              ? "EV charging growth above today's AFDC fleet (signed incremental; Σ = E(N) − E(N0))"
              : "EV charging (counterfactual profile; not incremental MW; load already embeds some EVs)"}
            .
          </p>
          <p className="chart-sources">
            {HONESTY} <Link to={`/methods${qs}`}>Methods</Link>
          </p>
        </div>
      </section>

      <section
        className="controls controls-adoption"
        aria-label="Fleet controls"
      >
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

        <label className="field chip-field-span">
          <span className="legend-with-hint">
            <span>
              % of CA light-duty fleet that is electric ({fleetPct}%)
            </span>
            <WhyHint label="Explain fleet share" summaryText="Explain">
              <p>
                {FLEET_DISCLOSURE} <Cite id={["afdc", "ldv", "accIi"]} />
              </p>
              <p>{LARGE_FLEET_STRAIN_CAVEAT}</p>
            </WhyHint>
          </span>
          <div className="range-with-mark">
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={fleetPct}
              disabled={!ldvOk}
              aria-valuetext={`${fleetPct}% of light-duty stock`}
              onChange={(event) =>
                onAdoption(Number(event.target.value) / 100)
              }
            />
            {todayPct != null ? (
              <span
                className="range-mark"
                style={{ ["--mark-pct" as string]: todayPct }}
                title={`Today ≈ ${todayPct}%`}
                aria-hidden="true"
              />
            ) : null}
          </div>
          <span className="field-hint">
            {ldvOk && N_LDV != null ? (
              <>
                ~
                {Math.round(state.adoption * N_LDV).toLocaleString()} vehicles
                {todayPct != null
                  ? ` · today mark ≈ ${todayPct}%`
                  : null}
              </>
            ) : (
              "verify CEC light-duty vehicle total"
            )}
          </span>
        </label>

        {!ldvOk && (
          <p className="field-hint adoption-warn">
            verify CEC light-duty vehicle total
          </p>
        )}

        <label className="field chip-field-span">
          <span className="legend-with-hint">
            <span>
              Shift to <DefinedTerm id="lowestStrain" /> (
              {Math.round(state.participate * 100)}%)
            </span>
            <WhyHint label="Why lowest-strain hours" summaryText="Explain">
              <p>{SHIFT_DISCLOSURE}</p>
              <p>
                Same daily kWh; hours weighted toward this day&apos;s lowest{" "}
                <DefinedTerm id="caiso" /> <DefinedTerm id="netLoad" />.
                {rampHint ? ` ${rampHint}` : ""}
              </p>
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
        </label>

        <details className="field advanced-fleet chip-field-span">
          <summary>Advanced</summary>
          <label className="field">
            <span>× today&apos;s AFDC EV count</span>
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
              1× = {N0.toLocaleString()} BEV+PHEV (AFDC).
              {fullStockAsMultipleOfToday != null
                ? ` ${fullStockAsMultipleOfToday}× = 100% of CEC light-duty stock (same as the fleet % slider at 100%).`
                : null}
            </span>
          </label>
          <div className="field chip-field">
            <span className="legend-with-hint">
              <span>Miles/day</span>
              <WhyHint label="Why this miles assumption" summaryText="Explain">
                <p>
                  Default is {miles.primaryMiles} mi/day, California&apos;s
                  average from federal highway data.{" "}
                  <Cite id="milesPerDay" />
                </p>
                <p>{MILES_PRIMARY_DISCLOSURE}</p>
                <p>{MILES_SECONDARY_NOTE}</p>
              </WhyHint>
            </span>
            <p className="field-hint">
              Default {miles.primaryMiles} mi (CA avg). Other values are
              secondary only.
            </p>
            <div
              className="adoption-chart-chips"
              role="group"
              aria-label="Miles per day"
            >
              <button
                type="button"
                className={
                  state.scenario === "mid"
                    ? "shift-preset chip-active"
                    : "shift-preset"
                }
                aria-pressed={state.scenario === "mid"}
                onClick={() => onScenario("mid")}
                title={`${miles.primaryMiles} mi (CA avg)`}
              >
                {miles.primaryMiles} (default)
              </button>
              <button
                type="button"
                className={
                  state.scenario === "low"
                    ? "shift-preset chip-active"
                    : "shift-preset"
                }
                aria-pressed={state.scenario === "low"}
                onClick={() => onScenario("low")}
                title={SCENARIO_META.low.note}
              >
                {SCENARIO_META.low.miles}
              </button>
              <button
                type="button"
                className={
                  state.scenario === "high"
                    ? "shift-preset chip-active"
                    : "shift-preset"
                }
                aria-pressed={state.scenario === "high"}
                onClick={() => onScenario("high")}
                title={SCENARIO_META.high.note}
              >
                {SCENARIO_META.high.miles}
              </button>
            </div>
          </div>
        </details>
      </section>

      <aside
        className="callout callout-honesty battery-compare"
        aria-label="Battery needed to flatten net load"
      >
        <p className="chart-caption">
          Rough battery size to smooth this day&apos;s{" "}
          <DefinedTerm id="netLoad" /> with today&apos;s charging pattern versus
          with more charging shifted to <DefinedTerm id="lowestStrain" />.
        </p>
        {batteryCompare.todayPattern && batteryCompare.optimizedShift ? (
          <div className="bridge-split">
            <div className="bridge-block">
              <p className="cost-sublabel">Today&apos;s charging (unmanaged)</p>
              <p className="bridge-value">
                {formatGw(batteryCompare.todayPattern.powerMw)} ·{" "}
                {formatGwh(batteryCompare.todayPattern.usableEnergyMwh)}
              </p>
              <p className="bridge-detail">
                ~{batteryCompare.todayPattern.durationHours.toFixed(1)} h
                lossless E ÷ power
              </p>
            </div>
            <div className="bridge-block">
              <p className="cost-sublabel">With optimized shift</p>
              <p className="bridge-value">
                {formatGw(batteryCompare.optimizedShift.powerMw)} ·{" "}
                {formatGwh(batteryCompare.optimizedShift.usableEnergyMwh)}
              </p>
              <p className="bridge-detail">
                ~{batteryCompare.optimizedShift.durationHours.toFixed(1)} h
                lossless E ÷ power
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
          Rough lossless flatten on net + chart EV · η=90% nameplate uplift is
          separate on Storage · not a procurement study ·{" "}
          <Link to={`/methods${qs}`}>Methods</Link>
        </p>
      </aside>

      <div className="adoption-key-stats" aria-label="Key numbers">
        <p>
          <strong>
            {result.usesIncrementalOverlay
              ? "Peak EV growth"
              : "Peak EV (counterfactual; not incremental MW)"}
          </strong>{" "}
          {formatMw(result.peakEvMw)}
          {result.usesIncrementalOverlay ? (
            <>
              {" "}
              <span className="muted-inline">
                (full fleet peak {formatMw(result.peakEvTotalMw)})
              </span>
            </>
          ) : null}
          {" · "}
          <strong>Ramp relief</strong>{" "}
          {Math.round(result.rampRelief).toLocaleString()} MW/h vs unmanaged
          charging
        </p>
      </div>

      <section
        className="chart-block chart-block-compact"
        aria-label="CEC forecast EV versus data center peak contribution, 2025 and 2045"
      >
        <h2 className="chart-block-title">
          EV vs data center peak contribution, 2025 vs 2045
        </h2>
        <AnimatedPlot
          data={dcPeakChart.data}
          layout={dcPeakChart.layout}
          style={{ width: "100%", height: "280px" }}
        />
        <div className="chart-block-body chart-block-body-tight">
          <p className="chart-caption">
            CEC Planning forecast at CAISO coincident system peak: EV{" "}
            {matchedLevels.ev2025Mw.toLocaleString()} MW (2025) to{" "}
            {matchedLevels.ev2045Mw.toLocaleString()} MW (2045); data centers{" "}
            {matchedLevels.dataCenters2025Mw.toLocaleString()} MW to{" "}
            {matchedLevels.dataCenters2045Mw.toLocaleString()} MW. Implied
            growth +{matchedLevels.growthEvMw.toLocaleString()} MW (EV) and +
            {matchedLevels.growthDataCentersMw.toLocaleString()} MW (data
            centers).
          </p>
          <p className="chart-caption">
            Item 6 slide 10 lists EV growth as +
            {matchedPeak.evMw.toLocaleString()} MW (
            {Math.abs(
              matchedLevels.growthEvMw - matchedPeak.evMw,
            ).toLocaleString()}{" "}
            MW difference vs levels) and data centers as +
            {matchedPeak.dataCentersMw.toLocaleString()} MW (matches). Peak hour
            differs by year (2025: {matchedLevels.peakHour2025Note}; 2045:{" "}
            {matchedLevels.peakHour2045Note}) because each year&apos;s
            coincident peak uses that year&apos;s highest-demand hour. Net peak
            growth across all drivers on that slide is{" "}
            {matchedPeak.netGrowthMw.toLocaleString()} MW.
          </p>
          <p className="chart-sources">
            {matchedLevels.chartCite}
            <Cite id="ieprDemandForecast" />
          </p>
        </div>
      </section>

      <section
        className="chart-block"
        aria-label="CEC gross peak load growth drivers pie"
      >
        <h2 className="chart-block-title">
          What&apos;s driving California peak growth, 2025-2045
        </h2>
        <div className="chart-block-split chart-block-split-pie">
          <div className="chart-block-plot chart-block-plot-pie">
            <AnimatedPlot
              data={peakDriversPie.data}
              layout={peakDriversPie.layout}
              style={{ width: "100%", height: "26rem" }}
              className="pie-fill-plot"
            />
          </div>
          <aside className="chart-block-aside">
            <p className="chart-caption">
              Gross increases only from CEC Item 6 slide 10 (five drivers,{" "}
              {peakGrossTotalMw.toLocaleString()} MW). Offsets are listed
              below, not as pie slices, so this is not the full net picture. EV
              charging is the largest gross slice.
            </p>
            <ul className="chart-block-drivers">
              {PEAK_GROWTH_GROSS_SLICES.map((s) => (
                <li key={s.key}>
                  <span
                    className="chart-block-swatch"
                    style={{ background: s.color }}
                    aria-hidden
                  />
                  <span>
                    {s.label}: +{s.mw.toLocaleString()} MW
                  </span>
                </li>
              ))}
            </ul>
            <div
              className="callout callout-honesty"
              aria-label="Offsetting peak growth reductions"
            >
              <p>
                Offset by {matchedPeak.reductionsTotalMw.toLocaleString()} MW
                from energy efficiency (-
                {matchedPeak.reductionsMw.energyEfficiency.toLocaleString()}),
                behind-the-meter storage (-
                {matchedPeak.reductionsMw.btmStorage.toLocaleString()}), and
                behind-the-meter solar (-
                {matchedPeak.reductionsMw.btmSolar.toLocaleString()}), netting
                to {matchedPeak.netGrowthMw.toLocaleString()} MW.
              </p>
            </div>
            <p className="chart-sources">
              {matchedPeak.chartCite}
              <Cite id="ieprDemandForecast" />
            </p>
          </aside>
        </div>
      </section>

      <section
        className="chart-block"
        aria-label="CEC planning electricity sales by sector, 2025 versus 2045"
      >
        <h2 className="chart-block-title">
          Electricity sales by sector, 2025 vs 2045
        </h2>
        <AnimatedPlot
          data={sectorSalesBars.data}
          layout={sectorSalesBars.layout}
          style={{ width: "100%", height: "400px" }}
        />
        <div className="chart-block-body">
          <p className="chart-caption">
            Statewide Planning electricity sales (
            {Math.round(sectorSales.byYear[2025].totalGwh).toLocaleString()} GWh
            in 2025 vs{" "}
            {Math.round(sectorSales.byYear[2045].totalGwh).toLocaleString()} GWh
            in 2045, about{" "}
            {Math.round(
              (sectorSales.byYear[2045].totalGwh /
                sectorSales.byYear[2025].totalGwh -
                1) *
                100,
            )}
            % higher). Bar height is total GWh. Large segments are labeled on
            the bars. TCU is Transportation, Communications, and Utilities;
            AGWP is Agriculture and Water Pumping (CEC sector codes). EV
            charging from AATE Scenario 2 is its own segment so it is not
            double-counted inside Commercial or Residential. Data centers are
            not separable here; their growth sits inside Commercial/Industrial
            baseline figures.
          </p>
          <p className="chart-sources">
            {sectorSales.chartCite}
            <Cite id="ieprDemandForecast" />
          </p>
        </div>
      </section>

      {pageGuide}
    </section>
  );
}

export { HONESTY as ADOPTION_HONESTY };
