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
  bestPlanSavings,
  buildEvTimingInsight,
  buildShiftBridgeCallout,
  computeCostComparison,
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

export default function OverviewPage() {
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
      layout: buildLayout(shapes, toggles.showTouRates, annotations),
    };
  }, [rows, state, toggles, touRows]);

  const timingInsight = useMemo(
    () =>
      rows
        ? buildEvTimingInsight(
            rows,
            state.scenario,
            state.mode,
            state.date,
            state.plan,
            touRows,
          )
        : null,
    [rows, state, touRows],
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
    const savings = costs ? bestPlanSavings(costs) : null;
    return buildShiftBridgeCallout({
      rampUnmanagedMwPerHour: shiftStress.at0.ramp?.mwPerHour ?? null,
      rampAtParticipateMwPerHour: shiftStress.atP.ramp?.mwPerHour ?? null,
      rampReliefMwPerHour: shiftStress.atP.rampRelief,
      participate: state.participate,
      savingsYearlyPerCar: savings?.savingsYearlyPerCar ?? 0,
      savingsPlan: savings?.plan ?? state.plan,
      savingsAltLabel: savings?.altLabel ?? "a cheaper schedule",
    });
  }, [shiftStress, costs, state.participate, state.plan]);

  return (
    <div className="page">
      <header className="hero">
        <h1>Shift charging hours to cut PG&E $/car</h1>
        <p className="lede">
          Same daily kWh on EV2-A or EV-B; only the hours change. Midday or
          off-peak schedules can lower energy charges versus unmanaged CEC. For
          evening-ramp strain as adoption rises, use{" "}
          <Link to={`/${qs}`}>Adoption</Link>.
        </p>
      </header>

      {shiftBridge && (
        <aside
          className="callout callout-honesty callout-share"
          aria-label="Shift charging bridge"
        >
          <p className="callout-headline">{shiftBridge.headline}</p>
          <p>{shiftBridge.detail}</p>
        </aside>
      )}

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
      />

      {costs && (
        <OverviewCost
          costs={costs}
          scenario={state.scenario}
          chargingMode={state.mode}
          vehicleCount={state.cars}
        />
      )}

      {timingInsight && toggles.showEv && (
        <aside className="callout" aria-live="polite">
          <p>{timingInsight.text}</p>
        </aside>
      )}
    </div>
  );
}
