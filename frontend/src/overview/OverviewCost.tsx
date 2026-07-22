import {
  formatDollars,
  type ChargingMode,
  type CostComparison,
} from "../insights";
import { CHARGING_MODE_LABELS } from "../managedCharging";
import { PROVENANCE } from "../provenance";
import { SCENARIO_META, type Scenario } from "../types";

const ANNUALIZATION_CAVEAT =
  "Yearly and monthly $ assume this day’s kWh every day and this season’s PG&E rates. Winter rates and winter driving differ. Not a bill.";

type Props = {
  costs: CostComparison;
  scenario: Scenario;
  chargingMode: ChargingMode;
  vehicleCount: number;
};

export default function OverviewCost({
  costs,
  scenario,
  chargingMode,
  vehicleCount,
}: Props) {
  const meta = SCENARIO_META[scenario];
  const headline = costs.byPlan.reduce(
    (best, row) =>
      row.savingsYearlyPerCar > best.savingsYearlyPerCar ? row : best,
    costs.byPlan[0],
  );
  const headlineBest =
    headline.bestAlt === "midday" ? headline.midday : headline.offpeak;
  const hasSavings = headline.savingsYearlyPerCar > 0;

  return (
    <section className="cost-panel" aria-label="Charging cost per car">
      <h2>Charging cost per car</h2>
      <p className="cost-fleet-line">
        {meta.label} · {meta.miles} mi/day ·{" "}
        {costs.energyKwhPerVehicle.toFixed(1)} kWh/car ·{" "}
        {vehicleCount === 1
          ? "1 car"
          : `${vehicleCount.toLocaleString()} cars`}
        . Same energy every schedule; only the hours change. Evening-ramp relief
        under higher adoption lives on Adoption.
      </p>
      <p className="chart-showing">
        Chart showing: <strong>{CHARGING_MODE_LABELS[chargingMode]}</strong>
      </p>

      {headline && (
        <aside
          className="callout cost-savings-headline"
          aria-label="Schedule savings versus CEC"
        >
          <p>
            {hasSavings ? (
              <>
                On <strong>{headline.plan}</strong>, switching from unmanaged
                CEC to {headlineBest.label} saves about{" "}
                <strong>
                  {formatDollars(headline.savingsYearlyPerCar)}
                </strong>
                /car·year (
                {formatDollars(headline.savingsYearlyPerCar / 12)}
                /car·month)
                {vehicleCount > 1 && (
                  <>
                    {" "}
                    · {formatDollars(headline.savingsYearlyFleet)}/year for{" "}
                    {vehicleCount.toLocaleString()} cars
                  </>
                )}
                . PG&E energy charges only; TOU windows are territory rates, not
                CAISO peaks.
              </>
            ) : (
              <>
                On these PG&E EV plans, CEC’s night-heavy shape is already near
                the cheapest hours for this season day; midday or off-peak-only
                does not beat it by much. Energy charges only; not a full bill.
              </>
            )}
          </p>
        </aside>
      )}

      <div className="cost-grid cost-grid-plans">
        {costs.byPlan.map((planCost) => {
          const best =
            planCost.bestAlt === "midday" ? planCost.midday : planCost.offpeak;
          const saves = planCost.savingsYearlyPerCar > 0;
          return (
            <div
              key={planCost.plan}
              className={saves ? "cost-block highlight" : "cost-block"}
            >
              <h3>
                {planCost.plan}{" "}
                <a
                  className="cost-plan-link"
                  href={PROVENANCE.tou.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  rates
                </a>
              </h3>
              <div className="cost-shapes">
                <ShapeCostBlock
                  shape={planCost.cec}
                  active={chargingMode === "cec"}
                />
                <ShapeCostBlock
                  shape={planCost.midday}
                  active={chargingMode === "managed"}
                />
                <ShapeCostBlock
                  shape={planCost.offpeak}
                  active={chargingMode === "offpeak"}
                />
              </div>
              <p className="cost-delta">
                {saves ? (
                  <>
                    Best alternative ({best.label}) saves about{" "}
                    <strong>
                      {formatDollars(planCost.savingsYearlyPerCar)}
                    </strong>
                    /car·year (
                    {formatDollars(planCost.savingsYearlyPerCar / 12)}
                    /car·month)
                    {vehicleCount > 1 && (
                      <>
                        {" · "}
                        {formatDollars(planCost.savingsYearlyFleet)}/year for{" "}
                        {vehicleCount.toLocaleString()} cars
                      </>
                    )}
                  </>
                ) : (
                  <>
                    On this plan, CEC’s night-heavy shape is already near the
                    cheapest hours; midday or off-peak-only does not beat it by
                    much.
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>
      <p className="cost-caveat">{costs.caveat}</p>
    </section>
  );
}

function ShapeCostBlock({
  shape,
  active,
}: {
  shape: {
    label: string;
    yearlyDollarsPerVehicle: number;
    monthlyDollarsPerVehicle: number;
    dailyCentsPerVehicle: number;
    effectiveCentsPerKwh: number;
  };
  active: boolean;
}) {
  return (
    <div className={active ? "shape-cost active-cost" : "shape-cost"}>
      <p className="cost-sublabel">{shape.label}</p>
      <p className="cost-big">
        {formatDollars(shape.yearlyDollarsPerVehicle)}
        <span>/car·year</span>
      </p>
      <p className="cost-month">
        {formatDollars(shape.monthlyDollarsPerVehicle)}/car·month
      </p>
      {active && (
        <p className="annualization-caveat">{ANNUALIZATION_CAVEAT}</p>
      )}
      <p>
        {shape.effectiveCentsPerKwh.toFixed(1)}¢/kWh avg · $
        {(shape.dailyCentsPerVehicle / 100).toFixed(2)}/car·day
      </p>
    </div>
  );
}
