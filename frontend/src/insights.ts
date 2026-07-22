import type { EvRow, Scenario, TouPlan, TouRow } from "./types";
import { SCENARIO_META } from "./types";
import { pgeSeasonForDate } from "./loadData";
import {
  type ChargingMode,
  CHARGING_MODE_LABELS,
  cecEvLoads,
  evLoadsForMode,
  managedEvLoads,
  offpeakEvLoads,
  peakEvHour,
  peakEvMw,
  SIMPLIFIED_MODEL,
} from "./managedCharging";

export type { ChargingMode } from "./managedCharging";
export { SIMPLIFIED_MODEL, CHARGING_MODE_LABELS };

const KWH_PER_MILE = 0.3;

export function rateForHour(
  hour: number,
  plan: TouPlan,
  season: "Summer" | "Winter",
  touRows: TouRow[],
): number | null {
  const bands = touRows.filter((r) => r.plan === plan && r.season === season);
  const hit = bands.find((b) => hour >= b.start_hour && hour < b.end_hour);
  return hit ? hit.rate_cents_kwh : null;
}

function hourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h >= 12 ? "p.m." : "a.m.";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${suffix}`;
}

function eveningNetLoadPeak(rows: EvRow[]): EvRow {
  const evening = rows.filter((r) => r.hour >= 12);
  const pool = evening.length ? evening : rows;
  return pool.reduce((best, r) =>
    r.net_load_MW > best.net_load_MW ? r : best,
  );
}

export type EvTimingInsight = {
  evPeakMw: number;
  evPeakHour: number;
  evPeakLabel: string;
  text: string;
};

export function buildEvTimingInsight(
  rows: EvRow[],
  scenario: Scenario,
  mode: ChargingMode,
  date: string,
  plan: TouPlan,
  touRows: TouRow[],
): EvTimingInsight | null {
  if (!rows.length) return null;
  const loads = evLoadsForMode(rows, scenario, mode, date, plan, touRows);
  const evPeakMwVal = peakEvMw(loads);
  const evHour = peakEvHour(rows, loads);
  const netPeak = eveningNetLoadPeak(rows);
  const label = SCENARIO_META[scenario].label.toLowerCase();

  let text: string;
  if (mode === "managed") {
    text = `Midday charging peak (${label}) is ${Math.round(evPeakMwVal).toLocaleString()} MW around ${hourLabel(evHour)}, in the solar belly, before the evening net-load peak near ${hourLabel(netPeak.hour)}.`;
  } else if (mode === "offpeak") {
    text = `Off-peak-only charging peak (${label}) is ${Math.round(evPeakMwVal).toLocaleString()} MW around ${hourLabel(evHour)}, restricted to the cheapest ${plan} hours.`;
  } else {
    text = `Unmanaged CEC peak (${label}) is ${Math.round(evPeakMwVal).toLocaleString()} MW around ${hourLabel(evHour)}, after the evening net-load peak near ${hourLabel(netPeak.hour)}. Late-night TOU behavior, not 6 p.m. arrival.`;
  }

  return {
    evPeakMw: evPeakMwVal,
    evPeakHour: evHour,
    evPeakLabel: hourLabel(evHour),
    text,
  };
}

export type ShapeCost = {
  mode: ChargingMode;
  label: string;
  dailyCentsPerVehicle: number;
  monthlyDollarsPerVehicle: number;
  yearlyDollarsPerVehicle: number;
  effectiveCentsPerKwh: number;
  fleetYearlyDollars: number;
};

export type PlanCostRow = {
  plan: TouPlan;
  cec: ShapeCost;
  midday: ShapeCost;
  offpeak: ShapeCost;
  /** Best alternative vs CEC for this plan */
  bestAlt: "midday" | "offpeak";
  savingsYearlyPerCar: number;
  savingsYearlyFleet: number;
};

export type CostComparison = {
  energyKwhPerVehicle: number;
  fleetSize: number;
  byPlan: PlanCostRow[];
  caveat: string;
};

function shapeWeightedRate(
  rows: EvRow[],
  evLoads: number[],
  plan: TouPlan,
  season: "Summer" | "Winter",
  touRows: TouRow[],
): number {
  const total = evLoads.reduce((s, v) => s + v, 0);
  if (total <= 0) return 0;
  let effective = 0;
  for (let i = 0; i < rows.length; i++) {
    const rate = rateForHour(rows[i].hour, plan, season, touRows);
    if (rate == null) continue;
    effective += (evLoads[i] / total) * rate;
  }
  return effective;
}

function buildShapeCost(
  mode: ChargingMode,
  effectiveCentsPerKwh: number,
  energyKwhPerVehicle: number,
  fleetSize: number,
): ShapeCost {
  const dailyCentsPerVehicle = energyKwhPerVehicle * effectiveCentsPerKwh;
  const yearlyDollarsPerVehicle = (dailyCentsPerVehicle / 100) * 365;
  return {
    mode,
    label: CHARGING_MODE_LABELS[mode],
    dailyCentsPerVehicle,
    monthlyDollarsPerVehicle: yearlyDollarsPerVehicle / 12,
    yearlyDollarsPerVehicle,
    effectiveCentsPerKwh,
    fleetYearlyDollars: yearlyDollarsPerVehicle * fleetSize,
  };
}

export function computeCostComparison(
  rows: EvRow[],
  scenario: Scenario,
  date: string,
  touRows: TouRow[],
  fleetSize: number,
): CostComparison | null {
  if (!rows.length || !touRows.length) return null;
  const n = Math.max(1, Math.floor(fleetSize));
  const season = pgeSeasonForDate(date);
  const miles = SCENARIO_META[scenario].miles;
  const energyKwhPerVehicle = miles * KWH_PER_MILE;
  const cec = cecEvLoads(rows, scenario);
  const midday = managedEvLoads(rows, scenario);

  const plans: TouPlan[] = ["EV2-A", "EV-B"];
  const byPlan: PlanCostRow[] = plans.map((plan) => {
    const offpeak = offpeakEvLoads(rows, scenario, date, plan, touRows);
    const cecCost = buildShapeCost(
      "cec",
      shapeWeightedRate(rows, cec, plan, season, touRows),
      energyKwhPerVehicle,
      n,
    );
    const middayCost = buildShapeCost(
      "managed",
      shapeWeightedRate(rows, midday, plan, season, touRows),
      energyKwhPerVehicle,
      n,
    );
    const offpeakCost = buildShapeCost(
      "offpeak",
      shapeWeightedRate(rows, offpeak, plan, season, touRows),
      energyKwhPerVehicle,
      n,
    );
    const bestAlt =
      middayCost.yearlyDollarsPerVehicle <= offpeakCost.yearlyDollarsPerVehicle
        ? "midday"
        : "offpeak";
    const best =
      bestAlt === "midday" ? middayCost : offpeakCost;
    return {
      plan,
      cec: cecCost,
      midday: middayCost,
      offpeak: offpeakCost,
      bestAlt,
      savingsYearlyPerCar:
        cecCost.yearlyDollarsPerVehicle - best.yearlyDollarsPerVehicle,
      savingsYearlyFleet: cecCost.fleetYearlyDollars - best.fleetYearlyDollars,
    };
  });

  return {
    energyKwhPerVehicle,
    fleetSize: n,
    byPlan,
    caveat: SIMPLIFIED_MODEL,
  };
}

export function formatDollars(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `$${(n / 1_000).toFixed(1)}k`;
  if (Math.abs(n) >= 100) return `$${n.toFixed(0)}`;
  return `$${n.toFixed(2)}`;
}

export type EveningRamp = {
  startTime: string;
  endTime: string;
  midTime: string;
  startLabel: string;
  endLabel: string;
  startMw: number;
  endMw: number;
  midMw: number;
  hours: number;
  deltaMw: number;
  mwPerHour: number;
};

export function computeEveningRamp(rows: EvRow[]): EveningRamp | null {
  if (rows.length < 2) return null;
  const bellyPool = rows.filter((r) => r.hour >= 9 && r.hour <= 16);
  if (!bellyPool.length) return null;
  const belly = bellyPool.reduce((best, r) =>
    r.net_load_MW < best.net_load_MW ? r : best,
  );
  const after = rows.filter((r) => r.hour >= belly.hour);
  if (!after.length) return null;
  const peak = after.reduce((best, r) =>
    r.net_load_MW > best.net_load_MW ? r : best,
  );
  const hours = peak.hour - belly.hour;
  if (hours <= 0) return null;
  const midHour = belly.hour + hours / 2;
  const midRow =
    after.find((r) => r.hour === Math.floor(midHour)) ??
    after[Math.floor(after.length / 2)] ??
    peak;
  const deltaMw = peak.net_load_MW - belly.net_load_MW;
  return {
    startTime: belly.Time,
    endTime: peak.Time,
    midTime: midRow.Time,
    startLabel: hourLabel(belly.hour),
    endLabel: hourLabel(peak.hour),
    startMw: belly.net_load_MW,
    endMw: peak.net_load_MW,
    midMw: (belly.net_load_MW + peak.net_load_MW) / 2,
    hours,
    deltaMw,
    mwPerHour: deltaMw / hours,
  };
}

/**
 * Share-ready framing: evening CAISO ramp vs unmanaged CEC late-night EV peak
 * vs PG&E TOU ≠ CAISO peaks. Reuses ramp + CEC timing; no new metrics.
 */
export function buildThreeClocksCallout(
  rows: EvRow[],
  scenario: Scenario,
): { headline: string; detail: string } | null {
  if (!rows.length) return null;
  const ramp = computeEveningRamp(rows);
  const cecTiming = buildEvTimingInsight(
    rows,
    scenario,
    "cec",
    rows[0]?.as_of_date ?? "",
    "EV2-A",
    [],
  );
  if (!ramp || !cecTiming) return null;
  const label = SCENARIO_META[scenario].label.toLowerCase();
  return {
    headline:
      "Three different clocks: CAISO evening ramp, late-night CEC EV charging, and PG&E TOU prices.",
    detail: `This day’s net-load evening ramp averages ${Math.round(ramp.mwPerHour).toLocaleString()} MW/h from ${ramp.startLabel} to ${ramp.endLabel} (CAISO, Strong). Unmanaged CEC EV peak (${label}) is about ${Math.round(cecTiming.evPeakMw).toLocaleString()} MW around ${cecTiming.evPeakLabel}, after the net-load peak: late-night TOU behavior, not 6 p.m. arrival. PG&E EV TOU windows are territory retail rates; they are not CAISO system peak hours.`,
  };
}

export type ShiftBridgeInput = {
  /** Unmanaged (p=0) ramp rate on net+EV, MW/h */
  rampUnmanagedMwPerHour: number | null;
  /** Ramp rate at current participate, MW/h */
  rampAtParticipateMwPerHour: number | null;
  /** Unmanaged minus mixed (existing adoptionStress rampRelief) */
  rampReliefMwPerHour: number;
  participate: number;
  /** Best schedule savings vs CEC from computeCostComparison */
  savingsYearlyPerCar: number;
  savingsPlan: string;
  savingsAltLabel: string;
};

/**
 * Product bridge: same kWh / different hours; ramp relief + PG&E $/car.
 * Reuses existing rampRelief and cost-comparison savings only.
 */
export function buildShiftBridgeCallout(
  input: ShiftBridgeInput,
): { headline: string; detail: string } {
  const pct = Math.round(input.participate * 100);
  const relief = Math.round(input.rampReliefMwPerHour);
  const hasRelief = input.rampReliefMwPerHour > 0;
  const hasSavings = input.savingsYearlyPerCar > 0;

  const headline =
    "Same kWh, different hours: shifting charge time can ease evening grid strain and can cut PG&E $/car.";

  const parts: string[] = [];
  if (hasRelief) {
    parts.push(
      `At ${pct}% shifted to midday in this model, evening ramp relief is about ${relief.toLocaleString()} MW/h versus unmanaged CEC (illustrative).`,
    );
  } else if (input.rampUnmanagedMwPerHour != null) {
    parts.push(
      `Unmanaged evening climb is about ${Math.round(input.rampUnmanagedMwPerHour).toLocaleString()} MW/h on net+EV; raise the midday shift share on Adoption to see relief in this model.`,
    );
  }
  if (hasSavings) {
    parts.push(
      `On ${input.savingsPlan}, moving the same daily kWh into ${input.savingsAltLabel} saves about ${formatDollars(input.savingsYearlyPerCar)}/car·year versus unmanaged CEC (energy charges only).`,
    );
  } else {
    parts.push(
      "On these PG&E EV plans for this season day, CEC’s night-heavy shape is already near the cheapest hours; midday may not cut $/car much.",
    );
  }
  parts.push(
    "PG&E TOU windows are territory retail rates; they are not CAISO system peak hours.",
  );

  return { headline, detail: parts.join(" ") };
}

/** Pick the plan row with the largest yearly $/car savings vs CEC. */
export function bestPlanSavings(costs: CostComparison): {
  plan: string;
  altLabel: string;
  savingsYearlyPerCar: number;
} {
  const row = costs.byPlan.reduce(
    (best, next) =>
      next.savingsYearlyPerCar > best.savingsYearlyPerCar ? next : best,
    costs.byPlan[0],
  );
  const bestShape = row.bestAlt === "midday" ? row.midday : row.offpeak;
  return {
    plan: row.plan,
    altLabel: bestShape.label,
    savingsYearlyPerCar: row.savingsYearlyPerCar,
  };
}
