import { useEffect, useState } from "react";
import ComparePanel from "../ComparePanel";
import { loadAvailableDays } from "../loadData";
import { useShareState } from "../shareState";
import type { DayOption } from "../types";
import "../App.css";

export default function ComparePage() {
  const [days, setDays] = useState<DayOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { state, setDate, setPeak } = useShareState(days);

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
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <header className="hero">
        <h1>Compare</h1>
        <p className="lede">
          Put two real CAISO days side by side so spring, summer, and peak
          conditions are visible at once. Load, net load, and evening ramps
          appear for each day.
        </p>
        <p className="honesty">
          Each day is one CA ISO-TAC sample; differences are not a forecast. EV
          overlay uses the same CEC shape assumptions as Cost and Fleet.
        </p>
      </header>

      {loading && <p className="muted">Loading available days…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && days.length < 2 && (
        <p className="muted">
          At least two available days are required for comparison.
        </p>
      )}
      {!loading && !error && days.length >= 2 && (
        <ComparePanel
          days={days}
          mildDate={state.date}
          peakDate={state.peak}
          onMildDate={setDate}
          onPeakDate={setPeak}
        />
      )}
    </div>
  );
}
