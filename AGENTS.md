# AGENTS.md

Guidance for humans and coding agents working on this repo.

## What this project is

California Net Load: a California (CAISO) net-load viewer (duck-curve shape)
with a real CEC EV charging overlay and PG&E EV TOU rates. Portfolio / demo
quality: every number needs a source or an explicit “illustrative” label.

Shippable multi-page viewer plus an honest PG&E-only per-car cost calculator
(year and month primary). Phases A–F product scope is in place.

## Read first

1. `DATA_SPEC.md` · schemas and primary sources
2. `BENCHMARKS.md` · confirmed vs unverified figures
3. `CLAIMS.md` · locked C1–C9 strength labels + UI map
4. `MATH.md` · formulas behind the UI
5. `README.md` · run order (Python pipeline → frontend)
6. `HANDOFF.md` · current routes and status

## Hard rules

- Do **not** invent rates, registration counts, emission factors, or peaks.
- Do **not** present GridLab/Brattle (~4,500 / ~1,600 MW) as confirmed.
- Prefer primary sources (CAISO, CEC file, AFDC table, PG&E PDF) over summaries.
- Prefer ranges / caveats over false precision.
- Keep edits minimal and localized; update docs when behavior or numbers change.
- Do not commit secrets (`.env`). Prefer committing `data/processed/*.csv` so
  the demo runs without a live CAISO pull.
- Do not commit, push, or deploy unless the user explicitly asks.

## Pipeline order

```bash
python pull_caiso_day.py YYYY-MM-DD
python ev_load_overlay.py data/processed/grid_timeseries_YYYY-MM-DD.csv
cd frontend && npm run sync-data && npm run dev
```

If CAISO HTTPS fails on macOS Python.org builds:

```bash
export SSL_CERT_FILE=$(python -c "import certifi; print(certifi.where())")
```

## Frontend conventions

- Multi-page: `/` Adoption (home), `/charge` PG&E costs, `/fuel`, `/storage`,
  `/compare`, `/methods` (Math + Citations).
- Shareable query params (`date`, `scenario`, `plan`, `mode`, `cars`, `peak`,
  `adoption`, `participate`, optional `scale`)
  live in `frontend/src/shareState.ts`; Layout preserves the full share query.
- Chart renewables fill the **net↔total gap** (not from zero).
- Provenance / “verified as of” lives in `frontend/src/provenance.ts`.
- After changing TOU rates, re-fetch the PG&E PDF and update
  `tou_rates_pge.csv` + `provenance.ts` together.
- Territory costs: PG&E only until SCE/SDG&E rates are verified and pasted.

## GitHub hygiene

- Ignore `.venv/`, `.cursor/`, `node_modules/`, `frontend/dist/`, local PNGs, `.env`.
- Keep processed CSVs and docs in version control.
- Do not force-push `main` / `master`.

## Out of scope until planned

- Enabling SCE/SDG&E costs before verified rates exist
- Replacing Plotly solely for bundle size (acceptable debt until public deploy needs it)
