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
import { buildLayout, buildRampAnnotation } from "./chartConfig";
import {
  buildShiftBridgeCallout,
  computeCostComparison,
  middayVsCecSavings,
} from "./insights";
import { PLOTLY_CONFIG } from "./plotlyConfig";
import { PROVENANCE } from "./provenance";
import {
  SCENARIOS,
  SHOW_SHIFT_PARTICIPATE,
  shareSearchString,
  type ShareState,
} from "./shareState";
import type { DayOption, EvRow, Scenario, TouRow } from "./types";
import { SCENARIO_META } from "./types";

const HONESTY =
  "Illustrative: same CEC shape and kWh per car. Not a forecast.";

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

  traces.push({
    x: times,
    y: result.evLoads,
    name: `EV (${Math.round(result.participate * 100)}% midday shift)`,
    type: "scatter",
    mode: "lines",
    fill: "tozeroy",
    line: { color: "#1f7a4c", width: 1.5 },
    fillcolor: "rgba(31, 122, 76, 0.35)",
    hovertemplate: "%{y:,.0f} MW<extra>EV shifted mix</extra>",
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

  const costs = useMemo(
    () =>
      touRows.length
        ? computeCostComparison(
            rows,
            state.scenario,
            date,
            touRows,
            state.cars,
          )
        : null,
    [rows, state.scenario, date, touRows, state.cars],
  );

  const shiftBridge = useMemo(() => {
    const savings = costs ? middayVsCecSavings(costs) : null;
    return buildShiftBridgeCallout({
      rampReliefMwPerHour: result.rampRelief,
      participate: state.participate,
      savingsYearlyPerCar: savings?.savingsYearlyPerCar ?? 0,
      savingsPlan: savings?.plan ?? state.plan,
    });
  }, [costs, result.rampRelief, state.participate, state.plan]);

  const chart = useMemo(() => {
    const data = buildAdoptionTraces(rows, result);
    const rampAnn = buildRampAnnotation(
      rows.map((r, i) => ({ ...r, net_load_MW: result.netPlusEv[i] })),
    );
    const base = buildLayout([], false, rampAnn ? [rampAnn] : []);
    return {
      data,
      layout: {
        ...base,
        title: {
          text: "Net load + EV charging",
          font: { size: 14 },
          x: 0,
          xanchor: "left" as const,
        },
        margin: { ...(base.margin ?? {}), t: 56 },
        xaxis: {
          ...base.xaxis,
          title: {
            text: "Hour (US/Pacific)",
            font: { size: 11 },
          },
        },
        yaxis: {
          ...base.yaxis,
          title: { text: "MW", font: { size: 11 } },
        },
      },
    };
  }, [rows, result]);

  const scaleValue = state.scale != null ? state.scale : result.scale;
  const customPct = Math.round(state.adoption * 1000) / 10;

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
        <h1>When EVs charge matters as much as how many there are</h1>
        <p className="lede">
          On a real CAISO day, the evening net-load climb is the hard window.
          This page scales California plug-in charging and shifts a share into
          midday to see how that changes coincidence with the ramp, and what
          simplified PG&E energy $/car look like. Fleet presets are stress
          arithmetic on today’s CEC shape, not forecasts of when the on-road
          fleet turns over.
        </p>
      </header>

      <section className="chart-panel" aria-label="Net load plus EV">
        <Plot
          data={chart.data}
          layout={{ ...chart.layout, autosize: true }}
          config={PLOTLY_CONFIG}
          style={{ width: "100%", height: "520px" }}
          useResizeHandler
        />
        <div className="chart-copy">
          <p className="chart-narrative">
            Change the controls below and the lines move. Try{" "}
            <strong>50% CA LDV</strong> to grow the green band, then{" "}
            <strong>50% midday shift</strong> to pull charging out of the
            evening. Solid lines are the shift mix; dotted lines (when shift is
            above zero) are unmanaged CEC at the same fleet.
          </p>
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
              50% LDV · 50% shift
            </button>
          </div>
          <p className="chart-sources">
            {HONESTY} <Link to={`/methods${qs}`}>Methods</Link>
          </p>
        </div>
      </section>

      <aside
        className="callout callout-honesty callout-share"
        aria-label="Shift charging bridge"
      >
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
          <legend>Fleet</legend>
          <label className={preset === "today" ? "active" : undefined}>
            <input
              type="radio"
              name="adoption-preset"
              checked={preset === "today"}
              onChange={() => onTodayFleet()}
            />
            Today (AFDC)
          </label>
          <label
            className={preset === "half" ? "active" : undefined}
            title={ldvOk ? undefined : "verify CEC LDV total"}
          >
            <input
              type="radio"
              name="adoption-preset"
              checked={preset === "half"}
              disabled={!ldvOk}
              onChange={() => onAdoption(0.5)}
            />
            50% CA LDV
          </label>
          <label
            className={preset === "full" ? "active" : undefined}
            title={ldvOk ? undefined : "verify CEC LDV total"}
          >
            <input
              type="radio"
              name="adoption-preset"
              checked={preset === "full"}
              disabled={!ldvOk}
              onChange={() => onAdoption(1)}
            />
            100% CA LDV
          </label>
          <label className={preset === "custom" ? "active" : undefined}>
            <input
              type="radio"
              name="adoption-preset"
              checked={preset === "custom"}
              disabled={!ldvOk}
              onChange={() => {
                if (preset !== "custom") onAdoption(state.adoption);
              }}
            />
            custom %
          </label>
          <p className="field-hint acc-ii-note">
            <a
              href={PROVENANCE.accIi.url}
              target="_blank"
              rel="noreferrer"
            >
              {PROVENANCE.accIi.name}
            </a>{" "}
            sets new light-duty ZEV sales shares (35% in 2026, 68% in 2030, 100%
            by 2035). That is sales share, not on-road fleet share; vehicles stay
            registered for years, so fleet share lags. The 50% / 100% LDV presets
            here are stress scenarios, not timeline predictions.
          </p>
        </fieldset>

        {!ldvOk && (
          <p className="field-hint adoption-warn">verify CEC LDV total</p>
        )}

        {ldvOk && (
          <label className="field">
            <span>Custom % of CA LDV</span>
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
                  Today ≈ {(todayShare * 100).toFixed(2)}% of CEC LDV (
                  {N_LDV?.toLocaleString()})
                </>
              )}
            </span>
          </label>
        )}

        <label className="field">
          <span>× today (AFDC)</span>
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
            1× = {N0.toLocaleString()} plug-ins (AFDC{" "}
            {PROVENANCE.population.year})
          </span>
        </label>

        <fieldset className="field scenario">
          <legend>Miles/day</legend>
          {SCENARIOS.map((item) => (
            <label
              key={item}
              className={state.scenario === item ? "active" : undefined}
            >
              <input
                type="radio"
                name="adoption-scenario"
                value={item}
                checked={state.scenario === item}
                onChange={() => onScenario(item)}
              />
              {SCENARIO_META[item].label} ({SCENARIO_META[item].miles} mi)
            </label>
          ))}
        </fieldset>

        <label className="field">
          <span>
            % of charging shifted to midday (
            {Math.round(state.participate * 100)}%)
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
            Share of daily energy on the midday shape.
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
            Show the shift ({Math.round(SHOW_SHIFT_PARTICIPATE * 100)}% midday)
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
        <Plot
          data={dcPeakChart.data}
          layout={{ ...dcPeakChart.layout, autosize: true }}
          config={PLOTLY_CONFIG}
          style={{ width: "100%", height: "320px" }}
          useResizeHandler
        />
        <div className="chart-copy">
          <p className="chart-narrative">
            CEC data-center figures are peak demand share of CAISO system peak,
            not annual energy and not a fuel-mix pie. The EV bar is this page’s
            scaled peak charging MW (stress arithmetic on today’s CEC shape),
            Weak as a fleet forecast.
          </p>
          <p className="chart-sources">
            <a
              href={PROVENANCE.dataCenters.url}
              target="_blank"
              rel="noreferrer"
            >
              {PROVENANCE.dataCenters.source}
            </a>
            {" · "}
            {PROVENANCE.dataCenters.forecast2040Label} · EV bar C6
          </p>
        </div>
      </section>

      {pageGuide}
    </section>
  );
}

export { HONESTY as ADOPTION_HONESTY };
