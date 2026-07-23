import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  hasLdvTotal,
  resolveFleetFromAdoption,
  resolveFleetFromScale,
  todayAdoptionShare,
} from "./adoptionStress";
import type { ChargingMode } from "./managedCharging";
import type { DayOption, Scenario, TouPlan } from "./types";

export const DEFAULT_DATE = "2026-07-15";
export const DEFAULT_SCENARIO: Scenario = "mid";
export const DEFAULT_PLAN: TouPlan = "EV2-A";
export const DEFAULT_MODE: ChargingMode = "cec";
export const DEFAULT_PEAK = "2025-08-21";
export const DEFAULT_PARTICIPATE = 0;
/** One-click “Show the shift” midday share */
export const SHOW_SHIFT_PARTICIPATE = 0.5;
/** Strong duck-curve day for the shareable shift preset */
export const SHOW_SHIFT_DATE = "2025-04-18";
export const SHOW_SHIFT_DATE_FALLBACK = "2025-08-21";

/** Clean shareable state for the LinkedIn shift demo. */
export function showShiftSharePatch(days: DayOption[]): Partial<ShareState> {
  const prefer = [SHOW_SHIFT_DATE, SHOW_SHIFT_DATE_FALLBACK];
  const date =
    prefer.find((d) => days.some((day) => day.date === d)) ??
    days[0]?.date ??
    SHOW_SHIFT_DATE;
  return {
    date,
    scenario: DEFAULT_SCENARIO,
    plan: DEFAULT_PLAN,
    mode: "managed",
    cars: 1,
    peak: DEFAULT_PEAK,
    participate: SHOW_SHIFT_PARTICIPATE,
    scale: 1,
    adoption: todayAdoptionShare() ?? defaultAdoption(),
  };
}

/** 50% CA LDV + 50% lowest-strain shift on the same LinkedIn day (atomic URL). */
export function halfLdvShiftSharePatch(days: DayOption[]): Partial<ShareState> {
  const base = showShiftSharePatch(days);
  let scale: number | null = null;
  try {
    if (hasLdvTotal()) scale = resolveFleetFromAdoption(0.5).scale;
  } catch {
    scale = null;
  }
  return {
    ...base,
    adoption: 0.5,
    scale,
    participate: SHOW_SHIFT_PARTICIPATE,
    mode: "managed",
  };
}

