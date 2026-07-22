# DATA_SPEC.md
EV Load vs. Duck Curve Viewer — California
Last updated: July 22, 2026

## Status

Phase 1 (ground truth) is substantially complete. Grid data mechanics, EV registration counts, and TOU rates are confirmed from primary sources. EV load shape (hourly charging distribution) is the one open item, see Section 5.

---

## 1. Grid data (CAISO)

**Source:** CAISO OASIS, accessed via the `gridstatus` Python library.

**Confirmed methods** (verified against `gridstatus` source code):

```python
import gridstatus
caiso = gridstatus.CAISO()

load_5min = caiso.get_load("2025-07-15")       # 5-min system demand
fuel_5min = caiso.get_fuel_mix("2025-07-15")    # 5-min generation by fuel type
```

**`get_load()` returns:**
- `Time`, `Interval Start`, `Interval End` — datetime, timezone-aware, `US/Pacific`
- `Load` — float, MW

**`get_fuel_mix()` returns:**
- `Time`, `Interval Start`, `Interval End` — `US/Pacific`
- One column per fuel type, MW: `Solar`, `Wind`, `Geothermal`, `Biomass`, `Biogas`, `Small Hydro`, `Natural Gas`, `Large Hydro`, `Nuclear`, `Imports`, `Batteries`

**Derived field:** `net_load_MW = Load - Solar - Wind`

**Frequency:** native 5-minute; resample to hourly with `.resample("h").mean()`.

**Fallback (raw OASIS, untested end-to-end):** `GroupZip` endpoint, `queryname=SLD_FCST`, `market_run_id=ACTUAL`. Times returned in UTC (`_GMT` suffix columns), requires manual conversion to Pacific. Use `gridstatus` as primary; treat this as backup only, verify before relying on it.

**Cross-check source:** EIA Hourly Electric Grid Monitor, hourly demand/generation by balancing authority including CAISO, for spot-checking `gridstatus` output.

---

## 2. EV & PHEV registrations (AFDC)

**Source:** `afdc.energy.gov/vehicle-registration` (interactive table, year selector). No public API for this dataset — confirmed against `developer.nlr.gov/docs/transportation`, which does not expose registration counts.

**Confirmed values, California:**

| Year | EV (BEV) | PHEV | Combined plug-in |
|---|---|---|---|
| 2023 | 1,256,600 | 410,700 | 1,667,300 |
| 2024 | 1,533,900 | 447,100 | 1,981,000 |

YoY growth: EV +22%, PHEV +9%, combined +19%.

**Notes:**
- Counts rounded to nearest 100, VIN-based fuel type from Experian data via NREL.
- No documented API. Access is manual table read or CSV download from `afdc.energy.gov/data_download`.
- Separate widget dataset (`afdc.energy.gov/data/10962`) exists but is EV-only, no PHEV split, and was last confirmed at the 2023 snapshot (1,256,646, matches table above to rounding).
- Alternative/supplementary source: Atlas EV Hub state registration data — coverage is opt-in by state, confirm California participates before relying on it.

---

## 3. TOU rate data (PG&E)

**Source:** PG&E "Residential rate plan pricing" PDF, confirmed live, effective March 1, 2026.
`https://www.pge.com/assets/pge/docs/account/rate-plans/residential-electric-rate-plan-pricing.pdf`

Not in URDB as a current record — the only URDB PG&E EV entry is the superseded EV-A plan (2019–2021). Use the PG&E PDF as ground truth, not URDB, for this plan.

**EV2-A (Home Charging), all days:**

| Period | Hours | Summer (Jun 1–Sep 30) | Winter (Oct 1–May 31) |
|---|---|---|---|
| Off-Peak | 12 a.m.–3 p.m. | 23¢/kWh | 23¢/kWh |
| Partial-Peak | 3–4 p.m. & 9 p.m.–12 a.m. | 43¢/kWh | 39¢/kWh |
| Peak | 4–9 p.m. | 54¢/kWh | 41¢/kWh |

**EV-B, all days:**

| Period | Hours | Summer | Winter |
|---|---|---|---|
| Off-Peak | 11 p.m.–7 a.m. | 26¢/kWh | 24¢/kWh |
| Partial-Peak | 7 a.m.–2 p.m. & 9–11 p.m. | 38¢/kWh | 31¢/kWh |
| Peak | 2–9 p.m. | 62¢/kWh | 44¢/kWh |

Note: EV-B's off-peak window is overnight rather than midday — a meaningfully different shape than EV2-A, closer to what depot/fleet charging would actually use. Worth keeping both plans in the calculator rather than defaulting to EV2-A alone.

