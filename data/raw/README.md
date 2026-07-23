# Raw inputs (committed for provenance)

## CEC light-duty vehicle population

- **File:** `Vehicle_Population_Last_updated_04-28-2026_ada.xlsx`
- **Source hub:** https://www.energy.ca.gov/files/zev-and-infrastructure-stats-data
- **Direct download used:** https://www.energy.ca.gov/filebrowser/download/9606?fid=9606
- **Dashboard:** https://www.energy.ca.gov/data-reports/energy-almanac/zero-emission-vehicle-and-infrastructure-statistics-collection/light
- **Retrieved:** 2026-07-22
- **Sheets used:** `County` (primary), `ZIP` (cross-check)

### Statewide sum method

Filter `Data Year == 2025`, sum `Number of Vehicles` on the County sheet.

- **County sum:** 29,657,259
- **ZIP sum (same year):** 29,657,259 (identical)
- **Matches** `PROVENANCE.population.ldvTotal` / `BENCHMARKS.md` (data as of 2025-12-31 per CEC labeling)

Extract: `ldv_county_totals_2025-12-31.csv` (per-county totals plus `__STATEWIDE_SUM__` row).

## CED 2025 Peak Forecast (TN 268124)

- **File:** `TN268124_CED_2025_Peak_Forecast.xlsx`
- **Label:** CED 2025 Peak Forecast
- **Retrieved / placed:** 2026-07-23
- **Sheet used:** `annual_peaks`

### Fleet four-bar extract (CAISO Planning)

Filter `TAC == CAISO`, `SCENARIO == Planning_Scenario`, `YEAR in (2025, 2045)`, coincident peak rows.

EV MW = `LIGHT_EV + MEDIUM_HEAVY_EV + AATE_LDV + AATE_MDHD` (baseline EV plus AATE, matching how managed net load is built).

| Year | Peak day / hour | EV MW | Data center MW (`DATA_CENTER`) |
|---|---|---:|---:|
| 2025 | Sept 3, hour 17 (5pm) | 132 | 96 |
| 2045 | Sept 6, hour 18 (6pm) | 8,388 | 4,817 |

Growth deltas: EV +8,256 MW · data center +4,721 MW (cross-check Item 6 slide 10: +8,234 / +4,721).

Extract: `../processed/ced_2025_peak_ev_dc_caiso_planning.csv`

## CED 2025 Planning Forecast Form 11c Data Center Allocations (TN 268824)

- **File:** `TN268824_CED_2025_Planning_Forecast_Form_11c_Data_Center_Allocations.xlsx`
- **Retrieved / placed:** 2026-07-23
- **Role:** companion Form 11c workbook for data-center allocations (peak contribution levels for the Fleet chart come from the Peak Forecast `annual_peaks` sheet above).

## Managed Sales by Sector and Zone (Planning Library i25)

- **File:** `i25_Managed_Sales_by_Sector_and_Zone_Planning_Library_ada.xlsx`
- **Retrieved / placed:** 2026-07-23
- **Units:** GWh
- **Sheet:** `Sheet1`

### Verified identity

`planning_sales = baseline_sales_mid + aaee_3 + aafs_2 + ldev_aate_2 + mdhd_aate_2`  
(`known_loads_incr` is **not** in `planning_sales`). Planning suite: AAEE Scenario 3, AAFS Scenario 2, AATE Scenario 2.

### Fleet stacked-bar extract (2025 vs 2045)

Statewide sum of `planning_sales` by `sector`, then EV overlay `ldev_aate_2 + mdhd_aate_2` broken out so Commercial/Residential are net of AATE.

| Year | Statewide total | EV overlay |
|---|---:|---:|
| 2025 | 251,713 GWh | 0 GWh |
| 2045 | 409,561 GWh | 32,996 GWh |

Data centers are **not** separable in this file (embedded in Commercial/Industrial baselines).

Extract: `../processed/ced_managed_sales_sector_2025_2045.csv`
