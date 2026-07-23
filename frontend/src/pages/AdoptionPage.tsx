import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AdoptionPanel from "../AdoptionPanel";
import { loadAvailableDays, loadEvTimeseries } from "../loadData";
import {
  shareSearchString,
  useShareState,
} from "../shareState";
import type { DayOption, EvRow } from "../types";
import "../App.css";

export default function AdoptionPage() {
  const [days, setDays] = useState<DayOption[]>([]);
  const [rows, setRows] = useState<EvRow[] | null>(null);
  const [loadingDays, setLoadingDays] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const qs = shareSearchString(searchParams);
  const {
    state,
    setDate,
    setScenario,
    setAdoption,
    setScale,
    setParticipate,
  } = useShareState(days);

  useEffect(() => {
    let cancelled = false;
    loadAvailableDays()
      .then((availableDays) => {
        if (!cancelled) setDays(availableDays);
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
    setError(null);
    loadEvTimeseries(state.date)
      .then((timeseriesRows) => {
        if (!cancelled) setRows(timeseriesRows);
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
      <span className="page-guide-title">Also</span>
      <Link to={`/charge${qs}`}>Cost</Link>
      <span aria-hidden="true"> · </span>
      <Link to={`/fuel${qs}`}>Fuel</Link>
      <span aria-hidden="true"> · </span>
      <Link to={`/compare${qs}`}>Compare</Link>
      <span aria-hidden="true"> · </span>
      <Link to={`/methods${qs}`}>Methods</Link>
    </nav>
  );

  const loading = loadingDays || loadingRows;

  return (
    <div className="page">
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && days.length === 0 && (
        <p className="muted">No days are available.</p>
      )}
      {!loadingRows && !error && rows && (
        <AdoptionPanel
          rows={rows}
          days={days}
          date={state.date}
          state={state}
          onDateChange={setDate}
          onScenario={setScenario}
          onAdoption={setAdoption}
          onScale={setScale}
          onParticipate={setParticipate}
          pageGuide={pageGuide}
        />
      )}
    </div>
  );
}
