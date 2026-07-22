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
