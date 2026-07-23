import { PROVENANCE } from "../provenance";
import { CHARGING_MODE_LABELS } from "../managedCharging";
import {
  MODES,
  SCENARIOS,
  type ShareState,
} from "../shareState";
import type { DayOption, Scenario, TouPlan } from "../types";
import { SCENARIO_META } from "../types";
import type { ChargingMode } from "../managedCharging";

export type ChartToggles = {
  showDuck: boolean;
  showEv: boolean;
  showTouBands: boolean;
  showTouRates: boolean;
  showRamp: boolean;
};

type Props = {
  days: DayOption[];
  state: ShareState;
  toggles: ChartToggles;
  onDate: (date: string) => void;
  onScenario: (scenario: Scenario) => void;
  onPlan: (plan: TouPlan) => void;
  onMode: (mode: ChargingMode) => void;
  onCars: (cars: number) => void;
  onToggle: (key: keyof ChartToggles, value: boolean) => void;
};

/** Single Cost-page control panel: day, miles, schedule, plan, cars. */
export default function OverviewControls({
  days,
  state,
  toggles,
  onDate,
  onScenario,
  onPlan,
  onMode,
  onCars,
  onToggle,
}: Props) {
  return (
    <section
      className="controls controls-cost"
      aria-label="Cost chart and schedule controls"
    >
      <label className="field">
        <span>Day</span>
        <select
          value={state.date}
          onChange={(event) => onDate(event.target.value)}
        >
          {days.map((day) => (
            <option key={day.date} value={day.date}>
              {day.label}
            </option>
          ))}
        </select>
      </label>

      <div className="field chip-field">
        <span>Miles/day</span>
        <div
          className="adoption-chart-chips"
          role="group"
          aria-label="Miles per day"
        >
          {SCENARIOS.map((item) => (
            <button
              key={item}
              type="button"
              className={
                state.scenario === item
                  ? "shift-preset chip-active"
                  : "shift-preset"
              }
              aria-pressed={state.scenario === item}
              onClick={() => onScenario(item)}
            >
              {item === "mid"
                ? `${SCENARIO_META[item].miles} mi (CA avg)`
                : `${SCENARIO_META[item].miles} mi`}
            </button>
          ))}
        </div>
      </div>

      <div className="field chip-field">
        <span>Charging schedule</span>
        <div
          className="adoption-chart-chips"
          role="group"
          aria-label="Charging schedule"
        >
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={
                state.mode === mode ? "shift-preset chip-active" : "shift-preset"
              }
              aria-pressed={state.mode === mode}
              onClick={() => onMode(mode)}
            >
              {CHARGING_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>PG&E plan</span>
        <select
          value={state.plan}
          onChange={(event) => onPlan(event.target.value as TouPlan)}
        >
          <option value="EV2-A">EV2-A (home charging)</option>
          <option value="EV-B">EV-B (overnight off-peak)</option>
        </select>
        <span className="field-hint">
          <a href={PROVENANCE.tou.hubUrl} target="_blank" rel="noreferrer">
            PG&E EV rate plans
          </a>
          {" · "}
          <a href={PROVENANCE.tou.url} target="_blank" rel="noreferrer">
            pricing PDF
          </a>
        </span>
      </label>

      <label className="field">
        <span>Number of cars</span>
        <input
          type="number"
          min={1}
          max={100000}
          step={1}
          value={state.cars}
          onChange={(event) => {
            const next = Number(event.target.value);
            onCars(
              Number.isInteger(next) && next >= 1 && next <= 100_000
                ? next
                : 1,
            );
          }}
        />
        <span className="field-hint">1 = one household car</span>
      </label>

      <p className="territory-note">
        Rates: PG&E only (SCE/SDG&E not verified).
      </p>

      <details className="chart-options">
        <summary>Chart options</summary>
        <div className="toggles">
          <label>
            <input
              type="checkbox"
              checked={toggles.showDuck}
              onChange={(e) => onToggle("showDuck", e.target.checked)}
            />
            Load / gap renewables
          </label>
          <label>
            <input
              type="checkbox"
              checked={toggles.showEv}
              onChange={(e) => onToggle("showEv", e.target.checked)}
            />
            EV overlay
          </label>
          <label>
            <input
              type="checkbox"
              checked={toggles.showTouBands}
              onChange={(e) => onToggle("showTouBands", e.target.checked)}
            />
            TOU period bands
          </label>
          <label>
            <input
              type="checkbox"
              checked={toggles.showTouRates}
              onChange={(e) => onToggle("showTouRates", e.target.checked)}
            />
            TOU rate line
          </label>
          <label>
            <input
              type="checkbox"
              checked={toggles.showRamp}
              onChange={(e) => onToggle("showRamp", e.target.checked)}
            />
            Ramp annotation
          </label>
        </div>
      </details>
    </section>
  );
}
