/**
 * Adoption + managed-participation stress math (MATH.md §3b).
 * Pure TS for the /adoption UI — no Plotly, no page chrome.
 *
 * Scales CEC EV load by fleet N / N_0, builds midday managed shape,
 * mixes (1-p)·CEC + p·midday, and reports peak / energy / ramp metrics.
 */
import type { EvRow, Scenario } from "./types";
import { PROVENANCE } from "./provenance";
import {
  cecEvLoads,
  managedEvLoads,
  peakEvMw as maxEvMw,
} from "./managedCharging";
import { computeEveningRamp, type EveningRamp } from "./insights";

/** AFDC 2024 BEV+PHEV baseline plug-in stock N_0 */
export const N0 = PROVENANCE.population.bevPlusPhev;

/** Alias used by share/UI helpers */
export const N_0 = N0;

/** CEC light-duty on-road population N_LDV (data as of 2025-12-31) */
export const N_LDV: number | null =
  typeof PROVENANCE.population.ldvTotal === "number" &&
  PROVENANCE.population.ldvTotal > 0
    ? PROVENANCE.population.ldvTotal
    : null;

/** Today's implied plug-in share of CA LDV (display only; AFDC vs CEC years differ) */
export const A0 = N_LDV != null && N_LDV > 0 ? N0 / N_LDV : Number.NaN;

/** True when % of CA LDV presets can be enabled. */
export function hasLdvTotal(): boolean {
  return N_LDV != null && N_LDV > 0;
}

/** Today's implied LDV share a_0 = N_0 / N_LDV (display only). */
export function todayAdoptionShare(): number | null {
  return hasLdvTotal() ? A0 : null;
}

/**
 * Fleet size from adoption share a of CA LDV: N = a · N_LDV.
 * @param a Share of light-duty stock (e.g. 0.5, 1.0); not clamped.
 */
export function fleetFromAdoption(a: number): number {
  if (!hasLdvTotal() || N_LDV == null) {
    throw new Error("N_LDV missing: verify CEC LDV total in provenance");
  }
  return a * N_LDV;
}

/**
 * Fleet size from scale s relative to today's AFDC stock: N = s · N_0.
 * @param s Multiple of N_0 (e.g. 2 = double today's plug-in fleet).
 */
export function fleetFromScale(s: number): number {
  return s * N0;
}

/** s = N / N_0 */
export function scaleFromFleet(fleetN: number): number {
  return fleetN / N0;
}

/** a = N / N_LDV */
export function adoptionFromFleet(fleetN: number): number {
  if (!hasLdvTotal() || N_LDV == null) return Number.NaN;
  return fleetN / N_LDV;
}

/**
 * Resolve absolute fleet size N.
 * Priority: fleetN → adoption → scale → default N_0.
 */
export function resolveFleetN(opts: {
  fleetN?: number;
  adoption?: number;
  scale?: number;
}): number {
  if (opts.fleetN != null && Number.isFinite(opts.fleetN)) {
    return Math.max(0, opts.fleetN);
  }
  if (opts.adoption != null && Number.isFinite(opts.adoption)) {
    if (!hasLdvTotal()) return N0;
    return Math.max(0, fleetFromAdoption(opts.adoption));
  }
  if (opts.scale != null && Number.isFinite(opts.scale)) {
    return Math.max(0, fleetFromScale(opts.scale));
  }
  return N0;
}

export type ResolvedFleet = {
  fleetN: number;
  adoption: number;
  scale: number;
};

/** Resolve fleet metadata for share-state sync. */
export function resolveFleetFromAdoption(adoption: number): ResolvedFleet {
  const fleetN = fleetFromAdoption(adoption);
  return {
    fleetN,
    adoption,
    scale: scaleFromFleet(fleetN),
  };
}

export function resolveFleetFromScale(scale: number): ResolvedFleet {
  const fleetN = fleetFromScale(scale);
  return {
    fleetN,
    adoption: adoptionFromFleet(fleetN),
    scale,
  };
}

/**
 * Mix unmanaged CEC with midday managed: (1-p)·cec + p·midday.
 * @param participation p ∈ [0,1] (clamped).
 */
export function mixEvLoads(
  cecLoads: number[],
  middayLoads: number[],
  participation: number,
): number[] {
  const p = clamp01(participation);
  return cecLoads.map((c, i) => (1 - p) * c + p * (middayLoads[i] ?? 0));
}

/** Scale a baseline (N_0) hourly series by fleetN / N_0. */
export function scaleLoadsToFleet(loadsAtN0: number[], fleetN: number): number[] {
  const factor = fleetN / N0;
  return loadsAtN0.map((v) => v * factor);
}

export type AdoptionStressParams = {
  rows: EvRow[];
  scenario: Scenario;
  /** Absolute fleet size N. Wins over adoption / scale when set. */
  fleetN?: number;
  /** Share of CA LDV (a). Used if fleetN omitted. */
  adoption?: number;
  /** Multiple of today's AFDC fleet (s = N / N_0). Used if fleetN and adoption omitted. */
  scale?: number;
  /** Managed participation p ∈ [0,1]; default 0 (all CEC). */
  participation?: number;
  /** Alias for participation (share-state naming). */
  participate?: number;
};

