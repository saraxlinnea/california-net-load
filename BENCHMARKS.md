# BENCHMARKS.md
Sanity-check reference values for the EV load vs. duck curve viewer.
Last updated: July 22, 2026

Every figure below is either independently confirmed against a primary source, or explicitly marked as unverified. Nothing here should be treated as usable for the demo unless marked Confirmed.

---

## Grid

| Metric | Value | Year | Source | Status |
|---|---|---|---|---|
| CAISO peak load | 48,323 MW | 2024 (Sept 5, 16:59) | CAISO Peak Load History PDF | **Confirmed** — pulled directly |
| CAISO peak load | 44,506 MW | 2025 (Aug 21, 18:07) | CAISO Peak Load History PDF | **Confirmed** — pulled directly |
| CAISO all-time peak | 52,061 MW | Sept 2022 | CAISO Peak Load History PDF | **Confirmed** — pulled directly |

## Data centers (CAISO peak share)

Peak demand share of CAISO system peak. **Not** annual end-use energy share; do not treat as a generation-mix or end-use pie slice.

| Metric | Value | Year | Source | Status |
|---|---|---|---|---|
| Existing data center peak demand | ~1,000 MW | early 2026 (existing as of Dec 2025 in methodology memo) | [CEC Data Centers](https://www.energy.ca.gov/programs-and-topics/topics/data-centers) (Planning Forecast); [2025 IEPR Data Center Methodology Memo](https://www.energy.ca.gov/sites/default/files/2026-04/Data_Center_Methodology_Memo_ada.pdf) (Apr 15, 2026) | **Confirmed** — read from CEC primary pages 2026-07-22 |
| Data center share of CAISO peak | ~2% | early 2026 | Same CEC Data Centers page (Planning Forecast): “about 1,000 MW, or 2 percent of … California ISO’s peak electricity demand” | **Confirmed** — primary CEC wording; absolute MW cross-checked in methodology memo |

Forecast only (not current): CEC Planning Forecast projects ~4,500 MW / ~9% of peak by 2040 (same Data Centers page). Do not present as today’s share.

## Demand growth framing (CEC IEPR 2025 vs EIA national)

Site intro and StatBubbles cite the **CEC's** adopted demand forecast, not a projection from this project's model. Do not upgrade C6/C7/C8 on the strength of this framing.

| Metric | Value | Year / horizon | Source | Status |
|---|---|---|---|---|
| CEC demand forecast adoption | Adopted Jan 21, 2026 (CED 2025 / 2025 IEPR) | Forecast years 2025–2045 | [CED 2025 Demand Side Modeling](https://www.energy.ca.gov/data-reports/california-energy-planning-library/forecasts-and-system-planning/demand-side-3) | **Confirmed** — CEC primary page |
| Largest CAISO peak demand growth driver through 2045 | EV charging / transportation electrification (larger than AI data centers in the same forecast) | Through 2045 | Same CEC IEPR demand forecast (adopted Jan 21, 2026); secondary coverage (e.g. RTO Insider, E&E News) reporting the adopted finding | **Forecast citation (Moderate-Strong)** - cite as CEC finding; not this app's model |
| CAISO peak demand rise (high scenario) | **Up to ~61%** by ~2045, mostly from EVs | ~2045 high path | Same adopted CEC forecast as reported in secondary summaries of the high scenario; UI label locked as “Up to 61%” | **Forecast citation** — re-check exact high-scenario % against CED 2025 Peak Forecast tables before tightening precision |
| Data-center estimate upward revision (same forecast) | DC component revised upward shortly before adoption (early Jan 2026) | Pre-adoption update | CEC demand-side page lists “Updated Results for Data Centers, Known Loads…” (January 5, 2026 DAWG Presentation) | **Confirmed** — update noted on CEC page; state explicitly wherever EV-vs-DC is cited |
| National contrast (not CA peak) | Data centers “dominant driver of long-term U.S. electricity growth” | AEO2026 through 2050 | [EIA AEO2026](https://www.eia.gov/outlooks/aeo/); [press release Apr 8, 2026](https://www.eia.gov/pressroom/releases/press587.php) (exact primary wording) | **Confirmed** — national framing only |
| CA relative DC market-share decline (contrast) | Developers favor Texas/Southeast (power / interconnection) | Bloom Energy 2026 Data Center Power Report (Jan 2026) | Industry report; no approved primary PDF URL in this repo | **Methods-only** — do not put in StatBubbles until a primary URL is verified |

## EV / PHEV adoption, California

| Metric | Value | Year | Source | Status |
|---|---|---|---|---|
| EV (BEV) registrations | 1,256,600 | 2023 | AFDC vehicle-registration table | **Confirmed** — cross-checked against two AFDC pages |
| EV (BEV) registrations | 1,533,900 | 2024 | AFDC vehicle-registration table | **Confirmed** — read directly from live table |
| PHEV registrations | 410,700 | 2023 | AFDC vehicle-registration table | **Confirmed** |
| PHEV registrations | 447,100 | 2024 | AFDC vehicle-registration table | **Confirmed** |
| EV YoY growth | ~22% | 2023→2024 | Calculated from above | Derived, not independently sourced |
| Light-duty vehicle population (all fuels, on-road) | **29,657,259** | Data as of **2025-12-31** | CEC ZEV stats workbook `Vehicle_Population_Last_updated_04-28-2026_ada.xlsx` (County sheet sum; ZIP sheet cross-check identical). Dashboard: [Light-Duty Vehicle Population](https://www.energy.ca.gov/data-reports/energy-almanac/zero-emission-vehicle-and-infrastructure-statistics-collection/light). Download hub: [ZEV and Infrastructure Stats Data](https://www.energy.ca.gov/files/zev-and-infrastructure-stats-data). Raw file + county extract in `data/raw/`. | **Confirmed** — re-downloaded and re-summed 2026-07-22 (County and ZIP both 29,657,259 for Data Year 2025). File last updated April 28, 2026. |
| Implied AFDC plug-in share of CA LDV | ~6.68% | \(1{,}981{,}000 / 29{,}657{,}259\) | AFDC 2024 BEV+PHEV ÷ CEC 2025 LDV total | Derived (years differ by one; label in UI) |

Do **not** use DMV “all registered vehicles” (~36M) or Alliance/S&P LDV compilations as the adoption denominator.
## TOU rates, PG&E

| Metric | Value | Source | Status |
|---|---|---|---|
| EV2-A summer peak | 54¢/kWh | PG&E rate PDF, eff. 3/1/26 | **Confirmed** — fetched directly |
| EV2-A winter peak | 41¢/kWh | PG&E rate PDF, eff. 3/1/26 | **Confirmed** |
| EV-B summer peak | 62¢/kWh | PG&E rate PDF, eff. 3/1/26 | **Confirmed** |
| EV-B winter peak | 44¢/kWh | PG&E rate PDF, eff. 3/1/26 | **Confirmed** |
| Full rate tables | see DATA_SPEC.md §3 | PG&E rate PDF | **Confirmed** |

## EV grid impact studies (not independently verified)

| Metric | Value | Source | Status |
|---|---|---|---|
| Unmitigated peak contribution, 10M EVs by 2035 | ~4,500 MW | GridLab/Brattle, "California's Virtual Power Potential" (2024) | **Unverified** — cited by Perplexity, not independently checked |
| Managed/VPP potential by 2035 | ~1,600 MW | Same report | **Unverified** |

Do not present these two figures as confirmed in the demo. Fine to cite as "an industry estimate" with attribution, not as a validated benchmark.

## EV load shape

| Metric | Value | Source | Status |
|---|---|---|---|
| Statewide LD shape, all 6 season/day-type combos, 2024 | peak 11pm-1am, 17% of daily energy in 2 hrs; consistent across all 6 combos (16,000-16,100 MWh weekday, 11,100-11,200 MWh weekend) | CEC 2022 IEPR PEV Load Shapes file, `Data` sheet, direct read | **Confirmed** — real file, uploaded and parsed directly, full season/day-type table extracted |
| Location-specific (SF/MF/destination) shape | not publicly available in numeric form | CEC 2024 model deck (described only, not published) | **Confirmed absent** |
| Modeled EV daily energy (mid scenario, 27 mi/day, BEV+PHEV population) | 16,046 MWh/day | Calculated from AFDC 2024 combined count × real CEC shape | Derived |
| CEC's own implied daily total (Summer Weekday) | 16,055 MWh/day | Same CEC file, same source | **Confirmed** — direct read |
| **Cross-check: modeled vs. CEC's own total** | **1.00x** | Apples-to-apples, same source file, same year, same day-type | **Validated** — this replaces the earlier GridLab/Brattle comparison as the primary sanity check |
| Population correction that fixed the earlier mismatch | BEV-only undercounted vs. CEC's combined BEV+PHEV "PEV" figure | AFDC 2024, both confirmed | Using the wrong population was the main driver of an earlier apparent ~25-45% gap; not a flaw in the shape or mileage assumptions |
| GridLab/Brattle order-of-magnitude reference | ~690 MW (scaled) | Unverified source, 2035 scenario scaled to 2024 | **Deprecated as primary check** — kept for reference only, the CEC self-comparison above is stronger and apples-to-apples |

---

## How to use this document

Before any number goes into the demo or the build, check it against this table. If it's not here, or marked Unverified, verify it before using it, or say out loud in the demo that it's unverified. A room of engineers will respect "I checked this and here's what I could and couldn't confirm" more than a polished number with no visible sourcing.
