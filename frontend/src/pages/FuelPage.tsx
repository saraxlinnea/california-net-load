import { useEffect, useState } from "react";
import DeepDiveShell from "../DeepDiveShell";
import FuelPanel from "../FuelPanel";
import {
  loadAvailableDays,
  loadEmissionFactors,
  loadFuelMix,
} from "../loadData";
import type { EmissionFactor, FuelMixRow } from "../fuelTypes";
import { useShareState } from "../shareState";
import type { DayOption } from "../types";
import "../App.css";

export default function FuelPage() {
  const [days, setDays] = useState<DayOption[]>([]);
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [rows, setRows] = useState<FuelMixRow[] | null>(null);
  const [loadingDays, setLoadingDays] = useState(true);
  const [loadingFuel, setLoadingFuel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { state, setDate } = useShareState(days);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadAvailableDays(), loadEmissionFactors()])
      .then(([availableDays, emissionFactors]) => {
        if (cancelled) return;
        setDays(availableDays);
        setFactors(emissionFactors);
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
    setLoadingFuel(true);
    setRows(null);
    setError(null);
    loadFuelMix(state.date)
      .then((fuelRows) => {
        if (!cancelled) setRows(fuelRows);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFuel(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, state.date]);

  return (
    <DeepDiveShell
      title="Fuel"
      lede="See how this CAISO day’s hourly generation mix drives operational stack carbon intensity (lb CO₂/MWh). The fuel stack and CI line update with the selected day."
      honesty="Imports use an EPA eGRID CAMX annual proxy, not hourly import mix. Batteries count discharge only in the CI denominator."
      days={days}
      date={state.date}
      onDateChange={setDate}
      controlsLabel="Fuel mix controls"
      loading={loadingDays || loadingFuel}
      loadingLabel="Loading fuel mix…"
      error={error}
      emptyMessage="No fuel mix days are available."
    >
      {!loadingFuel && !error && rows && (
        <FuelPanel rows={rows} factors={factors} date={state.date} />
      )}
    </DeepDiveShell>
  );
}