export type AdoptionStressResult = {
  fleetN: number;
  /** N / N_0 */
  scale: number;
  /** N / N_LDV */
  adoption: number;
  participation: number;
  /** Alias of participation for UI share-state naming */
  participate: number;
  scenario: Scenario;
  /** Hourly mixed EV load (MW) */
  evLoadsMw: number[];
  /** Alias of evLoadsMw */
  evLoads: number[];
  /** Hourly CEC (unmanaged) at this fleet */
  cecLoadsMw: number[];
  /** Alias for ghost unmanaged series */
  unmanagedEvLoads: number[];
  /** Hourly midday managed at this fleet (same daily energy as CEC) */
  middayLoadsMw: number[];
  managedEvLoads: number[];
  /** net_load + mixed EV */
  netPlusEv: number[];
  peakEvMw: number;
  /** Daily EV energy (MWh); conserved across p */
  evEnergyMwh: number;
  /** Daily CAISO system load energy (MWh) */
  caisoEnergyMwh: number;
  /** EV daily energy as % of that day's CAISO load energy */
  pctOfCaisoEnergy: number;
  /** Max of net_load + mixed EV */
  peakNetPlusEv: number;
  /** Evening ramp on net + mixed EV */
  ramp: EveningRamp | null;
  /** Evening ramp on net + CEC only (p = 0), same fleet */
  rampAtP0: EveningRamp | null;
  rampUnmanaged: EveningRamp | null;
  /**
   * Unmanaged ramp rate minus mixed ramp rate (MW/h).
   * Positive means participation reduced the evening climb rate.
   */
  rampReliefMwPerHour: number | null;
  /** Alias of rampReliefMwPerHour (0 when null) */
  rampRelief: number;
};

/**
 * Compute adoption stress metrics for a day.
 * Scales CEC EV columns by N/N_0, rebuilds midday via managedCharging,
 * mixes with participation p, and measures energy / peak / evening ramp.
 */
export function computeAdoptionStress(
  paramsOrRows: AdoptionStressParams | EvRow[],
  scenario?: Scenario,
  options: Omit<AdoptionStressParams, "rows" | "scenario"> = {},
): AdoptionStressResult {
  const params: AdoptionStressParams = Array.isArray(paramsOrRows)
    ? { rows: paramsOrRows, scenario: scenario!, ...options }
    : paramsOrRows;

  const { rows, scenario: scen } = params;
  const fleetN = resolveFleetN(params);
  const participation = clamp01(
    params.participation ?? params.participate ?? 0,
  );

  const cecLoadsMw = scaleLoadsToFleet(cecEvLoads(rows, scen), fleetN);
  const middayLoadsMw = scaleLoadsToFleet(
    managedEvLoads(rows, scen),
    fleetN,
  );
  const evLoadsMw = mixEvLoads(cecLoadsMw, middayLoadsMw, participation);

  const evEnergyMwh = sum(evLoadsMw);
  const caisoEnergyMwh = sum(rows.map((r) => r.load_MW));
  const netPlusMixed = rows.map((r, i) => r.net_load_MW + evLoadsMw[i]);
  const netPlusCec = rows.map((r, i) => r.net_load_MW + cecLoadsMw[i]);

  const ramp = computeEveningRamp(rowsWithNet(rows, netPlusMixed));
  const rampAtP0 = computeEveningRamp(rowsWithNet(rows, netPlusCec));

  const rampReliefMwPerHour =
    ramp && rampAtP0 ? rampAtP0.mwPerHour - ramp.mwPerHour : null;

  return {
    fleetN,
    scale: scaleFromFleet(fleetN),
    adoption: adoptionFromFleet(fleetN),
    participation,
    participate: participation,
    scenario: scen,
    evLoadsMw,
    evLoads: evLoadsMw,
    cecLoadsMw,
    unmanagedEvLoads: cecLoadsMw,
    middayLoadsMw,
    managedEvLoads: middayLoadsMw,
    netPlusEv: netPlusMixed,
    peakEvMw: maxEvMw(evLoadsMw),
    evEnergyMwh,
    caisoEnergyMwh,
    pctOfCaisoEnergy:
      caisoEnergyMwh > 0 ? (evEnergyMwh / caisoEnergyMwh) * 100 : 0,
    peakNetPlusEv: netPlusMixed.length ? Math.max(...netPlusMixed) : 0,
    ramp,
    rampAtP0,
    rampUnmanaged: rampAtP0,
    rampReliefMwPerHour,
    rampRelief: rampReliefMwPerHour ?? 0,
  };
}

/** Synthetic rows so computeEveningRamp reads net+EV as net_load_MW. */
function rowsWithNet(rows: EvRow[], netMw: number[]): EvRow[] {
  return rows.map((r, i) => ({ ...r, net_load_MW: netMw[i] ?? r.net_load_MW }));
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function clamp01(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(1, Math.max(0, p));
}