PG&E's own disclaimer: pricing rounded to the nearest cent, may not reflect the most recent tariff changes. Re-verify before any long-lived deployment.

---

## 4. Peak load benchmarks (CAISO)

Confirmed directly from CAISO's Peak Load History PDF:

| Year | Peak load | Date/time |
|---|---|---|
| 2024 | 48,323 MW | Sept 5, 16:59 |
| 2025 | 44,506 MW | Aug 21, 18:07 |

All-time CAISO record: 52,061 MW, September 2022 (for context, not in original Perplexity output).

---

## 5. EV load shape — RESOLVED

**Source:** CEC 2022 IEPR PEV Load Shapes file, `Data` sheet (18,720 rows). Uploaded and read directly, July 17, 2026.

**What it actually contains:** hourly MW by utility region (LADWP, PGE, SCE, SDGE, SMUD), year (2023–2035), season, day type, and duty (LD vs MDHD). This is real, granular underlying data, not just the aggregated pivot table Perplexity described earlier.

**What was built:** statewide light-duty (LD) charging shape, Year 2024, Summer, Weekday, summed across all 5 utility regions and normalized to a 24-hour percentage distribution. File: `data/processed/ev_load_shape_cec_2024_summer_weekday.csv`.

**Key finding, worth noting explicitly:** the real shape peaks late night, 11 p.m.–1 a.m. (accounts for ~17% of daily energy across just those two hours), not at evening arrival as commonly assumed. Consistent with delayed-start TOU charging behavior. This replaced an earlier illustrative shape used during development that assumed an evening-arrival peak — that shape is deprecated, do not use it.

**Confirmed limitation, unchanged from before:** this is an aggregate across all light-duty charging locations (home, workplace, public) combined. CEC does not publish a single-family/multi-family/destination breakdown anywhere — confirmed absent via direct search, not just unfound. If a reply to the CEC email ever provides this, it can replace the aggregate shape, but the aggregate is real, sourced data and does not need to be treated as a stopgap.

**Coverage caveat:** the 5 utility regions in this file (LADWP, PGE, SCE, SDGE, SMUD) cover the large majority of California load but not literally all of it (smaller munis and co-ops are excluded). Fine to describe as "statewide" informally, worth the caveat if precision matters.

---

## 6. File schema (for build)

```
data/
  processed/
    grid_timeseries_YYYY-MM-DD.csv     # Time, load_MW, solar_MW, wind_MW, net_load_MW, source, as_of_date
    fuel_mix_YYYY-MM-DD.csv            # Time + full CAISO fuelsource columns (MW); Batteries signed
    emission_factors.csv               # fuel, lb_co2_per_mwh, include_in_ci, source, notes
    ev_timeseries_YYYY-MM-DD.csv       # grid cols + hour + ev_load_MW_{low,mid,high} + net_load_plus_ev_MW_*
    ev_load_shapes_cec_2024_all.csv    # season, day_type, hour, share, raw_mw (all 6 combos)
    tou_rates_pge.csv                  # plan, season, period, start_hour, end_hour, rate_cents_kwh, source, as_of_date
    available_days.json                # manifest for the frontend day picker
```

### Available processed days (frontend picker)

Built via `pull_caiso_day.py` + `ev_load_overlay.py`, then `npm run sync-data`.
Hourly peaks below are from `grid_timeseries_*.csv` (CA ISO-TAC). Published
instantaneous peaks (where cited) are from CAISO Peak Load History PDF
(`BENCHMARKS.md`).

| Date | Role | Hourly peak load | Notes |
|---|---|---|---|
| 2024-09-05 | 2024 annual peak day | 47,759 MW | Sanity PASS vs published 48,323 MW |
| 2025-01-13 | Winter weekday | 27,197 MW | Milder midday belly (hourly min net ~6.2 GW); lower solar than spring; shape contrast for Compare |
| 2025-04-16 | Mild / spring weekday | 27,246 MW | Deep midday net-load belly (hourly min net ~1.5 GW) |
| 2025-04-18 | Spring belly weekday | 26,561 MW | Chosen over 2025-04-16 after comparing 2025-04-14…18 and 2025-03-24…27 weekdays; deepest hourly min net in library (~0.54 GW) with high wind; CAISO Apr 2025 Key Statistics note high spring solar context |
| 2025-08-21 | 2025 annual peak day | 43,921 MW | Sanity PASS vs published 44,506 MW |
| 2026-07-15 | Summer weekday | 43,429 MW | Default share `date` |

All static files should carry a `source` and `as_of_date` field or header comment. No unlabeled numbers.
