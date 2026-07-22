/**
 * Frozen verification metadata for the UI.
 * Re-check primary sources before changing these dates.
 */
export const PGE_RATE_PDF =
  "https://www.pge.com/assets/pge/docs/account/rate-plans/residential-electric-rate-plan-pricing.pdf";
export const PGE_EV_RATES =
  "https://www.pge.com/en/account/rate-plans/electric-vehicle-rate-plans.html";

export const PROVENANCE = {
  /** When this build last re-checked primary sources */
  verifiedAsOf: "2026-07-20",
  grid: {
    source: "CAISO via gridstatus (CA ISO-TAC load + fuel mix)",
    days: [
      "2024-09-05",
      "2025-01-13",
      "2025-04-16",
      "2025-04-18",
      "2025-08-21",
      "2026-07-15",
    ],
  },
  evShape: {
    source: "CEC 2022 IEPR PEV Load Shapes (LD, 5 utility regions)",
    year: 2024,
  },
  population: {
    source: "AFDC vehicle-registration table",
    year: 2024,
    bevPlusPhev: 1_981_000,
    /** CEC Light-Duty Vehicle Population (DMV-based on-road stock) */
    ldvTotal: 29_657_259,
    ldvAsOf: "2025-12-31",
    ldvSource:
      "CEC Zero Emission Vehicle and Infrastructure Statistics · Vehicle_Population_Last_updated_04-28-2026_ada.xlsx (County sheet statewide sum)",
    ldvUrl:
      "https://www.energy.ca.gov/data-reports/energy-almanac/zero-emission-vehicle-and-infrastructure-statistics-collection/light",
    ldvDownloadUrl:
      "https://www.energy.ca.gov/files/zev-and-infrastructure-stats-data",
    ldvRetrievedAsOf: "2026-07-22",
    ldvReVerifiedAsOf: "2026-07-22",
    ldvRawPath: "data/raw/Vehicle_Population_Last_updated_04-28-2026_ada.xlsx",
    ldvExtractPath: "data/raw/ldv_county_totals_2025-12-31.csv",
  },
  tou: {
    source: "PG&E Residential rate plan pricing PDF",
    effective: "2026-03-01",
    url: PGE_RATE_PDF,
    hubUrl: PGE_EV_RATES,
    /** Re-fetched and matched to tou_rates_pge.csv on verifiedAsOf */
    reVerifiedAsOf: "2026-07-20",
    matchStatus: "PASS" as const,
  },
  carbon: {
    importsProxyLbPerMwh: 428.5,
    importsProxySource: "EPA eGRID2023 CAMX total output emission rate",
    factorsFile: "data/processed/emission_factors.csv",
  },
  /**
   * CAISO peak demand share (not annual end-use energy %).
   * Do not use as a generation-mix or end-use pie slice without CLAIMS.md unlock.
   */
  dataCenters: {
    peakMwApprox: 1_000,
    peakShareOfCaisoApprox: 0.02,
    asOf: "early 2026",
    source: "CEC Planning Forecast · Data Centers topic page",
    url: "https://www.energy.ca.gov/programs-and-topics/topics/data-centers",
    methodologyUrl:
      "https://www.energy.ca.gov/sites/default/files/2026-04/Data_Center_Methodology_Memo_ada.pdf",
    methodologyNote:
      "Methodology memo (Apr 15, 2026): ~1,000 MW existing data center peak demand as of December 2025",
    retrievedAsOf: "2026-07-22",
    /** CEC Planning Forecast projection (same Data Centers page); not current. */
    forecast2040PeakMwApprox: 4_500,
    forecast2040PeakShareOfCaisoApprox: 0.09,
    forecast2040Label: "CEC Planning Forecast ~2040",
  },
  /**
   * CARB Advanced Clean Cars II: manufacturer new-sales ZEV shares.
   * Sales share ≠ on-road fleet share.
   */
  accIi: {
    name: "CARB Advanced Clean Cars II",
    salesShare2026: 0.35,
    salesShare2030: 0.68,
    salesShare2035: 1.0,
    note: "Requirements are shares of new light-duty vehicle sales, not on-road fleet share. Fleet turnover lags sales by years.",
    url: "https://ww2.arb.ca.gov/news/california-moves-accelerate-100-new-zero-emission-vehicle-sales-2035",
    retrievedAsOf: "2026-07-22",
  },
} as const;

export const SOURCE_FOOTER = [
  `CAISO grid · ${PROVENANCE.grid.days.join(", ")}`,
  `CEC 2022 IEPR PEV shapes (2024)`,
  `AFDC 2024 plug-in fleet ${PROVENANCE.population.bevPlusPhev.toLocaleString()}`,
  `PG&E EV rates eff. ${PROVENANCE.tou.effective}`,
].join(" · ");
