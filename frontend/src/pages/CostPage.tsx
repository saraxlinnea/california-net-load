import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { computeAdoptionStress } from "../adoptionStress";
import {
  buildChartTraces,
  buildLayout,
  buildRampAnnotation,
  buildTouRateTrace,
  buildTouShapes,
  yMaxForShapes,
} from "../chartConfig";
import {
  buildShiftBridgeCallout,
  buildThreeClocksCallout,
  computeCostComparison,
  middayVsCecSavings,
  computeEveningRamp,
} from "../insights";
import { loadAvailableDays, loadEvTimeseries, loadTouRates } from "../loadData";
import OverviewChart from "../overview/OverviewChart";
import OverviewControls, {
  type ChartToggles,
} from "../overview/OverviewControls";
import OverviewCost from "../overview/OverviewCost";
import { shareSearchString, useShareState } from "../shareState";
import type { DayOption, EvRow, TouRow } from "../types";
import "../App.css";

export default function CostPage() {
  const [days, setDays] = useState<DayOption[]>([]);
  const {
    state,
    setDate,
    setScenario,
    setPlan,
    setMode,
    setCars,
  } = useShareState(days);
  const [searchParams] = useSearchParams();
  const qs = shareSearchString(searchParams);
  const [rows, setRows] = useState<EvRow[] | null>(null);
  const [touRows, setTouRows] = useState<TouRow[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [toggles, setToggles] = useState<ChartToggles>({
    showDuck: true,
    showEv: true,
    showTouBands: true,
    showTouRates: true,
    showRamp: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadAvailableDays(), loadTouRates()])
      .then(([dayList, tou]) => {
        if (cancelled) return;
        setDays(dayList);
        setTouRows(tou);
        setDataReady(true);
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dataReady || !days.some((d) => d.date === state.date)) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadEvTimeseries(state.date)
      .then((evRows) => {
        if (!cancelled) setRows(evRows);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dataReady, days, state.date]);

  const ramp = useMemo(
    () => (rows ? computeEveningRamp(rows) : null),
    [rows],
  );

  const chart = useMemo(() => {
    if (!rows?.length) return null;
    const yMax = yMaxForShapes(rows, toggles.showEv, state.scenario);
    const shapes =
      toggles.showTouBands && touRows.length
        ? buildTouShapes(state.date, state.plan, touRows, yMax)
        : [];
    const traces = buildChartTraces(
      rows,
      state.scenario,
      toggles.showDuck,
      toggles.showEv,
      state.mode,
      state.date,
      state.plan,
      touRows,
    );
    if (toggles.showTouRates && touRows.length) {
      traces.push(buildTouRateTrace(state.date, state.plan, touRows));
    }
    const annotations = [];
    if (toggles.showRamp) {
      const annotation = buildRampAnnotation(rows);
      if (annotation) annotations.push(annotation);
    }
    return {
      data: traces,
      layout: {
        ...buildLayout(shapes, toggles.showTouRates, annotations),
        title: {
          text: "Net load, EV charging, and PG&E TOU",
          font: { size: 14 },
          x: 0,
          xanchor: "left" as const,
        },
      },
    };
  }, [rows, state, toggles, touRows]);

  const threeClocks = useMemo(
    () => (rows ? buildThreeClocksCallout(rows, state.scenario) : null),
    [rows, state.scenario],
  );

  const costs = useMemo(
    () =>
      rows
        ? computeCostComparison(
            rows,
            state.scenario,
            state.date,
            touRows,
            state.cars,
          )
        : null,
    [rows, state.cars, state.date, state.scenario, touRows],
  );

  /** Today's AFDC fleet; ramp relief uses share-state participate (same as Adoption). */
  const shiftStress = useMemo(() => {
    if (!rows?.length) return null;
    const atP = computeAdoptionStress(rows, state.scenario, {
      scale: 1,
      participate: state.participate,
    });
    const at0 = computeAdoptionStress(rows, state.scenario, {
      scale: 1,
      participate: 0,
    });
    return { atP, at0 };
  }, [rows, state.scenario, state.participate]);

  const shiftBridge = useMemo(() => {
    if (!shiftStress) return null;
    const savings = costs ? middayVsCecSavings(costs) : null;
    return buildShiftBridgeCallout({
      rampReliefMwPerHour: shiftStress.atP.rampRelief,
      participate: state.participate,
      savingsYearlyPerCar: savings?.savingsYearlyPerCar ?? 0,
      savingsPlan: savings?.plan ?? state.plan,
    });
  }, [shiftStress, costs, state.participate, state.plan]);

  return (
    <div className="page">
      <header className="hero">
        <h1>Cost</h1>
        <p className="lede">
          Move the same daily kWh into midday or off-peak hours on PG&E EV2-A or
          EV-B. For fleet scale and evening ramp, use{" "}
          <Link to={`/${qs}`}>Fleet</Link>.
        </p>
      </header>

      <OverviewControls
        days={days}
        state={state}
        toggles={toggles}
        onDate={setDate}
        onScenario={setScenario}
        onPlan={setPlan}
        onMode={setMode}
        onCars={setCars}
        onToggle={(key, value) =>
          setToggles((prev) => ({ ...prev, [key]: value }))
        }
      />

      <OverviewChart
        error={error}
        loading={loading}
        hasRows={Boolean(rows)}
        chart={chart}
        ramp={ramp}
        dayTimingsDetail={threeClocks?.detail ?? null}
      />

      {shiftBridge && (
        <aside
          className="callout callout-honesty callout-share callout-echo"
          aria-label="Shift charging echo"
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
            Full controls on <Link to={`/${qs}`}>Fleet</Link>
            {" · "}
            Modeled ramp change · driver energy bill (PG&E EV rate) ·{" "}
            <Link to={`/methods${qs}`}>Methods</Link>
          </p>
        </aside>
      )}

      {costs && (
        <OverviewCost
          costs={costs}
          scenario={state.scenario}
          chargingMode={state.mode}
          vehicleCount={state.cars}
        />
      )}
    </div>
  );
}
