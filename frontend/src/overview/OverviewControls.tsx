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
    <section className="controls" aria-label="Chart controls">
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

      <fieldset className="field scenario">
        <legend>Miles/day</legend>
        {SCENARIOS.map((item) => (
          <label
            key={item}
            className={state.scenario === item ? "active" : undefined}
          >
            <input
              type="radio"
              name="scenario"
              value={item}
              checked={state.scenario === item}
              onChange={() => onScenario(item)}
            />
            {SCENARIO_META[item].label} ({SCENARIO_META[item].miles} mi)
          </label>
        ))}
      </fieldset>

      <fieldset className="field scenario">
        <legend>Charging schedule</legend>
        {MODES.map((mode) => (
          <label
            key={mode}
            className={state.mode === mode ? "active" : undefined}
          >
            <input
              type="radio"
              name="charging"
              checked={state.mode === mode}
              onChange={() => onMode(mode)}
            />
            {CHARGING_MODE_LABELS[mode]}
          </label>
        ))}
      </fieldset>

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
