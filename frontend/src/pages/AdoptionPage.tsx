import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AdoptionPanel from "../AdoptionPanel";
import DeepDiveShell from "../DeepDiveShell";
import {
  loadAvailableDays,
  loadEvTimeseries,
  loadFuelMix,
  loadTouRates,
} from "../loadData";
import { shareSearchString, useShareState } from "../shareState";
import type { FuelMixRow } from "../fuelTypes";
import type { DayOption, EvRow, TouRow } from "../types";
import "../App.css";

export default function AdoptionPage() {
  const [days, setDays] = useState<DayOption[]>([]);
  const [rows, setRows] = useState<EvRow[] | null>(null);
  const [fuelRows, setFuelRows] = useState<FuelMixRow[] | null>(null);
  const [touRows, setTouRows] = useState<TouRow[]>([]);
  const [loadingDays, setLoadingDays] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const qs = shareSearchString(searchParams);
  const {
    state,
    setDate,
    setScenario,
    setMode,
    setAdoption,
    setScale,
    setParticipate,
    setTodayFleet,
  } = useShareState(days);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadAvailableDays(), loadTouRates()])
      .then(([availableDays, tou]) => {
        if (cancelled) return;
        setDays(availableDays);
        setTouRows(tou);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDays(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!days.some((day) => day.date === state.date)) return;
    let cancelled = false;
    setLoadingRows(true);
    setRows(null);
    setFuelRows(null);
    setError(null);
    Promise.all([loadEvTimeseries(state.date), loadFuelMix(state.date)])
      .then(([timeseriesRows, mix]) => {
        if (cancelled) return;
        setRows(timeseriesRows);
        setFuelRows(mix);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRows(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, state.date]);

  const pageGuide = (
    <nav className="page-guide page-guide-compact" aria-label="Other pages">
      <span className="page-guide-title">Also explore</span>
      <Link to={`/charge${qs}`}>Cost</Link>
      <span aria-hidden="true"> · </span>
      <Link to={`/fuel${qs}`}>Fuel</Link>
      <span aria-hidden="true"> · </span>
      <Link to={`/storage${qs}`}>Storage</Link>
      <span aria-hidden="true"> · </span>
      <Link to={`/compare${qs}`}>Compare</Link>
      <span aria-hidden="true"> · </span>
      <Link to={`/methods${qs}`}>Methods</Link>
    </nav>
  );

  return (
    <DeepDiveShell
      productTitle="California Net Load"
      title="Scale plug-in adoption on one real CAISO day and watch how midday shift changes the evening climb."
      lede="When charging piles up at night, evening net load climbs harder. Shifting the same kWh into midday can ease that ramp in this model, and on PG&E EV rates the same timing shift can cut $/car."
      honesty="Illustrative: same CEC shape and kWh per car. Not a forecast or resource-adequacy study."
      days={days}
      date={state.date}
      onDateChange={setDate}
      controlsLabel="Adoption day"
      loading={loadingDays || loadingRows}
      loadingLabel="Loading adoption stress test…"
      error={error}
      emptyMessage="No days are available."
    >
      {!loadingRows && !error && rows && (
        <AdoptionPanel
          rows={rows}
          fuelRows={fuelRows}
          touRows={touRows}
          date={state.date}
          state={state}
          onScenario={setScenario}
          onMode={setMode}
          onAdoption={setAdoption}
          onScale={setScale}
          onParticipate={setParticipate}
          onTodayFleet={setTodayFleet}
          pageGuide={pageGuide}
        />
      )}
    </DeepDiveShell>
  );
}
