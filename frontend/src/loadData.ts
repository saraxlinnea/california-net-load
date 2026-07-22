import Papa from "papaparse";
import type { DayOption, EvRow, TouRow } from "./types";
import type { EmissionFactor, FuelMixRow } from "./fuelTypes";

async function fetchText(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.text();
}

function parseCsv<T>(text: string): T[] {
  const result = Papa.parse<T>(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  if (result.errors.length) {
    console.warn("CSV parse warnings", result.errors.slice(0, 3));
  }
  return result.data;
}

export async function loadAvailableDays(): Promise<DayOption[]> {
  const res = await fetch("/data/available_days.json");
  if (!res.ok) throw new Error("available_days.json missing; run npm run sync-data");
  return res.json();
}

export async function loadEvTimeseries(date: string): Promise<EvRow[]> {
  const text = await fetchText(`/data/ev_timeseries_${date}.csv`);
  return parseCsv<EvRow>(text);
}

export async function loadTouRates(): Promise<TouRow[]> {
  const text = await fetchText("/data/tou_rates_pge.csv");
  return parseCsv<TouRow>(text);
}

export async function loadFuelMix(date: string): Promise<FuelMixRow[]> {
  const text = await fetchText(`/data/fuel_mix_${date}.csv`);
  return parseCsv<FuelMixRow>(text);
}

export async function loadEmissionFactors(): Promise<EmissionFactor[]> {
  const text = await fetchText("/data/emission_factors.csv");
  const rows = parseCsv<Record<string, string | number | boolean>>(text);
  return rows.map((r) => ({
    fuel: String(r.fuel),
    lb_co2_per_mwh: Number(r.lb_co2_per_mwh),
    include_in_ci:
      r.include_in_ci === true ||
      r.include_in_ci === "true" ||
      r.include_in_ci === 1,
    source: String(r.source ?? ""),
    notes: String(r.notes ?? ""),
  }));
}

/** PG&E TOU seasons: Summer Jun 1 to Sep 30; Winter Oct 1 to May 31 */
export function pgeSeasonForDate(date: string): "Summer" | "Winter" {
  const month = Number(date.slice(5, 7));
  return month >= 6 && month <= 9 ? "Summer" : "Winter";
}
