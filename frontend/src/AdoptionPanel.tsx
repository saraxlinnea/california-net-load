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
import { type ClaimId, claimTitle } from "./claims";
import {
  END_USE_NOTE,
  GENERATION_PIE_CAVEAT,
  buildGenerationPieLayout,
  buildGenerationPieTraces,
  dayFuelGenerationMwh,
} from "./generationPie";
import {
  bestPlanSavings,
  buildShiftBridgeCallout,
  computeCostComparison,
} from "./insights";
import { CHARGING_MODE_LABELS } from "./managedCharging";
import { PLOTLY_CONFIG } from "./plotlyConfig";
import { PROVENANCE, SOURCE_FOOTER } from "./provenance";
import {
  MODES,
  SCENARIOS,
  SHOW_SHIFT_PARTICIPATE,
  shareSearchString,
  type ShareState,
} from "./shareState";
import {
  estimateStorageToFlatten,
  formatGw,
  formatGwh,
} from "./storageSizing";
import type { ChargingMode } from "./managedCharging";
import type { FuelMixRow } from "./fuelTypes";
import type { EvRow, Scenario, TouRow } from "./types";
import { SCENARIO_META } from "./types";

function ClaimMark({ id }: { id: ClaimId }) {
  return (
    <span className="claim-mark" title={claimTitle(id)}>
      {id}
    </span>
  );
}

const HONESTY =
  "Illustrative scale-up: same CEC hourly shape and same kWh per car as today. Does not model new chargers, distribution limits, behavior change, or V2G. Not a resource-adequacy study. One CAISO day only.";

const BESS_EQUIV_CAVEAT =
  "Illustrative EV vs BESS equivalence: not a resource-adequacy or procurement study. Ramp-relief power proxy uses ΔR × ramp hours; peak cut is max net+EV difference vs unmanaged.";

