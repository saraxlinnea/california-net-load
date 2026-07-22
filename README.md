# California Net Load · EV load vs CAISO net load

California grid (CAISO duck/canyon curve) with a CEC EV charging overlay,
verified PG&E TOU rates, fuel mix / carbon intensity, and a simple per-car
cost calculator (year and month first).

## Frontend (quick start)

```bash
cd frontend
npm install
npm run sync-data   # copies data/processed into public/data
npm run dev         # http://localhost:5173/
```

Open the Vite URL. Opening `index.html` via `file://` will be blank.

Pages: `/` Adoption (home: fleet stress + generation pie), `/charge` (PG&E
costs), `/fuel`, `/storage`, `/compare`, `/methods` (Math + Citations).
`/adoption` redirects to `/`.

Shareable query (preserved across nav): `date`, `scenario`, `plan`, `mode`,
`cars`, `peak` (Compare day B), `adoption`, `participate`, and optional `scale`
(× today’s AFDC fleet). Example:
`/?date=2026-07-15&scenario=mid&plan=EV2-A&mode=cec&cars=1&peak=2025-08-21&adoption=0.0668&participate=0`.

## Deploy (Vercel or Netlify)

Root configs are included:

- **Vercel**: `vercel.json` builds `frontend/` → `frontend/dist`
- **Netlify**: `netlify.toml` uses `base = "frontend"`

Or connect the repo and set root directory to `frontend` (Vite).

```bash
# From repo root, after push to GitHub:
# Vercel: import the repo; Root Directory = frontend (or use root vercel.json)
# Netlify: import the repo; build settings come from netlify.toml
```

## Python pipeline

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# If SSL fails on macOS Python.org builds:
#   export SSL_CERT_FILE=$(python -c "import certifi; print(certifi.where())")

python pull_caiso_day.py 2026-07-15
python pull_caiso_day.py 2025-08-21
python pull_caiso_day.py 2025-04-18
python pull_caiso_day.py 2025-04-16
python pull_caiso_day.py 2025-01-13
python pull_caiso_day.py 2024-09-05
python ev_load_overlay.py data/processed/grid_timeseries_2026-07-15.csv
python ev_load_overlay.py data/processed/grid_timeseries_2025-08-21.csv
python ev_load_overlay.py data/processed/grid_timeseries_2025-04-18.csv
python ev_load_overlay.py data/processed/grid_timeseries_2025-04-16.csv
python ev_load_overlay.py data/processed/grid_timeseries_2025-01-13.csv
python ev_load_overlay.py data/processed/grid_timeseries_2024-09-05.csv
```

Available processed days (6): 2024-09-05, 2025-01-13, 2025-04-16,
2025-04-18, 2025-08-21, 2026-07-15. Hourly peaks and roles are in
`DATA_SPEC.md`.

## Calculator honesty

- Territory costs: **PG&E only** (SCE/SDG&E stubbed until verified rates are pasted).
- Schedules: unmanaged CEC, midday solar DR, or off-peak rates only.
- Same daily kWh per car; not a utility bill. See `SIMPLIFIED_MODEL` in the UI.

## Screenshots

No checked-in marketing screenshots yet. Local pipeline PNGs (`ev_overlay_*.png`)
are gitignored plot outputs, not UI captures. Add real app screenshots here
when you have them.

See `DATA_SPEC.md`, `BENCHMARKS.md`, `MATH.md`, `AGENTS.md`, and `HANDOFF.md`.
