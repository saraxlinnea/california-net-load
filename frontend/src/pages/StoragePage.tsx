import { useEffect, useState } from "react";
import DeepDiveShell from "../DeepDiveShell";
import { loadAvailableDays, loadEvTimeseries } from "../loadData";
import StoragePanel from "../StoragePanel";
import { useShareState } from "../shareState";
import type { DayOption, EvRow } from "../types";
import "../App.css";

export default function StoragePage() {
  const [days, setDays] = useState<DayOption[]>([]);
  const [rows, setRows] = useState<EvRow[] | null>(null);
  const [loadingDays, setLoadingDays] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state, setDate } = useShareState(days);

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

  return (
    <DeepDiveShell
      title="Storage"
      lede="Estimate battery power and energy that would flatten this day’s midday net-load belly and evening climb over a fixed daytime window. Cards show power, usable energy, and implied duration."
      honesty="Back-of-envelope only (C8 · Weak). Not interconnection, RA, or a procurement study. Round-trip efficiency assumed at 0.9."
      days={days}
      date={state.date}
      onDateChange={setDate}
      controlsLabel="Storage controls"
      loading={loadingDays || loadingRows}
      loadingLabel="Loading storage estimate…"
      error={error}
      emptyMessage="No storage days are available."
    >
      {!loadingRows && !error && rows && (
        <StoragePanel rows={rows} date={state.date} />
      )}
    </DeepDiveShell>
  );
}
