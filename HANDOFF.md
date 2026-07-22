# HANDOFF.md
California Net Load · EV load vs CAISO net load · status as of July 22, 2026

## What this project is

California Net Load: a California grid visualization (CAISO net load / duck-curve
shape) with an EV charging overlay, built on real, sourced data. Phases A–F are
in place for a shippable viewer plus an honest PG&E-only cost calculator.

## Read these first

- `DATA_SPEC.md` · full data schema, sources, confirmed API calls
- `BENCHMARKS.md` · every number used, with source and verification status
- `CLAIMS.md` · locked C1–C9 strength labels + live UI map
- `MATH.md` · formulas behind the charts and cost cards
- `AGENTS.md` · rules for humans and coding agents
- `README.md` · run order for Python pipeline, frontend, and deploy

## What's built and working

1. `pull_caiso_day.py` · CAISO day (CA ISO-TAC), fuel mix, peak-day sanity check
2. `plot_duck_curve.py` / `ev_load_overlay.py` · static PNG pipeline
3. `data/processed/tou_rates_pge.csv` · PG&E EV2-A and EV-B (re-verified 2026-07-20 PASS)
4. `frontend/` · React + Plotly, multi-page nav:
   - `/` Adoption (home) · product thesis: shift charging to ease evening
     ramp strain; bills can align on PG&E. Shared shift bridge (ramp relief +
     $/car savings); “Show the shift” preset; Pages guide after first chart
   - `/charge` (nav: Cost) · shift schedules for PG&E $/car; same bridge
     callout; points to Adoption for ramp
   - `/fuel` · fuel-mix stack + CI + midday/evening share bars
   - `/storage` · flatten estimate cards + charge/discharge path chart
   - `/compare` · side-by-side days with Δ peak / min net / ramp / BESS
   - `/methods` · Math + Citations (formulas, Confirmed vs Unverified)
   - `/adoption` redirects to `/`
   - Layout footer: verified-as-of + Methods link; `index.html` share meta
     (OG/Twitter summary; no og:image until a checked-in asset exists)
   - Per-car cost with **$/year and $/month** primary; PG&E PDF + EV plan links
   - Territory costs = PG&E only (SCE/SDG&E not verified)
   - Shared URL state via `shareState.ts`: `date`, `scenario`, `plan`, `mode`,
     `cars`, `peak`, `adoption`, `participate`, optional `scale`
     (nav preserves the full share query)
   - Processed CAISO days in picker (see `DATA_SPEC.md`): 2024-09-05,
     2025-01-13 (winter), 2025-04-16, 2025-04-18 (deep spring belly),
     2025-08-21, 2026-07-15
5. Deploy configs: root `vercel.json`, `netlify.toml`, `frontend/vercel.json`
6. Adoption stress-test denominator frozen: CEC LDV on-road stock
   \(N_{\text{LDV}} = 29{,}657{,}259\) (data as of 2025-12-31; verified 2026-07-22).
   AFDC baseline \(N_0 = 1{,}981{,}000\). Math in `adoptionStress.ts`.
   Claim labels C1–C9 in `CLAIMS.md`; Adoption metrics and EV-vs-BESS strip
   show claim ids lightly in the UI.
7. Data centers: Confirmed CEC peak-share (~1,000 MW / ~2% of CAISO peak,
   early 2026) in `BENCHMARKS.md` + `provenance.ts`. Generation pie / end-use
   slices stay blocked (peak MW share ≠ fuel-mix or end-use energy).

## Suggested next steps

1. Push to GitHub and connect Vercel or Netlify when you want a public URL
2. Paste verified SCE/SDG&E rates before enabling those territories
3. Optional: more days via `python pull_caiso_range.py START END`
4. `/methods` cites CEC data-center peak share (`PROVENANCE.dataCenters`).
   A data-center slice on the generation-mix pie remains blocked (wrong
   quantity); optional unlock is a separate peak-share callout only.

## Ground rules

- Every number in the UI needs a visible source or an explicit "illustrative
  assumption" label.
- Prefer showing genuine uncertainty (a range, a caveat) over a single
  falsely-precise number.
- No em dashes in user-facing copy.
