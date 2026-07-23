import type { EvRow, Scenario, TouPlan, TouRow } from "./types";
import { pgeSeasonForDate } from "./loadData";

/** CEC night shape, midday solar DR, or cheapest TOU hours only */
export type ChargingMode = "cec" | "managed" | "offpeak";

export const MANAGED_WINDOW_HOURS = [10, 11, 12, 13, 14, 15] as const;

export const CHARGING_MODE_LABELS: Record<ChargingMode, string> = {
  cec: "Unmanaged charging (CEC)",
  managed: "Midday solar",
  offpeak: "Off-peak rates only",
};

export const SIMPLIFIED_MODEL =
  "Simplified model: same daily kWh per car, three charging schedules, PG&E residential EV rates. Not a utility bill.";

export function cecEvLoads(rows: EvRow[], scenario: Scenario): number[] {
  const key = `ev_load_MW_${scenario}` as const;
  return rows.map((r) => r[key]);
}

function redistribute(total: number, weights: number[]): number[] {
  const wSum = weights.reduce((s, v) => s + v, 0);
  if (total <= 0) return weights.map(() => 0);
  if (wSum <= 0) {
    const n = weights.filter((w) => w > 0).length || weights.length;
    return weights.map((w) => (w > 0 || wSum === 0 ? total / n : 0));
  }
  return weights.map((w) => total * (w / wSum));
}

/** Same daily energy, solar-weighted into 10 a.m. to 3 p.m. (Cost page). */
export function managedEvLoads(rows: EvRow[], scenario: Scenario): number[] {
  const cec = cecEvLoads(rows, scenario);
  const total = cec.reduce((s, v) => s + v, 0);
  const inWindow = new Set<number>(MANAGED_WINDOW_HOURS);
  const solarWeights = rows.map((r) =>
    inWindow.has(r.hour) ? Math.max(r.solar_MW, 0) : 0,
  );
  const solarSum = solarWeights.reduce((s, v) => s + v, 0);
  // If the midday window has no solar, equal-split across those six hours only.
  const weights =
    solarSum > 0
      ? solarWeights
      : rows.map((r) => (inWindow.has(r.hour) ? 1 : 0));
  return redistribute(total, weights);
}

/**
 * Same daily energy E, redistributed toward lowest hours of a net series.
 * Default net series = this day's CAISO net + unmanaged CEC at the CSV/scenario
 * fleet (one-pass feedback). Pass `netMw` to override. Illustrative C7.
 */
export function netLoadOptimizedEvLoads(
  rows: EvRow[],
  scenario: Scenario,
  epsilon = 1e-6,
  netMw?: number[],
): number[] {
  const cec = cecEvLoads(rows, scenario);
  const total = cec.reduce((s, v) => s + v, 0);
  if (!rows.length || total <= 0) return cec.map(() => 0);
  const netSeries =
    netMw && netMw.length === rows.length
      ? netMw
      : rows.map((r, i) => r.net_load_MW + (cec[i] ?? 0));
  return redistributeEnergyToLowestNet(total, netSeries, epsilon);
}

/** Redistribute fixed daily energy E toward lowest hours of a net series. */
export function redistributeEnergyToLowestNet(
  totalMwh: number,
  netMw: number[],
  epsilon = 1e-6,
): number[] {
  if (!netMw.length || totalMwh <= 0) return netMw.map(() => 0);
  const netMax = Math.max(...netMw);
  const weights = netMw.map((n) => Math.max(netMax - n, 0) + epsilon);
  return redistribute(totalMwh, weights);
}

/**
 * Same daily energy, only in hours at the plan's cheapest (off-peak) rate.
 * Equal split across those hours.
 */
export function offpeakEvLoads(
  rows: EvRow[],
  scenario: Scenario,
  date: string,
  plan: TouPlan,
  touRows: TouRow[],
): number[] {
  const cec = cecEvLoads(rows, scenario);
  const total = cec.reduce((s, v) => s + v, 0);
  const season = pgeSeasonForDate(date);
  const bands = touRows.filter((r) => r.plan === plan && r.season === season);
  if (!bands.length) return managedEvLoads(rows, scenario);

  const ratesByHour = rows.map((row) => {
    const hit = bands.find(
      (b) => row.hour >= b.start_hour && row.hour < b.end_hour,
    );
    return hit?.rate_cents_kwh ?? Number.POSITIVE_INFINITY;
  });
  const minRate = Math.min(...ratesByHour.filter((r) => Number.isFinite(r)));
  const weights = ratesByHour.map((r) => (r === minRate ? 1 : 0));
  return redistribute(total, weights);
}

export function evLoadsForMode(
  rows: EvRow[],
  scenario: Scenario,
  mode: ChargingMode,
  date?: string,
  plan?: TouPlan,
  touRows?: TouRow[],
): number[] {
  if (mode === "managed") return managedEvLoads(rows, scenario);
  if (mode === "offpeak") {
    if (!date || !plan || !touRows?.length) {
      return managedEvLoads(rows, scenario);
    }
    return offpeakEvLoads(rows, scenario, date, plan, touRows);
  }
  return cecEvLoads(rows, scenario);
}

export function netPlusEv(rows: EvRow[], evLoads: number[]): number[] {
  return rows.map((r, i) => r.net_load_MW + evLoads[i]);
}

export function peakEvMw(evLoads: number[]): number {
  return evLoads.length ? Math.max(...evLoads) : 0;
}

export function peakEvHour(rows: EvRow[], evLoads: number[]): number {
  if (!rows.length) return 0;
  let best = 0;
  for (let i = 1; i < evLoads.length; i++) {
    if (evLoads[i] > evLoads[best]) best = i;
  }
  return rows[best].hour;
}