/** Canonical query string for a full share state (LinkedIn CTA docs). */
export function buildShareQuery(state: ShareState): string {
  const params = applyShareState(new URLSearchParams(), state);
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** Resolved Show-the-shift state for a day library (stable CTA URL). */
export function showShiftShareState(days: DayOption[]): ShareState {
  const patch = showShiftSharePatch(days);
  return {
    date: patch.date ?? SHOW_SHIFT_DATE,
    scenario: patch.scenario ?? DEFAULT_SCENARIO,
    plan: patch.plan ?? DEFAULT_PLAN,
    mode: patch.mode ?? "managed",
    cars: patch.cars ?? 1,
    peak: patch.peak ?? DEFAULT_PEAK,
    adoption: patch.adoption ?? defaultAdoption(),
    scale: patch.scale ?? 1,
    participate: patch.participate ?? SHOW_SHIFT_PARTICIPATE,
  };
}

export const SCENARIOS: Scenario[] = ["low", "mid", "high"];
export const PLANS: TouPlan[] = ["EV2-A", "EV-B"];
export const MODES: ChargingMode[] = ["cec", "managed", "offpeak"];

/** Query keys always preserved across routes and updates. */
export const SHARE_KEYS = [
  "date",
  "scenario",
  "plan",
  "mode",
  "cars",
  "peak",
  "adoption",
  "participate",
] as const;

/** Optional query keys preserved when present (× today scale). */
export const OPTIONAL_SHARE_KEYS = ["scale"] as const;

function validOption<T extends string>(
  value: string | null,
  options: readonly T[],
  fallback: T,
): T {
  return value && options.includes(value as T) ? (value as T) : fallback;
}

function parseCars(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 100_000 ? n : 1;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function parseUnitInterval(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? clamp01(n) : fallback;
}

function parseOptionalScale(value: string | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function defaultAdoption(): number {
  return todayAdoptionShare() ?? 0;
}

function pickValidDate(
  requested: string | null,
  days: DayOption[],
  fallback: string,
): string {
  if (!days.length) return requested || fallback;
  if (requested && days.some((d) => d.date === requested)) return requested;
  if (days.some((d) => d.date === fallback)) return fallback;
  return days[0].date;
}

export type ShareState = {
  date: string;
  scenario: Scenario;
  plan: TouPlan;
  mode: ChargingMode;
  cars: number;
  peak: string;
  /** Plug-in share of CA LDV in [0, 1] */
  adoption: number;
  /** Optional multiple of today's AFDC fleet; null = derive from adoption */
  scale: number | null;
  /** Managed midday participation in [0, 1] */
  participate: number;
};

function parseShareState(
  params: URLSearchParams,
  days: DayOption[],
): ShareState {
  const scale = parseOptionalScale(params.get("scale"));
  let adoption = parseUnitInterval(params.get("adoption"), defaultAdoption());

  // If only scale is provided (or scale is the driver), sync adoption display.
  if (scale != null && !params.has("adoption") && hasLdvTotal()) {
    adoption = clamp01(resolveFleetFromScale(scale).adoption);
  } else if (
    scale == null &&
    params.has("adoption") &&
    Number.isFinite(Number(params.get("adoption")))
  ) {
    adoption = parseUnitInterval(params.get("adoption"), defaultAdoption());
  }

  return {
    date: pickValidDate(params.get("date"), days, DEFAULT_DATE),
    scenario: validOption(
      params.get("scenario"),
      SCENARIOS,
      DEFAULT_SCENARIO,
    ),
    plan: validOption(params.get("plan"), PLANS, DEFAULT_PLAN),
    mode: validOption(params.get("mode"), MODES, DEFAULT_MODE),
    cars: parseCars(params.get("cars")),
    peak: pickValidDate(params.get("peak"), days, DEFAULT_PEAK),
    adoption,
    scale,
    participate: parseUnitInterval(
      params.get("participate"),
      DEFAULT_PARTICIPATE,
    ),
  };
}

function formatShareNumber(n: number, digits = 6): string {
  const fixed = n.toFixed(digits);
  return fixed.replace(/\.?0+$/, "") || "0";
}

function applyShareState(
  prev: URLSearchParams,
  state: ShareState,
): URLSearchParams {
  const next = new URLSearchParams(prev);
  next.set("date", state.date);
  next.set("scenario", state.scenario);
  next.set("plan", state.plan);
  next.set("mode", state.mode);
  next.set("cars", String(state.cars));
  next.set("peak", state.peak);
  next.set("adoption", formatShareNumber(state.adoption));
  next.set("participate", formatShareNumber(state.participate));
  if (state.scale != null && Number.isFinite(state.scale)) {
    next.set("scale", formatShareNumber(state.scale));
  } else {
    next.delete("scale");
  }
  return next;
}

function shareEquals(a: ShareState, b: ShareState): boolean {
  return (
    a.date === b.date &&
    a.scenario === b.scenario &&
    a.plan === b.plan &&
    a.mode === b.mode &&
    a.cars === b.cars &&
    a.peak === b.peak &&
    a.adoption === b.adoption &&
    a.scale === b.scale &&
    a.participate === b.participate
  );
}

/**
 * Single URL share schema for the app.
 * Layout should preserve the full share query when navigating.
 */
export function useShareState(days: DayOption[] = []) {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(
    () => parseShareState(searchParams, days),
    [days, searchParams],
  );

  const write = useCallback(
    (patch: Partial<ShareState>, replace: boolean) => {
      setSearchParams(
        (prev) => {
          const current = parseShareState(prev, days);
          const merged = { ...current, ...patch };
          const keysPresent = SHARE_KEYS.every((k) => prev.has(k));
          if (shareEquals(current, merged) && keysPresent) {
            return prev;
          }
          return applyShareState(prev, merged);
        },
        { replace },
      );
    },
    [days, setSearchParams],
  );

  // Coerce missing/invalid params into the URL once days are known.
  useEffect(() => {
    if (!days.length) return;
    const raw = parseShareState(searchParams, days);
    const complete = SHARE_KEYS.every((k) => searchParams.has(k));
    const matches =
      searchParams.get("date") === raw.date &&
      searchParams.get("scenario") === raw.scenario &&
      searchParams.get("plan") === raw.plan &&
      searchParams.get("mode") === raw.mode &&
      searchParams.get("cars") === String(raw.cars) &&
      searchParams.get("peak") === raw.peak &&
      searchParams.get("adoption") === formatShareNumber(raw.adoption) &&
      searchParams.get("participate") ===
        formatShareNumber(raw.participate) &&
      (raw.scale == null
        ? !searchParams.has("scale")
        : searchParams.get("scale") === formatShareNumber(raw.scale));
    if (complete && matches) return;
    setSearchParams((prev) => applyShareState(prev, raw), { replace: true });
  }, [days, searchParams, setSearchParams]);

  return {
    state,
    setDate: (date: string) => write({ date }, false),
    setScenario: (scenario: Scenario) => write({ scenario }, false),
    setPlan: (plan: TouPlan) => write({ plan }, false),
    setMode: (mode: ChargingMode) => write({ mode }, false),
    setCars: (cars: number) => write({ cars }, false),
    setPeak: (peak: string) => write({ peak }, false),
    setAdoption: (adoption: number) => {
      const a = clamp01(adoption);
      let scale: number | null = null;
      try {
        if (hasLdvTotal()) {
          scale = resolveFleetFromAdoption(a).scale;
        }
      } catch {
        scale = null;
      }
      write({ adoption: a, scale }, false);
    },
    setScale: (scale: number) => {
      const s = Math.max(0, scale);
      const fleet = resolveFleetFromScale(s);
      write(
        {
          scale: s,
          adoption: Number.isFinite(fleet.adoption)
            ? clamp01(fleet.adoption)
            : defaultAdoption(),
        },
        false,
      );
    },
    setParticipate: (participate: number) =>
      write({ participate: clamp01(participate) }, false),
    setTodayFleet: () => {
      write(
        {
          scale: 1,
          adoption: todayAdoptionShare() ?? 0,
        },
        false,
      );
    },
    setParams: (patch: Partial<ShareState>) => write(patch, false),
  };
}

/** Build a path query that keeps share keys (for Layout nav). */
export function shareSearchString(params: URLSearchParams): string {
  const next = new URLSearchParams();
  for (const key of SHARE_KEYS) {
    const value = params.get(key);
    if (value) next.set(key, value);
  }
  for (const key of OPTIONAL_SHARE_KEYS) {
    const value = params.get(key);
    if (value) next.set(key, value);
  }
  const s = next.toString();
  return s ? `?${s}` : "";
}
