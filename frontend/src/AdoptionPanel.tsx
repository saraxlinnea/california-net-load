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
import type { DayOption, EvRow } from "./types";
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

const HONESTY =
  "Same CEC charging shape and kWh per car, scaled linearly with fleet size. Not a forecast of where new EVs appear, when stock turns over, or how behavior and rates will change the shape. Historical CAISO net already embeds some EV charging: the chart subtracts today's modeled CEC profile (AFDC fleet size), then adds back the full selected fleet as unmanaged or shifted so both lines carry the same daily charging energy.";

const PAGE_INTRO =
  "Scale California's plug-in fleet on a real CAISO day. Compare unmanaged CEC charging to the same energy shifted into lowest-strain hours.";

const LARGE_FLEET_STRAIN_CAVEAT =
  "Lowest-strain hours use one pass on EV-removed net plus unmanaged EV at the chosen fleet (illustrative C7). Still not a forecast or a real utility program.";

const SHIFT_DISCLOSURE =
  "Moves charging toward hours when EV-removed net plus unmanaged EV at the chosen fleet is lowest. That follows renewables instead of flattening total demand into a straight line. Net load is the strain signal this site uses.";
type Props = {
  rows: EvRow[];
  days: DayOption[];
  date: string;
  state: ShareState;
  onDateChange: (date: string) => void;
  onAdoption: (adoption: number) => void;
  onTodayFleet: () => void;
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
  const shiftPct = Math.round(result.participate * 100);
  const traces: Data[] = [];

  // Green: full-fleet EV charging (moves with the shift slider).
  if (shiftPct > 0) {
    traces.push({
      x: times,
      y: result.unmanagedEvLoads,
      name: "EV unmanaged charging",
      type: "scatter",
      mode: "lines",
      line: { color: "rgba(31, 122, 76, 0.4)", width: 1.5, dash: "dot" },
      hovertemplate: "%{y:,.0f} MW<extra>Unmanaged charging (CEC)</extra>",
    });
  }
  traces.push({
    x: times,
    y: result.evLoads,
    name:
      shiftPct > 0
        ? `EV charging (${shiftPct}% lowest-strain shift)`
        : "EV unmanaged charging",
    type: "scatter",
    mode: "lines",
    fill: "tozeroy",
    line: { color: "#1f7a4c", width: 1.5 },
    fillcolor: "rgba(31, 122, 76, 0.35)",
    hovertemplate:
      shiftPct > 0
        ? "%{y:,.0f} MW<extra>Shifted charging (same daily kWh)</extra>"
        : "%{y:,.0f} MW<extra>Unmanaged charging (CEC)</extra>",
  });

  // Two net lines: same fleet energy, unmanaged vs shifted timing.
  traces.push({
    x: times,
    y: result.netPlusUnmanaged,
    name: "Net load + unmanaged charging",
    type: "scatter",
    mode: "lines",
    line:
      shiftPct > 0
        ? { color: "rgba(90, 62, 110, 0.55)", width: 2, dash: "dot" }
        : { color: "#5a3e6e", width: 2.5 },
    hovertemplate: "%{y:,.0f} MW<extra>Net + unmanaged</extra>",
  });
  if (shiftPct > 0) {
    traces.push({
      x: times,
      y: result.netPlusEv,
      name: `Net load + shifted charging (${shiftPct}%)`,
      type: "scatter",
      mode: "lines",
      line: { color: "#5a3e6e", width: 2.5 },
      hovertemplate: "%{y:,.0f} MW<extra>Net + shifted</extra>",
    });
  }

  return traces;
}
export default function AdoptionPanel({
  rows,
  days,
  date,
  state,
  onDateChange,
  onAdoption,
  onTodayFleet,
  onParticipate,
  pageGuide,
}: Props) {
  const [searchParams] = useSearchParams();
  const qs = shareSearchString(searchParams);
  const ldvOk = hasLdvTotal();
  const todayShare = todayAdoptionShare();
  const todayPct =
    todayShare != null ? Math.round(todayShare * 1000) / 10 : null;
  const adoptionPct = Math.round(state.adoption * 1000) / 10;
  /** Slider 0.1% steps cannot express a_0 exactly; treat the today mark as AFDC N0. */
  const atTodayMark =
    state.scale === 1 || (todayPct != null && adoptionPct === todayPct);
  const fleetPct = atTodayMark && todayPct != null ? todayPct : adoptionPct;

  const fleetInput = useMemo(() => {
    if (state.scale != null) return { scale: state.scale };
    if (
      todayShare != null &&
      Math.round(state.adoption * 1000) / 10 ===
        Math.round(todayShare * 1000) / 10
    ) {
      return { scale: 1 };
    }
    return { adoption: state.adoption };
  }, [state.adoption, state.scale, todayShare]);

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
    const todayPattern = estimateStorageToFlatten(
      rowsWithNet(rows, resultUnmanaged.netPlusUnmanaged),
    );
    const optimizedShift = estimateStorageToFlatten(
      rowsWithNet(rows, result.netPlusEv),
    );
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
        aria-label="Unmanaged versus shifted charging"
      >
        <h2 className="chart-block-title">Unmanaged vs shifted charging</h2>
        <AnimatedPlot
          key={date}
          data={chart.data}
          layout={chart.layout}
          style={{ width: "100%", height: "480px" }}
        />
        <div className="chart-block-body">
          <p className="chart-caption">
            Same total charging energy for{" "}
            {Math.round(result.fleetN).toLocaleString()} vehicles, shown
            unmanaged (today&apos;s real charging pattern) versus shifted{" "}
            {Math.round(result.participate * 100)}% into the grid&apos;s
            lowest-strain hours. Shows how much the peak eases from timing
            alone, not from using less energy.
          </p>
          <p className="chart-sources">
            {HONESTY} <Link to={`/methods${qs}`}>Methods</Link>
          </p>
        </div>
      </section>

      <div className="controls-adoption-wrap">
        {days.length > 0 && (
          <label className="controls-day-tab">
            <span className="controls-day-tab-label">Day:</span>
            <select
              className="controls-day-tab-select"
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              aria-label="Day"
            >
              {days.map((day) => (
                <option key={day.date} value={day.date}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <section
          className="controls controls-adoption"
          aria-label="Fleet controls"
        >
        <label className="field chip-field-span">
          <span className="legend-with-hint">
            <span>
              % of CA light-duty fleet that is electric ({fleetPct}%)
            </span>
            <WhyHint label="Explain fleet share" summaryText="Explain">
              <p>
                <strong>Today (~6.7%).</strong> Uses the AFDC EV count (~1.98M
                BEV+PHEV) as a share of CEC light-duty stock (~29.7M).{" "}
                <Cite id={["afdc", "ldv"]} />
              </p>
              <p>
                <strong>Not a forecast.</strong> The slider scales today&apos;s
                CEC charging shape to a chosen share of that stock. Historical
                CAISO load already includes some of that charging, so the chart
                removes today&apos;s modeled EV profile first, then places the
                full selected fleet on that clean baseline. Shape and kWh per
                car stay fixed; this viewer does not invent where new charging
                lands, when stock turns over, or how behavior and rates will
                reshape the day. Uniform scale is transparent stress arithmetic.
              </p>
              <p>
                <strong>ACC II = sales, not stock.</strong> The 35% / 68% /
                100% figures (2026 / 2030 / 2035) are new-sales shares, not
                on-road fleet share, so fleet share lags.{" "}
                <Cite id="accIi" />
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
              onChange={(event) => {
                const pct = Number(event.target.value);
                if (todayPct != null && pct === todayPct) {
                  onTodayFleet();
                } else {
                  onAdoption(pct / 100);
                }
              }}
            />
            {todayPct != null ? (
              <span
                className="range-mark"
                style={{ ["--mark-pct" as string]: todayPct }}
                title={`Today ≈ ${todayPct}% · ${N0.toLocaleString()} BEV+PHEV (AFDC)`}
                aria-hidden="true"
              />
            ) : null}
          </div>
          <span className="field-hint">
            {ldvOk && N_LDV != null ? (
              <>
                ~
                {Math.round(result.fleetN).toLocaleString()} vehicles
                {todayPct != null
                  ? ` · today mark ≈ ${todayPct}% (${N0.toLocaleString()} AFDC)`
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

        <div className="controls-adoption-tools chip-field-span">
          <button
            type="button"
            className="reset-today-btn"
            onClick={onTodayFleet}
          >
            Reset to today
          </button>
        </div>
        </section>
      </div>

      <aside
        className="callout callout-honesty battery-compare"
        aria-label="Battery needed to flatten net load"
      >
        <p className="chart-caption">
          Same fleet as the chart above (
          {Math.round(result.fleetN).toLocaleString()} vehicles). Rough battery
          to flatten this day&apos;s <DefinedTerm id="netLoad" /> if charging
          stays unmanaged versus if{" "}
          {Math.round(result.participate * 100)}% shifts to{" "}
          <DefinedTerm id="lowestStrain" />.
        </p>
        {!batteryCompare.todayPattern || !batteryCompare.optimizedShift ? (
          <p className="bridge-detail">
            Not enough hours in the belly-to-evening window to size storage for
            this day.
          </p>
        ) : result.participate <= 0 ? (
          <p className="bridge-detail">
            Set a shift % above to see how much less storage this fleet would
            need with lowest-strain timing.
          </p>
        ) : (
          <div className="bridge-split">
            <div className="bridge-block">
              <p className="cost-sublabel">Unmanaged timing</p>
              <p className="bridge-value">
                {formatGw(batteryCompare.todayPattern.powerMw)} ·{" "}
                {formatGwh(batteryCompare.todayPattern.usableEnergyMwh)}
              </p>
              <p className="bridge-detail">
                {Math.round(result.fleetN).toLocaleString()} vehicles · same
                daily kWh · ~
                {batteryCompare.todayPattern.durationHours.toFixed(1)} h
                lossless E ÷ power
              </p>
            </div>
            <div className="bridge-block">
              <p className="cost-sublabel">
                Shifted timing ({Math.round(result.participate * 100)}%)
              </p>
              <p className="bridge-value">
                {formatGw(batteryCompare.optimizedShift.powerMw)} ·{" "}
                {formatGwh(batteryCompare.optimizedShift.usableEnergyMwh)}
              </p>
              <p className="bridge-detail">
                {Math.round(result.fleetN).toLocaleString()} vehicles · same
                daily kWh · ~
                {batteryCompare.optimizedShift.durationHours.toFixed(1)} h
                lossless E ÷ power
              </p>
            </div>
          </div>
        )}
        <p className="callout-claims">
          Rough lossless flatten on net + chart EV · η=90% nameplate uplift is
          separate on Storage · not a procurement study ·{" "}
          <Link to={`/methods${qs}`}>Methods</Link>
        </p>
      </aside>

      <div className="adoption-key-stats" aria-label="Key numbers">
        <p>
          <strong>Peak EV charging</strong> {formatMw(result.peakEvMw)}
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
          <p className="chart-caption">
            The header bubble uses this Planning-scenario ~42% framing. CEC&apos;s
            higher Local Reliability + Known Loads scenario can run higher
            (~61%) over the same period.
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

      {pageGuide}
    </section>
  );
}

export { HONESTY as ADOPTION_HONESTY };
