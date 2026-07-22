export type EmissionFactor = {
  fuel: string;
  lb_co2_per_mwh: number;
  include_in_ci: boolean;
  source: string;
  notes: string;
};

export type FuelMixRow = {
  Time: string;
  Solar: number;
  Wind: number;
  Geothermal: number;
  Biomass: number;
  Biogas: number;
  "Small Hydro": number;
  Coal: number;
  Nuclear: number;
  "Natural Gas": number;
  "Large Hydro": number;
  Batteries: number;
  Imports: number;
  Other: number;
  source: string;
  as_of_date: string;
};

/** Stack order for the fuel-mix chart (bottom → top visually via stackgroup order) */
export const FUEL_STACK_ORDER = [
  "Nuclear",
  "Large Hydro",
  "Small Hydro",
  "Geothermal",
  "Biomass",
  "Biogas",
  "Wind",
  "Solar",
  "Imports",
  "Natural Gas",
  "Coal",
  "Other",
] as const;

export const FUEL_COLORS: Record<string, string> = {
  Nuclear: "rgba(120, 90, 160, 0.75)",
  "Large Hydro": "rgba(40, 100, 160, 0.7)",
  "Small Hydro": "rgba(70, 140, 190, 0.65)",
  Geothermal: "rgba(160, 90, 60, 0.7)",
  Biomass: "rgba(90, 130, 70, 0.7)",
  Biogas: "rgba(110, 150, 90, 0.65)",
  Wind: "rgba(42, 111, 151, 0.75)",
  Solar: "rgba(212, 160, 23, 0.8)",
  Imports: "rgba(140, 140, 140, 0.55)",
  "Natural Gas": "rgba(180, 70, 50, 0.75)",
  Coal: "rgba(60, 60, 60, 0.8)",
  Other: "rgba(100, 100, 100, 0.5)",
  Batteries: "rgba(20, 140, 120, 0.95)",
};

export const CI_CAVEATS = [
  "Operational stack CO₂ only, not lifecycle (manufacturing, methane leakage, etc.).",
  "Imports use EPA eGRID2023 CAMX annual average (428.5 lb/MWh) as a proxy for unknown import mix.",
  "Batteries: discharge counted at 0 EF; charging excluded from the generation mix (energy shifting, not fuel).",
  "Biomass/biogas biogenic CO₂ excluded here; protocols differ.",
  "Natural gas / coal EFs are planning-order-of-magnitude, not CAISO plant-specific.",
].join(" ");
