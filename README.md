# California Net Load · EV load vs CAISO net load

California grid (CAISO duck/canyon curve) with a CEC EV charging overlay,
verified PG&E TOU rates, and a simple PG&E-only per-car cost calculator
(year and month first).

## Frontend (quick start)

```bash
cd frontend
npm install
npm run sync-data   # copies data/processed into public/data
npm run dev         # open the URL Vite prints (includes /california-net-load/)
```

Vite `base` is `/california-net-load/` for GitHub Pages. Local dev and preview
use the same base; open the path Vite prints (not bare `/`).

```bash
cd frontend
npm run build
npm run preview     # http://localhost:4173/california-net-load/
```

Opening `index.html` via `file://` will be blank.

Primary nav: `/` Adoption, `/charge` Cost, `/compare`, `/methods`.
`/fuel` and `/storage` exist but are unlinked from primary nav.
`/adoption` redirects to `/`.

Shareable query (preserved across nav): `date`, `scenario`, `plan`, `mode`,
`cars`, `peak` (Compare day B), `adoption`, `participate`, and optional `scale`
(× today’s AFDC fleet). Example:
`/?date=2025-04-18&scenario=mid&plan=EV2-A&mode=managed&cars=1&peak=2025-08-21&adoption=0.5&participate=0.5&scale=7.485426`

## GitHub Pages (primary public host)

Expected URL: **https://saraxlinnea.github.io/california-net-load/**

Repo should be named `california-net-load` under user `saraxlinnea` (local
folder may still be `duck-curve`; rename/remote is separate from this pass).

### Enable once (Settings)

1. Open the GitHub repo → **Settings** → **Pages**
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**
3. Push (or re-run) the workflow on `main` (`.github/workflows/pages.yml`)

Push is manual / user-triggered; this pass does not push for you.
Vercel/Netlify are optional and not required for Pages hosting.

## Optional: Vercel or Netlify

Root configs still exist for other hosts (`vercel.json`, `netlify.toml`) but
are not required when using GitHub Pages.

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
when you have them (required before adding `og:image`).

See `DATA_SPEC.md`, `BENCHMARKS.md`, `MATH.md`, `AGENTS.md`, and `HANDOFF.md`.
