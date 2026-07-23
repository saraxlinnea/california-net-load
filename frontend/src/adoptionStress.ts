/**
 * Adoption + managed-participation stress math (MATH.md §3b).
 * Pure TS for the /adoption UI - no Plotly, no page chrome.
 *
 * Scales CEC EV load by fleet N / N_0, builds net-load-weighted optimized
 * shape (one-pass feedback on EV-removed net + unmanaged EV), mixes
 * (1-p)·CEC + p·optimized. Chart lines are net_clean + full fleet charging
 * (unmanaged vs mix); both overlays use the same daily EV energy E(N).
 */
import type { EvRow, Scenario } from "./types";
import { PROVENANCE } from "./provenance";
import {
  cecEvLoads,
  peakEvMw as maxEvMw,
  redistributeEnergyToLowestNet,
} from "./managedCharging";
import {
  computeEveningRampAtAnchors,
  findEveningRampAnchors,
  type EveningRamp,
} from "./insights";

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
 * Mix unmanaged CEC with optimized (lowest-strain) shape: (1-p)·cec + p·opt.
 * @param participation p ∈ [0,1] (clamped).
 */
export function mixEvLoads(
  cecLoads: number[],
  optimizedLoads: number[],
  participation: number,
): number[] {
  const p = clamp01(participation);
  return cecLoads.map((c, i) => (1 - p) * c + p * (optimizedLoads[i] ?? 0));
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
  /** Today's modeled CEC EV at N_0 (subtracted from historical net) */
  embeddedEvLoadsMw: number[];
  /** Historical net minus today's modeled EV: net_h − ev_CEC_h(N_0) */
  netEvRemoved: number[];
  /** FULL mixed EV at fleet N (same daily energy as unmanaged) */
  evLoadsMw: number[];
  /** Alias of evLoadsMw */
  evLoads: number[];
  /** Alias of evLoadsMw (full mix at N) */
  evLoadsTotalMw: number[];
  /** FULL CEC (unmanaged) at this fleet */
  cecLoadsMw: number[];
  /** Alias of cecLoadsMw (chart unmanaged EV band) */
  unmanagedEvLoads: number[];
  /**
   * FULL-fleet net-load-weighted optimized at N.
   * Do not plot against series without matching net baseline.
   */
  optimizedLoadsMw: number[];
  /**
   * @deprecated Alias of optimizedLoadsMw - FULL fleet;
   * not Cost-page midday solar.
   */
  middayLoadsMw: number[];
  /**
   * @deprecated Alias of optimizedLoadsMw - FULL fleet;
   * not Cost-page managedEvLoads().
   */
  managedEvLoads: number[];
  /** netEvRemoved + unmanaged CEC at fleet N */
  netPlusUnmanaged: number[];
  /** netEvRemoved + mixed EV at fleet N */
  netPlusEv: number[];
  /** Peak of full mixed EV at fleet N */
  peakEvMw: number;
  /** Alias of peakEvMw */
  peakEvTotalMw: number;
  /** Daily EV energy of full fleet-N mix (MWh); equals unmanaged energy */
  evEnergyMwh: number;
  /** Alias of evEnergyMwh */
  evEnergyTotalMwh: number;
  /** Daily CAISO system load energy (MWh) */
  caisoEnergyMwh: number;
  /** Full-fleet EV daily energy as % of that day's CAISO load energy */
  pctOfCaisoEnergy: number;
  /** Max of netEvRemoved + mixed EV */
  peakNetPlusEv: number;
  /** Evening ramp on net + mixed EV (grid-only belly/peak hours) */
  ramp: EveningRamp | null;
  /** Evening ramp on net + unmanaged (same grid-only hours) */
  rampAtP0: EveningRamp | null;
  rampUnmanaged: EveningRamp | null;
  /**
   * Unmanaged ramp rate minus mixed ramp rate (MW/h), both measured on the
   * grid-only evening belly→peak hours. Positive means participation reduced
   * the climb rate on that fixed window.
   */
  rampReliefMwPerHour: number | null;
  /** Alias of rampReliefMwPerHour (0 when null) */
  rampRelief: number;
};

/**
 * Compute adoption stress metrics for a day.
 * Scales CEC EV by N/N_0, rebuilds optimized using EV-removed net + unmanaged
 * EV at fleet N (one-pass feedback), mixes with participation p.
 * Chart nets = (net − ev_CEC(N_0)) + full fleet charging (unmanaged or mix).
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

  const cecAtN0 = cecEvLoads(rows, scen);
  const cecLoadsMw = scaleLoadsToFleet(cecAtN0, fleetN);
  const energyAtN = sum(cecLoadsMw);

  // Remove today's modeled EV from historical net, then place full fleet N.
  const netEvRemoved = rows.map(
    (r, i) => r.net_load_MW - (cecAtN0[i] ?? 0),
  );

  // One-pass: weight lowest-strain hours on EV-removed net + unmanaged at N.
  const netWithUnmanaged = netEvRemoved.map(
    (n, i) => n + (cecLoadsMw[i] ?? 0),
  );
  const optimizedLoadsMw = redistributeEnergyToLowestNet(
    energyAtN,
    netWithUnmanaged,
  );

  const evLoadsTotalMw = mixEvLoads(
    cecLoadsMw,
    optimizedLoadsMw,
    participation,
  );

  const evEnergyMwh = sum(evLoadsTotalMw);
  const caisoEnergyMwh = sum(rows.map((r) => r.load_MW));
  const netPlusUnmanaged = netEvRemoved.map(
    (n, i) => n + (cecLoadsMw[i] ?? 0),
  );
  const netPlusMixed = netEvRemoved.map(
    (n, i) => n + (evLoadsTotalMw[i] ?? 0),
  );

  // Lock belly/peak hours on grid-only net so relief does not mix windows.
  const gridAnchors = findEveningRampAnchors(rows);
  const ramp = gridAnchors
    ? computeEveningRampAtAnchors(rows, netPlusMixed, gridAnchors)
    : null;
  const rampAtP0 = gridAnchors
    ? computeEveningRampAtAnchors(rows, netPlusUnmanaged, gridAnchors)
    : null;

  const rampReliefMwPerHour =
    ramp && rampAtP0 ? rampAtP0.mwPerHour - ramp.mwPerHour : null;

  const peakEv = maxEvMw(evLoadsTotalMw);

  return {
    fleetN,
    scale: scaleFromFleet(fleetN),
    adoption: adoptionFromFleet(fleetN),
    participation,
    participate: participation,
    scenario: scen,
    embeddedEvLoadsMw: cecAtN0,
    netEvRemoved,
    evLoadsMw: evLoadsTotalMw,
    evLoads: evLoadsTotalMw,
    evLoadsTotalMw,
    cecLoadsMw,
    unmanagedEvLoads: cecLoadsMw,
    optimizedLoadsMw,
    middayLoadsMw: optimizedLoadsMw,
    managedEvLoads: optimizedLoadsMw,
    netPlusUnmanaged,
    netPlusEv: netPlusMixed,
    peakEvMw: peakEv,
    peakEvTotalMw: peakEv,
    evEnergyMwh,
    evEnergyTotalMwh: evEnergyMwh,
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

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function clamp01(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(1, Math.max(0, p));
}
