/**
 * Frozen verification metadata for the UI.
 * Re-check primary sources before changing these dates.
 */
export const PGE_RATE_PDF =
  "https://www.pge.com/assets/pge/docs/account/rate-plans/residential-electric-rate-plan-pricing.pdf";
/** PG&E EV rate plans hub (landing). PDF above remains the rates primary. */
export const PGE_EV_RATES =
  "https://www.pge.com/en/account/rate-plans/electric-vehicles.html";

export const PROVENANCE = {
  /** When this build last re-checked primary sources */
  verifiedAsOf: "2026-07-22",
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
    /**
     * Peak benchmarks primary (CAISO Peak Load History PDF).
     * Hourly series: OASIS via gridstatus in pull_caiso_day.py; committed CSVs.
     */
    peakHistoryUrl:
      "https://www.caiso.com/documents/californiaisopeakloadhistory.pdf",
    processedGlob: "data/processed/grid_timeseries_YYYY-MM-DD.csv",
    processingNote:
      "Hourly load/fuel mix pulled via gridstatus.CAISO() (pull_caiso_day.py), then synced to frontend/public/data/.",
    /** CAISO Peak Load History PDF; site header StatBubble */
    peak2024Mw: 48_323,
    peak2024Label: "2024 (Sept 5, 16:59)",
  },
  evShape: {
    source: "CEC 2022 IEPR PEV Load Shapes (LD, 5 utility regions)",
    year: 2024,
    /**
     * Official CEDU 2022 Load Shapes hub (Transportation Forecast).
     * Exact workbook used here was uploaded locally (Data sheet); not in data/raw/.
     */
    hubUrl:
      "https://www.energy.ca.gov/data-reports/california-energy-planning-library/forecasts-and-system-planning/demand-side-0",
    processedPath: "data/processed/ev_load_shapes_cec_2024_all.csv",
    processedSummerWeekday:
      "data/processed/ev_load_shape_cec_2024_summer_weekday.csv",
  },
  population: {
    source: "AFDC vehicle-registration table",
    year: 2024,
    bevPlusPhev: 1_981_000,
    afdcUrl: "https://afdc.energy.gov/vehicle-registration?year=2024",
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
  /**
   * Primary Adoption miles/day default (CA statewide average).
   * FHWA Highway Statistics 2023 Table VM-2.
   */
  milesPerDay: {
    primaryMiles: 27.9,
    label: "CA average (FHWA 2023)",
    caVmt2023: 316_612_000_000,
    caRegisteredVehicles2023: 31_057_329,
    formula: "VMT / registered vehicles / 365",
    source: "FHWA Highway Statistics Series 2023, Table VM-2",
    url: "https://www.fhwa.dot.gov/policyinformation/statistics/2023/vm2.cfm",
    retrievedAsOf: "2026-07-22",
    lowWhatIfMiles: 20,
    highWhatIfMiles: 33,
    midDailyEnergyMwhAtN0: 16_581,
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
   * CEC 2025 IEPR / CED 2025 demand forecast (adopted Jan 21, 2026).
   * Site framing: EV charging vs data centers as peak-demand growth drivers.
   * This is the CEC's forecast, not a model output from this project.
   */
  ieprDemandForecast: {
    name: "CEC 2025 IEPR Demand Forecast (CED 2025)",
    adopted: "2026-01-21",
    url: "https://www.energy.ca.gov/data-reports/california-energy-planning-library/forecasts-and-system-planning/demand-side-3",
    ieprForecastFilesUrl:
      "https://www.energy.ca.gov/data-reports/reports/integrated-energy-policy-report-iepr/2025-integrated-energy-policy-report-0",
    peakForecastTn: "268124",
    peakForecastLabel: "CED 2025 Peak Forecast",
    form11cDataCentersLabel: "CED 2025 Planning Form 11c Data Center Allocations",
    caisoHourlyPlanningTn: "268127",
    dawgUpdatedResultsUrl:
      "https://www.energy.ca.gov/sites/default/files/2026-01/2026-01-05_DAWG_Mtg_Slides-Combined_ada.pdf",
    transportationPevEnergyLabel: "Utility Region Forecast - PEV Energy",
    transportationPevStockLabel: "Utility Region Forecast – PEV Stock",
    matchedEvVsDcPeakSeriesPasted: false,
    /**
     * Statewide electricity sales by sector (GWh), Planning scenario suite.
     * Source: i25 Managed Sales by Sector and Zone (Planning Library).
     * planning_sales = baseline_sales_mid + aaee_3 + aafs_2 + ldev_aate_2 + mdhd_aate_2
     * (known_loads_incr excluded). EV overlay = ldev_aate_2 + mdhd_aate_2,
     * broken out so Commercial/Residential are net of AATE.
     */
    managedSalesBySector2025Vs2045: {
      sourceFile:
        "data/raw/i25_Managed_Sales_by_Sector_and_Zone_Planning_Library_ada.xlsx",
      extractFile: "data/processed/ced_managed_sales_sector_2025_2045.csv",
      units: "GWh",
      scenarioNote:
        "Planning Forecast adjustments: AAEE Scenario 3 (aaee_3), AAFS Scenario 2 (aafs_2), AATE Scenario 2 (ldev_aate_2 + mdhd_aate_2)",
      formula:
        "planning_sales = baseline_sales_mid + aaee_3 + aafs_2 + ldev_aate_2 + mdhd_aate_2",
      dataCentersNote:
        "Data centers are not separable in this file; their growth is embedded in Commercial/Industrial baseline figures.",
      chartCite:
        'CEC, "Managed Sales by Sector and Zone" (Planning Library i25), statewide sum of planning_sales by sector for 2025 and 2045; EV overlay = ldev_aate_2 + mdhd_aate_2 (AATE Scenario 2), broken out from Commercial/Residential. Planning adjustments: AAEE Scenario 3, AAFS Scenario 2, AATE Scenario 2.',
      byYear: {
        2025: {
          totalGwh: 251_713.321667,
          evOverlayGwh: 0,
          categoriesGwh: {
            Streetlighting: 1_309.51,
            "Industrial Mining & Construction": 4_165.228991,
            TCU: 15_108.012909,
            AGWP: 20_186.129353,
            "Industrial Manufacturing": 29_533.907217,
            Residential: 84_359.016207,
            Commercial: 97_051.516989,
            "Electric vehicles": 0,
          },
        },
        2045: {
          totalGwh: 409_561.281295,
          evOverlayGwh: 32_995.627896,
          categoriesGwh: {
            Streetlighting: 1_033.55,
            "Industrial Mining & Construction": 3_714.42313,
            TCU: 18_659.65023,
            AGWP: 22_972.017827,
            "Industrial Manufacturing": 29_802.03274,
            Residential: 137_623.273144,
            Commercial: 162_760.706328,
            "Electric vehicles": 32_995.627896,
          },
        },
      },
    },
    /**
     * Matched EV vs data-center peak *levels* at coincident system peak
     * (CED 2025 Peak Forecast, annual_peaks, CAISO Planning_Scenario).
     * EV = LIGHT_EV + MEDIUM_HEAVY_EV + AATE_LDV + AATE_MDHD.
     * Growth deltas (+8,256 EV / +4,721 DC) cross-check Item 6 slide 10
     * (+8,234 / +4,721). Hour differs by year (each year's own peak hour).
     */
    matchedPeakLevels2025Vs2045: {
      ev2025Mw: 132,
      ev2045Mw: 8_388,
      dataCenters2025Mw: 96,
      dataCenters2045Mw: 4_817,
      growthEvMw: 8_256,
      growthDataCentersMw: 4_721,
      scenario: "Planning_Scenario",
      tac: "CAISO",
      sheet: "annual_peaks",
      sourceFile: "data/raw/TN268124_CED_2025_Peak_Forecast.xlsx",
      form11cFile:
        "data/raw/TN268824_CED_2025_Planning_Forecast_Form_11c_Data_Center_Allocations.xlsx",
      extractFile: "data/processed/ced_2025_peak_ev_dc_caiso_planning.csv",
      peakHour2025Note: "Sept 3, 5pm",
      peakHour2045Note: "Sept 6, 6pm",
      chartCite:
        'CEC, CED 2025 Peak Forecast (annual_peaks, Planning_Scenario, CAISO, coincident system peak), cross-validated against CEC, "California Energy Demand Forecast, 2025-2045," Item 6 presentation, slide 10, adopted January 21, 2026.',
    },
    /**
     * Matched EV vs data-center peak *growth* (same forecast, same years).
     * CEC Item 6 adoption presentation, "Main Drivers of Peak Load Growth,"
     * slide 10: CAISO Planning baseline, load growth 2025 to 2045, September
     * peak day 6-7pm PDT. Used for the Fleet gross-drivers pie / callout.
     * Not the Data Centers topic-page ~1,000 / ~4,500 MW levels
     * (different framing / ~2040 end year).
     */
    matchedPeakGrowth2025To2045: {
      evMw: 8_234,
      dataCentersMw: 4_721,
      windowLabel: "2025 to 2045 peak load growth",
      scenario: "CAISO Planning baseline",
      peakDayNote: "September peak day, 6-7pm PDT",
      slideLabel: "Item 6 presentation, slide 10",
      chartCite:
        'CEC, "California Energy Demand Forecast, 2025-2045," adopted January 21, 2026, Item 6 presentation, slide 10.',
      /**
       * Full "Main Drivers of Peak Load Growth" slide 10 breakdown.
       * Pie uses gross increases only (negatives cannot be pie slices).
       * Gross 25,241 − reductions 5,475 = net 19,766 MW.
       */
      grossIncreasesMw: {
        electricVehicles: 8_234,
        consumption: 6_011,
        dataCenters: 4_721,
        fuelSubstitution: 4_464,
        climateChange: 1_811,
      },
      grossIncreasesTotalMw: 25_241,
      reductionsMw: {
        energyEfficiency: 4_008,
        btmStorage: 777,
        btmSolar: 690,
      },
      reductionsTotalMw: 5_475,
      netGrowthMw: 19_766,
    },
    peakDriverFinding:
      "EV charging (transportation electrification), not AI data centers, is the largest projected driver of CAISO peak demand growth through 2045",
    /** Site StatBubble primary label (Planning scenario framing). */
    planningScenarioPeakRiseLabel: "~42%",
    planningScenarioPeakRiseNote:
      "Planning scenario: CAISO peak demand rise by ~2045 versus today, mostly from EVs (~42% net growth framing aligned with the Fleet driver breakdown). Distinct from the higher Local Reliability + Known Loads path (~61%).",
    /** Secondary / caption only; not the header bubble value. */
    highScenarioPeakRiseLabel: "Up to 61%",
    highScenarioPeakRiseNote:
      "Local Reliability + Known Loads (higher) scenario: CAISO peak demand rise by ~2045, mostly from EVs (as reported for the adopted forecast; re-check vs CED 2025 Peak Forecast tables for primary).",
    dataCenterUpwardRevisionNote:
      "Data-center component of the same CEC forecast was revised upward shortly before adoption (CEC DAWG update listed on the demand-side page, Jan 5, 2026). The EV-larger-than-data-centers finding already reflects that higher data-center estimate.",
    dawgUpdateLabel:
      "Updated Results for Data Centers, Known Loads, Annual Forecast, Peak Forecast, and Forecast Use Cases (January 5, 2026 DAWG Presentation)",
    retrievedAsOf: "2026-07-22",
    peakTablesCataloguedAsOf: "2026-07-23",
    strengthLabel: "Moderate-Strong (forecast citation)",
  },
  /**
   * National contrast only: EIA AEO2026 names data centers as the dominant
   * long-term U.S. electricity growth driver. Not a California peak claim.
   */
  eiaAeo2026: {
    name: "EIA Annual Energy Outlook 2026",
    published: "2026-04",
    url: "https://www.eia.gov/outlooks/aeo/",
    pressUrl: "https://www.eia.gov/pressroom/releases/press587.php",
    nationalFinding:
      "Data center load is emerging as the dominant driver of long-term U.S. electricity growth",
    retrievedAsOf: "2026-07-22",
  },
  /**
   * Methods-only contrast. No approved primary URL in-repo; do not put in StatBubbles.
   */
  bloomEnergyDcReport: {
    name: "Bloom Energy 2026 Data Center Power Report (Jan 2026)",
    note: "Industry contrast only: California's relative national data-center market share is described as projected to decline as developers favor Texas/Southeast for power availability and faster interconnection. Not independently verified against a primary PDF in this repo; Methods citation only.",
    status: "Methods-only" as const,
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
    /** CARB news release summarizing ACC II; not the regulation text. */
    url: "https://ww2.arb.ca.gov/news/california-moves-accelerate-100-new-zero-emission-vehicle-sales-2035",
    urlKind: "news release (not regulation text)" as const,
    retrievedAsOf: "2026-07-22",
  },
} as const;

export const SOURCE_FOOTER = [
  `CAISO grid · ${PROVENANCE.grid.days.join(", ")}`,
  `CEC 2022 IEPR PEV shapes (2024)`,
  `AFDC 2024 plug-in fleet ${PROVENANCE.population.bevPlusPhev.toLocaleString()}`,
  `PG&E EV rates eff. ${PROVENANCE.tou.effective}`,
].join(" · ");
