import type { EvRow } from "./types";
import { computeEveningRamp } from "./insights";

export const STORAGE_ASSUMPTIONS = [
  "Back-of-envelope only, not a resource adequacy or interconnection study.",
  "Target flat net-load = mean net load over hours 09–21 inclusive (9 a.m. through 9 p.m.).",
  "Charge when net < target; discharge when net > target (perfect foresight, 1-hour steps).",
  "This is not a chronological SOC dispatch: hour order and intermediate state-of-charge limits are not simulated, so the implied path may be infeasible.",
  "Primary energy E = max(charge MWh, discharge MWh) from a lossless shift (bars match this).",
  "Optional nameplate uplift E/η with η=90% RTE is shown separately; bars are not loss-adjusted.",
  "Power rating = max |net − target| in the window (1-hour average MW).",
].join(" ");

export type StorageEstimate = {
  targetMw: number;
  windowStartHour: number;
  windowEndHour: number;
  chargeMwh: number;
  dischargeMwh: number;
  /** Lossless shift energy (primary illustrative E). */
  usableEnergyMwh: number;
  /** E / η nameplate uplift (secondary; bars remain lossless). */
  nameplateEnergyMwh: number;
  powerMw: number;
  /** Duration from lossless E ÷ power. */
  durationHours: number;
  /** Duration if using nameplate energy ÷ power. */
  nameplateDurationHours: number;
  roundTripEfficiency: number;
  bellyMw: number;
  peakMw: number;
  rampMwPerHour: number | null;
};

const RTE = 0.9;
const WINDOW_START = 9;
const WINDOW_END = 22; // exclusive end for hour filter: include through 21

/** Hourly series for the flatten chart (same window math as estimateStorageToFlatten). */
export type StorageFlattenSeries = {
  times: string[];
  netMw: number[];
  /** Mean net in window; NaN outside window so the line gaps */
  targetMw: (number | null)[];
  /** MW absorbed from the surplus belly (net < target) */
  chargeMw: number[];
  /** MW injected into the evening climb (net > target) */
  dischargeMw: number[];
  targetConstantMw: number;
};

/**
 * Size a BESS to flatten net load toward the mean over the belly→evening window.
 * Charge/discharge energy are lossless (sum to ~equal in a closed window).
 * Nameplate = usable/η is an optional uplift, not applied to the path bars.
 */
export function estimateStorageToFlatten(rows: EvRow[]): StorageEstimate | null {
  if (!rows.length) return null;
  const window = rows.filter(
    (r) => r.hour >= WINDOW_START && r.hour < WINDOW_END,
  );
  if (window.length < 2) return null;

  const targetMw =
    window.reduce((s, r) => s + r.net_load_MW, 0) / window.length;

  let chargeMwh = 0;
  let dischargeMwh = 0;
  let powerMw = 0;
  for (const r of window) {
    const delta = r.net_load_MW - targetMw;
    if (delta < 0) chargeMwh += -delta; // 1h × MW = MWh
    else dischargeMwh += delta;
    powerMw = Math.max(powerMw, Math.abs(delta));
  }

  const usableEnergyMwh = Math.max(chargeMwh, dischargeMwh);
  const nameplateEnergyMwh = usableEnergyMwh / RTE;
  const durationHours = powerMw > 0 ? usableEnergyMwh / powerMw : 0;
  const nameplateDurationHours =
    powerMw > 0 ? nameplateEnergyMwh / powerMw : 0;

  const belly = window.reduce((b, r) =>
    r.net_load_MW < b.net_load_MW ? r : b,
  );
  const peak = window.reduce((b, r) =>
    r.net_load_MW > b.net_load_MW ? r : b,
  );
  const ramp = computeEveningRamp(rows);

  return {
    targetMw,
    windowStartHour: WINDOW_START,
    windowEndHour: WINDOW_END - 1,
    chargeMwh,
    dischargeMwh,
    usableEnergyMwh,
    nameplateEnergyMwh,
    powerMw,
    durationHours,
    nameplateDurationHours,
    roundTripEfficiency: RTE,
    bellyMw: belly.net_load_MW,
    peakMw: peak.net_load_MW,
    rampMwPerHour: ramp?.mwPerHour ?? null,
  };
}

/** Same window and target as estimateStorageToFlatten, for Plotly. */
export function storageFlattenSeries(
  rows: EvRow[],
): StorageFlattenSeries | null {
  const est = estimateStorageToFlatten(rows);
  if (!est) return null;
  const target = est.targetMw;
  const times: string[] = [];
  const netMw: number[] = [];
  const targetMw: (number | null)[] = [];
  const chargeMw: number[] = [];
  const dischargeMw: number[] = [];
  for (const r of rows) {
    times.push(r.Time);
    netMw.push(r.net_load_MW);
    const inWindow = r.hour >= WINDOW_START && r.hour < WINDOW_END;
    targetMw.push(inWindow ? target : null);
    if (!inWindow) {
      chargeMw.push(0);
      dischargeMw.push(0);
      continue;
    }
    const delta = r.net_load_MW - target;
    chargeMw.push(delta < 0 ? -delta : 0);
    dischargeMw.push(delta > 0 ? delta : 0);
  }
  return {
    times,
    netMw,
    targetMw,
    chargeMw,
    dischargeMw,
    targetConstantMw: target,
  };
}

export function formatGw(mw: number): string {
  if (Math.abs(mw) >= 1000) return `${(mw / 1000).toFixed(1)} GW`;
  return `${Math.round(mw).toLocaleString()} MW`;
}

export function formatGwh(mwh: number): string {
  if (Math.abs(mwh) >= 1000) return `${(mwh / 1000).toFixed(1)} GWh`;
  return `${Math.round(mwh).toLocaleString()} MWh`;
}