type Props = {
  rows: EvRow[];
  fuelRows: FuelMixRow[] | null;
  touRows: TouRow[];
  date: string;
  state: ShareState;
  onScenario: (scenario: Scenario) => void;
  onMode: (mode: ChargingMode) => void;
  onAdoption: (adoption: number) => void;
  onScale: (scale: number) => void;
  onParticipate: (participate: number) => void;
  onTodayFleet: () => void;
  /** Compact links shown after the primary chart */
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

function formatMwh(n: number): string {
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(1)} GWh`;
  return `${Math.round(n).toLocaleString()} MWh`;
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
    name: `EV scaled (${Math.round(result.participate * 100)}% shifted)`,
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
  fuelRows,
  touRows,
  date,
  state,
  onScenario,
  onMode,
  onAdoption,
  onScale,
  onParticipate,
  onTodayFleet,
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
    const savings = costs ? bestPlanSavings(costs) : null;
    return buildShiftBridgeCallout({
      rampUnmanagedMwPerHour: resultUnmanaged.ramp?.mwPerHour ?? null,
      rampAtParticipateMwPerHour: result.ramp?.mwPerHour ?? null,
      rampReliefMwPerHour: result.rampRelief,
      participate: state.participate,
      savingsYearlyPerCar: savings?.savingsYearlyPerCar ?? 0,
      savingsPlan: savings?.plan ?? state.plan,
      savingsAltLabel: savings?.altLabel ?? "a cheaper schedule",
    });
  }, [costs, result, resultUnmanaged, state.participate, state.plan]);

  const chart = useMemo(() => {
    const data = buildAdoptionTraces(rows, result);
    const rampAnn = buildRampAnnotation(
      rows.map((r, i) => ({ ...r, net_load_MW: result.netPlusEv[i] })),
    );
    return {
      data,
      layout: buildLayout([], false, rampAnn ? [rampAnn] : []),
    };
  }, [rows, result]);

  const fuelShares = useMemo(
    () => (fuelRows?.length ? dayFuelGenerationMwh(fuelRows) : []),
    [fuelRows],
  );

  const pieChart = useMemo(() => {
    if (!fuelShares.length) return null;
    return {
      data: buildGenerationPieTraces(fuelShares),
      layout: buildGenerationPieLayout(date),
    };
  }, [fuelShares, date]);

  const bessFlat = useMemo(() => estimateStorageToFlatten(rows), [rows]);

  const bessEquiv = useMemo(() => {
    const deltaR = result.rampRelief;
    const hours = result.rampAtP0?.hours ?? result.ramp?.hours ?? 0;
    const pEquiv = hours > 0 ? deltaR * hours : 0;
    const deltaPeak =
      resultUnmanaged.peakNetPlusEv - result.peakNetPlusEv;
    const middaySet = new Set([10, 11, 12, 13, 14, 15]);
    let eShifted = 0;
    for (let i = 0; i < rows.length; i++) {
      if (!middaySet.has(rows[i].hour)) continue;
      eShifted += Math.max(
        result.evLoads[i] - resultUnmanaged.evLoads[i],
        0,
      );
    }
    return { deltaR, pEquiv, deltaPeak, eShifted, hours };
  }, [result, resultUnmanaged, rows]);

  const evShapeChart = useMemo(() => {
    const times = rows.map((r) => r.Time);
    const data: Data[] = [
      {
        x: times,
        y: result.unmanagedEvLoads,
        name: "Unmanaged CEC",
        type: "scatter",
        mode: "lines",
        line: { color: "rgba(31, 122, 76, 0.55)", width: 2, dash: "dot" },
        hovertemplate: "%{y:,.0f} MW<extra>Unmanaged CEC</extra>",
      },
      {
        x: times,
        y: result.evLoads,
        name: `Shifted mix (${Math.round(result.participate * 100)}% midday)`,
        type: "scatter",
        mode: "lines",
        line: { color: "#1f7a4c", width: 2.5 },
        hovertemplate: "%{y:,.0f} MW<extra>Shifted mix</extra>",
      },
    ];
    return {
      data,
      layout: {
        ...buildLayout([], false, []),
        title: {
          text: "EV load shape · unmanaged vs shifted",
          font: { size: 13 },
          x: 0,
          xanchor: "left" as const,
        },
        margin: { l: 60, r: 24, t: 48, b: 48 },
        legend: { orientation: "h" as const, y: 1.12 },
      },
    };
  }, [rows, result]);

  const rampBarChart = useMemo(() => {
    const r0 = resultUnmanaged.ramp?.mwPerHour ?? 0;
    const rp = result.ramp?.mwPerHour ?? 0;
    return {
      data: [
        {
          type: "bar" as const,
          x: [
            "0% shifted (unmanaged)",
            `${Math.round(result.participate * 100)}% shifted`,
          ],
          y: [r0, rp],
          marker: { color: ["#8a6d3b", "#3a4a58"] },
          hovertemplate: "%{y:,.0f} MW/h<extra></extra>",
        },
      ] as Data[],
      layout: {
        title: {
          text: "Evening ramp · MW/h",
          font: { size: 13 },
          x: 0,
          xanchor: "left" as const,
        },
        margin: { l: 56, r: 24, t: 48, b: 56 },
        yaxis: { title: "MW/h", gridcolor: "rgba(26,29,33,0.08)" },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        showlegend: false,
      },
    };
  }, [result, resultUnmanaged]);

  const scaleLadder = useMemo(() => {
    const today = computeAdoptionStress(rows, state.scenario, {
      scale: 1,
      participate: state.participate,
    });
    const half = hasLdvTotal()
      ? computeAdoptionStress(rows, state.scenario, {
          adoption: 0.5,
          participate: state.participate,
        })
      : null;
    const full = hasLdvTotal()
      ? computeAdoptionStress(rows, state.scenario, {
          adoption: 1,
          participate: state.participate,
        })
      : null;
    const labels = ["Today (AFDC)"];
    const peakEv = [today.peakEvMw];
    const pctEnergy = [today.pctOfCaisoEnergy];
    if (half) {
      labels.push("50% CA LDV");
      peakEv.push(half.peakEvMw);
      pctEnergy.push(half.pctOfCaisoEnergy);
    }
    if (full) {
      labels.push("100% CA LDV");
      peakEv.push(full.peakEvMw);
      pctEnergy.push(full.pctOfCaisoEnergy);
    }
    return {
      data: [
        {
          type: "bar" as const,
          name: "Peak EV (MW)",
          x: labels,
          y: peakEv,
          marker: { color: "#1f7a4c" },
          hovertemplate: "%{y:,.0f} MW<extra>Peak EV</extra>",
        },
        {
          type: "bar" as const,
          name: "% of day CAISO energy",
          x: labels,
          y: pctEnergy,
          yaxis: "y2",
          marker: { color: "#3a4a58" },
          hovertemplate: "%{y:.1f}%<extra>% of day energy</extra>",
        },
      ] as Data[],
      layout: {
        barmode: "group" as const,
        title: {
          text: "Scale ladder · same day and miles scenario",
          font: { size: 13 },
          x: 0,
          xanchor: "left" as const,
        },
        margin: { l: 56, r: 56, t: 48, b: 56 },
        yaxis: { title: "Peak EV (MW)", gridcolor: "rgba(26,29,33,0.08)" },
        yaxis2: {
          title: "% of day energy",
          overlaying: "y" as const,
          side: "right" as const,
          showgrid: false,
        },
        legend: { orientation: "h" as const, y: 1.14 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
      },
    };
  }, [rows, state.scenario, state.participate]);

  const dc = PROVENANCE.dataCenters;
  const peakEvVsDc =
    dc.peakMwApprox > 0 ? result.peakEvMw / dc.peakMwApprox : null;

  const scaleValue =
    state.scale != null
      ? state.scale
      : result.scale;


  const customPct = Math.round(state.adoption * 1000) / 10;

  return (
    <section className="adoption-panel" aria-label="Adoption stress test">
      <aside
        className="callout callout-honesty callout-share"
        aria-label="Shift charging bridge"
      >
        <p className="callout-headline">{shiftBridge.headline}</p>
        <p>
          {shiftBridge.detail}{" "}
          <Link to={`/charge${qs}`}>See PG&E $/car on Cost</Link>.
        </p>
      </aside>

      <section className="controls" aria-label="Adoption controls">
        <fieldset className="field scenario">
          <legend>Fleet preset</legend>
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
            1× = {N0.toLocaleString()} plug-ins (AFDC {PROVENANCE.population.year})
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

        <fieldset className="field scenario">
          <legend>Charging schedule</legend>
          {MODES.map((mode) => (
            <label
              key={mode}
              className={state.mode === mode ? "active" : undefined}
            >
              <input
                type="radio"
                name="adoption-charging"
                checked={state.mode === mode}
                onChange={() => onMode(mode)}
              />
              {CHARGING_MODE_LABELS[mode]}
            </label>
          ))}
          <span className="field-hint">
            Shift share mixes CEC toward midday solar DR (MATH §3b). Schedule is
            kept in the share URL for Cost and other pages.
          </span>
        </fieldset>

        <label className="field">
          <span>
            Share of charging shifted to midday (
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
            Illustrative: share of daily energy on the midday managed shape.
            {resultUnmanaged.ramp && result.ramp ? (
              <>
                {" "}
                Evening ramp:{" "}
                {Math.round(resultUnmanaged.ramp.mwPerHour).toLocaleString()}{" "}
                MW/h at 0% shifted →{" "}
                {Math.round(result.ramp.mwPerHour).toLocaleString()} MW/h at{" "}
                {Math.round(state.participate * 100)}%
                {result.rampRelief > 0
                  ? ` (relief ${Math.round(result.rampRelief).toLocaleString()} MW/h)`
                  : ""}
                .
              </>
            ) : null}
          </span>
          <button
            type="button"
            className="shift-preset"
            onClick={() => {
              onParticipate(SHOW_SHIFT_PARTICIPATE);
              onMode("managed");
            }}
          >
            Show the shift ({Math.round(SHOW_SHIFT_PARTICIPATE * 100)}% midday)
          </button>
        </label>
      </section>

      <div className="storage-grid adoption-metrics">
        <div className="storage-card">
          <p className="cost-sublabel">
            Peak EV <ClaimMark id="C6" />
          </p>
          <p className="cost-big">
            {formatMw(result.peakEvMw)}
            <span>scaled fleet peak · stress arithmetic</span>
          </p>
        </div>
        <div className="storage-card">
          <p className="cost-sublabel">
            % of this day’s CAISO energy <ClaimMark id="C6" />
          </p>
          <p className="cost-big">
            {result.pctOfCaisoEnergy.toFixed(1)}%
            <span>
              {formatMwh(result.evEnergyMwh)} EV /{" "}
              {formatMwh(result.caisoEnergyMwh)} load
            </span>
          </p>
        </div>
        <div className="storage-card">
          <p className="cost-sublabel">
            Peak net + EV <ClaimMark id="C6" />
          </p>
          <p className="cost-big">
            {formatMw(result.peakNetPlusEv)}
            <span>max of net load + scaled EV</span>
          </p>
        </div>
        <div className="storage-card">
          <p className="cost-sublabel">
            Evening ramp <ClaimMark id="C1" />
          </p>
          <p className="cost-big">
            {result.ramp
              ? `${Math.round(result.ramp.mwPerHour).toLocaleString()} MW/h`
              : "n/a"}
            <span>
              {result.ramp
                ? `${result.ramp.startLabel} to ${result.ramp.endLabel}`
                : "unavailable"}
            </span>
          </p>
        </div>
        <div className="storage-card">
          <p className="cost-sublabel">
            Ramp relief <ClaimMark id="C7" />
          </p>
          <p className="cost-big">
            {Math.round(result.rampRelief).toLocaleString()} MW/h
            <span>illustrative vs unmanaged (0% shifted)</span>
          </p>
        </div>
        <div className="storage-card">
          <p className="cost-sublabel">
            Fleet N <ClaimMark id="C3" /> <ClaimMark id="C4" />
          </p>
          <p className="cost-big">
            {Math.round(result.fleetN).toLocaleString()}
            <span>
              {Number.isFinite(result.adoption)
                ? `${(result.adoption * 100).toFixed(2)}% LDV · `
                : ""}
              {result.scale.toFixed(2)}× today
            </span>
          </p>
        </div>
      </div>

      <aside className="callout adoption-ev-share" aria-live="polite">
        <p>
          Modeled EV charging is{" "}
          <strong>{result.pctOfCaisoEnergy.toFixed(1)}%</strong> of this day’s
          CAISO load energy ({formatMwh(result.evEnergyMwh)} of{" "}
          {formatMwh(result.caisoEnergyMwh)}).{" "}
          <ClaimMark id="C6" /> Stress arithmetic on one day; Weak as a fleet
          forecast.
        </p>
      </aside>

      <section className="chart-panel">
        <Plot
          data={chart.data}
          layout={{ ...chart.layout, autosize: true }}
          config={PLOTLY_CONFIG}
          style={{ width: "100%", height: "520px" }}
          useResizeHandler
        />
        <div className="chart-copy">
          <p className="chart-narrative">
            Net load for {date} with EV charging scaled to{" "}
            {Math.round(result.fleetN).toLocaleString()} plug-ins (
            {result.scale.toFixed(2)}× AFDC today). When any share is shifted to
            midday, the dotted series shows fully unmanaged CEC at the same
            fleet size.
          </p>
          <p className="chart-sources">{SOURCE_FOOTER}</p>
          <p className="chart-sources">{HONESTY}</p>
        </div>
      </section>

      {pageGuide}

      <div className="adoption-secondary-charts">
        <section
          className="chart-panel"
          aria-label="EV load shape unmanaged versus shifted"
        >
          <Plot
            data={evShapeChart.data}
            layout={{ ...evShapeChart.layout, autosize: true }}
            config={PLOTLY_CONFIG}
            style={{ width: "100%", height: "360px" }}
            useResizeHandler
          />
          <div className="chart-copy">
            <p className="chart-narrative">
              How to read this: same fleet, day, and miles scenario. Dotted line
              is fully unmanaged CEC; solid line is the shifted mix
              ((1−p)·CEC + p·midday) from the midday-shift slider.
            </p>
            <p className="chart-sources">
              <ClaimMark id="C7" /> Illustrative midday shape when p &gt; 0; not
              a real utility DR program.
            </p>
          </div>
        </section>

        <section
          className="chart-panel"
          aria-label="Evening ramp comparison"
        >
          <Plot
            data={rampBarChart.data}
            layout={{ ...rampBarChart.layout, autosize: true }}
            config={PLOTLY_CONFIG}
            style={{ width: "100%", height: "360px" }}
            useResizeHandler
          />
          <div className="chart-copy">
            <p className="chart-narrative">
              How to read this: average evening climb (MW/h) on net load + EV
              from midday belly to evening peak, at 0% shifted versus the
              current midday-shift share.
            </p>
            <p className="chart-sources">
              <ClaimMark id="C7" /> Weak / Speculative · illustrative ramp
              relief only.
            </p>
          </div>
        </section>

        <section
          className="chart-panel adoption-ladder-panel"
          aria-label="Adoption scale ladder"
        >
          <Plot
            data={scaleLadder.data}
            layout={{ ...scaleLadder.layout, autosize: true }}
            config={PLOTLY_CONFIG}
            style={{ width: "100%", height: "360px" }}
            useResizeHandler
          />
          <div className="chart-copy">
            <p className="chart-narrative">
              How to read this: peak EV MW (left) and EV share of this day’s
              CAISO load energy (right) at Today, 50% CA LDV, and 100% CA LDV,
              holding day, miles scenario, and participation fixed.
            </p>
            <p className="chart-sources">
              <ClaimMark id="C6" /> Strong as stress arithmetic on one day;
              Weak as a fleet forecast.
            </p>
          </div>
        </section>
      </div>

      {peakEvVsDc != null && (
        <aside
          className="callout adoption-dc-callout"
          aria-label="Scaled EV peak versus CEC data-center peak share"
        >
          <p>
            At this fleet, modeled peak EV is {formatMw(result.peakEvMw)}
            {peakEvVsDc >= 0.01
              ? ` (about ${peakEvVsDc.toFixed(1)}× the CEC ~${dc.peakMwApprox.toLocaleString()} MW data-center peak figure)`
              : ""}
            . CEC cites about {dc.peakMwApprox.toLocaleString()} MW, or about{" "}
            {(dc.peakShareOfCaisoApprox * 100).toFixed(0)}% of CAISO system peak
            ({dc.asOf};{" "}
            <a href={dc.url} target="_blank" rel="noreferrer">
              source
            </a>
            ). That is a peak demand share of system peak, not annual end-use
            energy and not a generation-mix pie slice.{" "}
            <ClaimMark id="C6" /> EV side is stress arithmetic.
          </p>
        </aside>
      )}

      {pieChart && (
        <section
          className="chart-panel adoption-pie-panel"
          aria-label="CAISO generation mix"
        >
          <Plot
            data={pieChart.data}
            layout={{ ...pieChart.layout, autosize: true }}
            config={PLOTLY_CONFIG}
            style={{ width: "100%", height: "440px" }}
            useResizeHandler
          />
          <div className="chart-copy">
            <p className="chart-sources">{GENERATION_PIE_CAVEAT}</p>
            <p className="chart-sources">{END_USE_NOTE}</p>
          </div>
        </section>
      )}

      <section
        className="adoption-bess-equiv"
        aria-label="EV flexibility versus battery storage"
      >
        <h2>EV flexibility vs battery storage</h2>
        <p className="storage-lede">
          Compare evening-ramp relief from managed EV charging to a rough
          stationary BESS size on the same CAISO day.
        </p>
        <div className="storage-grid">
          <div className="storage-card">
            <p className="cost-sublabel">
              Ramp relief ΔR <ClaimMark id="C7" />
            </p>
            <p className="cost-big">
              {Math.round(bessEquiv.deltaR).toLocaleString()} MW/h
              <span>illustrative · unmanaged ramp minus mixed</span>
            </p>
          </div>
          <div className="storage-card">
            <p className="cost-sublabel">
              Illustrative BESS power <ClaimMark id="C7" />
            </p>
            <p className="cost-big">
              {formatMw(bessEquiv.pEquiv)}
              <span>
                ΔR × {bessEquiv.hours.toFixed(1)} h climb · Weak / Speculative
              </span>
            </p>
          </div>
          <div className="storage-card">
            <p className="cost-sublabel">
              Peak net+EV cut <ClaimMark id="C7" />
            </p>
            <p className="cost-big">
              {formatMw(bessEquiv.deltaPeak)}
              <span>illustrative vs unmanaged at same fleet</span>
            </p>
          </div>
          <div className="storage-card">
            <p className="cost-sublabel">
              Midday energy shifted <ClaimMark id="C7" />{" "}
              <ClaimMark id="C8" />
            </p>
            <p className="cost-big">
              {formatMwh(bessEquiv.eShifted)}
              <span>
                vs flatten BESS usable{" "}
                {bessFlat ? formatGwh(bessFlat.usableEnergyMwh) : "n/a"}
                {bessFlat ? ` / ${formatGw(bessFlat.powerMw)}` : ""}
              </span>
            </p>
          </div>
        </div>
        <p className="cost-caveat">
          {BESS_EQUIV_CAVEAT} See CLAIMS.md (C7, C8).
        </p>
      </section>
    </section>
  );
}

export { HONESTY as ADOPTION_HONESTY };
