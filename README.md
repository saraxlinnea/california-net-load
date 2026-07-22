# California Net Load

I built this to explore a simple question: as California adds more EVs, is the hard part *how much* energy they use, or *when* they charge?

On real CAISO days you can see the duck-curve shape (net load), overlay a CEC home-charging profile, scale the fleet, and shift a share of charging into midday. The same shift shows up two ways: how the evening ramp looks on the grid, and what simplified PG&E EV energy costs do on a per-car basis.

**Live demo:** https://saraxlinnea.github.io/california-net-load/

## What’s in it

- **Adoption** — grow the plug-in fleet, shift charging to midday, watch net load + EV on one CAISO day
- **Cost** — PG&E EV2-A / EV-B schedule costs ($/car·year and month). Energy charges only; PG&E territory only
- **Compare** — side-by-side grid days (spring belly vs peak, and other library days)
- **Methods** — formulas and Confirmed vs Unverified sources

I care about not overclaiming. Managed charging impacts are labeled illustrative. Retail TOU windows are not the same clock as CAISO system peaks.

## Run locally

```bash
cd frontend
npm install
npm run sync-data
npm run dev
```

Open the URL Vite prints (path includes `/california-net-load/` for GitHub Pages).

```bash
npm run build
npm run preview   # http://localhost:4173/california-net-load/
```

Opening `index.html` via `file://` will be blank.

## Data and sources

Processed CAISO days ship in the repo so the demo runs without a live pull. Dig into:

- `BENCHMARKS.md` — figures and verification status
- `DATA_SPEC.md` — schemas and primary sources
- `MATH.md` — formulas behind the charts and costs
- `CLAIMS.md` — claim strength labels (C1–C9)

## GitHub Pages

Public host: https://saraxlinnea.github.io/california-net-load/

Repo Settings → Pages → Source: **GitHub Actions**. The workflow builds `frontend/` on push to `main`.

## Optional: refresh CAISO days

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# If SSL fails on macOS: export SSL_CERT_FILE=$(python -c "import certifi; print(certifi.where())")

python pull_caiso_day.py YYYY-MM-DD
python ev_load_overlay.py data/processed/grid_timeseries_YYYY-MM-DD.csv
cd frontend && npm run sync-data
```
