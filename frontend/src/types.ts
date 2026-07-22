export type Scenario = "low" | "mid" | "high";

export type TouPlan = "EV2-A" | "EV-B";

export type DayOption = {
  date: string;
  label: string;
};

export type EvRow = {
  Time: string;
  load_MW: number;
  solar_MW: number;
  wind_MW: number;
  net_load_MW: number;
  source: string;
  as_of_date: string;
  hour: number;
  ev_load_MW_low: number;
  net_load_plus_ev_MW_low: number;
  ev_load_MW_mid: number;
  net_load_plus_ev_MW_mid: number;
  ev_load_MW_high: number;
  net_load_plus_ev_MW_high: number;
};

export type TouRow = {
  plan: TouPlan;
  season: "Summer" | "Winter";
  period: "Off-Peak" | "Partial-Peak" | "Peak";
  start_hour: number;
  end_hour: number;
  rate_cents_kwh: number;
  source: string;
  as_of_date: string;
  notes: string;
};

export const SCENARIO_META: Record<
  Scenario,
  { label: string; miles: number; note: string }
> = {
  low: {
    label: "Low",
    miles: 20,
    note: "GW/NREL odometer study (~7,165 mi/yr)",
  },
  mid: {
    label: "Mid",
    miles: 27,
    note: "NHTS-based average (~10,000 mi/yr); ~1.00× CEC daily total",
  },
  high: {
    label: "High",
    miles: 33,
    note: "UC Davis ITS newer long-range EVs",
  },
};
