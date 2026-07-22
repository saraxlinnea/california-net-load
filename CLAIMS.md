# CLAIMS.md

Locked claim strength labels for the duck-curve viewer.
Do not upgrade a label without new primary evidence.

Strength scale (Strong → Speculative), AI-OS-style:

| Strength | Meaning here |
|----------|----------------|
| **Strong** | Primary source or definitional identity; cross-checked where noted |
| **Moderate** | Verified inputs with known model simplifications or year mismatch |
| **Weak** | Back-of-envelope or conditional on heavy assumptions |
| **Weak / Speculative** | Illustrative model behavior, not a real program or procurement study |

**UI rule:** Strong / Moderate may appear as plain metrics. Weak / Speculative must say “illustrative,” “stress test,” or show a claim id.

---

## Locked claims (C1–C9)

| ID | Claim | Label | Evidence |
|----|--------|--------|----------|
| **C1** | This day’s CAISO net load = load − solar − wind | **Strong** | Processed CAISO CSV; `MATH.md`; `DATA_SPEC.md` |
| **C2** | Mid AFDC fleet + CEC shape ≈ ~16 GWh/day | **Strong** | `BENCHMARKS.md`; `frontend/scripts/check-adoption-stress.mjs` |
| **C3** | \(N_{\text{LDV}} = 29{,}657{,}259\) as of 2025-12-31 | **Strong** | CEC workbook sum; `BENCHMARKS.md`; `provenance.ts` |
| **C4** | Today’s plug-in share ≈ \(N_0 / N_{\text{LDV}}\) (~6.7%) | **Moderate** | AFDC \(N_0\) vs CEC LDV stock years differ; `BENCHMARKS.md` |
| **C5** | PG&E EV schedule cost on one season day | **Moderate** | Verified TOU PDF → `tou_rates_pge.csv`; simplified bill model; `MATH.md` |
| **C6** | Linear scale to 50%/100% LDV shows order-of-magnitude MW / % of day energy | **Weak as forecast; Strong as stress arithmetic** | `adoptionStress.ts`; `MATH.md` §3b; honesty copy on `/` |
| **C7** | Managed participation \(p\) reduces evening ramp in this model | **Weak / Speculative** | Illustrative DR mix; not a real program; `MATH.md` §3b |
| **C8** | BESS flatten MW / MWh | **Weak** | `storageSizing.ts`; back-of-envelope; Storage page caveat |
| **C9** | Stack CI lb/MWh | **Moderate** | Fuel mix CSV + cited EFs; import/EF caveats in `fuelTypes.ts` / `provenance.ts` |

Related (not a separate C-id): day generation mix pie on `/` sums CAISO fuel-mix MW as MWh (**Strong** as sourced generation-by-fuel). CEC data-center **peak demand share** (~1,000 MW / ~2% of CAISO peak, early 2026) is **Confirmed** in `BENCHMARKS.md` and `provenance.ts` (`PROVENANCE.dataCenters`). That figure is peak share of system peak, **not** annual end-use energy share. End-use / generation-mix pie slices (homes, data centers, industry) remain **out of scope** on the fuel-mix donut (would misrepresent CAISO generation-by-fuel).

---

## Live UI map by route

### `/` Adoption (home)

| UI element | Claim | Label shown |
|------------|--------|-------------|
| Net load + EV chart (default UI) | C1 + C6/C7 stress | Strong grid; Weak as forecast / Strong as arithmetic; C7 illustrative |
| Fleet presets / today % LDV | C3, C4 | Strong / Moderate |
| Peak EV + ramp relief key stats | C6, C7 | Stress arithmetic; Weak / Speculative for relief |
| Shift bridge callout | C7 and C5 as separate labeled blocks | Illustrative grid · Moderate cost · Methods |
| ACC II note near fleet presets | Policy context | Sales share ≠ fleet share; stress presets |
| DC peak-share bars (today / 2040 / EV stress) | CEC Confirmed + C6 EV bar | Peak MW share, not pie / not annual energy |
| Generation donut / EV-vs-BESS / ladder | (parked) | Not in default LinkedIn UI; see `local/linkedin-wip.md` |

### `/charge` (PG&E costs)

| UI element | Claim | Label |
|------------|--------|--------|
| Three-clocks callout (ramp / CEC EV / TOU ≠ CAISO) | C1 + timing | Strong ramp; Moderate TOU framing |
| Duck / net load chart | C1 | Strong |
| CEC / midday / off-peak schedule costs | C5 | Moderate |
| $/car·year and $/car·month | C5 + annualization caveat | Moderate; illustrative annualization |

### `/fuel`

| UI element | Claim | Label |
|------------|--------|--------|
| Fuel-mix stack | CAISO fuel CSV | Strong (sourced) |
| Operational CI line | C9 | Moderate |

### `/storage`

| UI element | Claim | Label |
|------------|--------|--------|
| Power / energy / duration to flatten | C8 | Weak |

### `/compare`

| UI element | Claim | Label |
|------------|--------|--------|
| Side-by-side net load / EV overlay | C1 (+ overlay scale) | Strong grid; EV overlay same as Charge/Adoption assumptions |
| Day comparison cards (peak / min net / ramp) | C1 | Strong for each day’s CSV |
| BESS flatten deltas | (demoted) | Not Compare headline; Storage route only (C8 Weak) |

---

## Upgrade rules

- Do not promote C6/C7/C8 without new evidence (real DR program data, interconnection study, or verified BESS sizing method).
- Do not add data-center or other end-use slices to the CAISO **generation-mix** pie: fuel mix is generation by fuel. A separate, correctly labeled peak-share callout may use `PROVENANCE.dataCenters` (Confirmed); do not treat that peak share as annual energy or as a fuel-mix slice.
- Do not cite GridLab/Brattle (~4,500 / ~1,600 MW) as confirmed.
