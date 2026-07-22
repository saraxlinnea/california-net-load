#!/usr/bin/env node
import { cpSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const src = join(root, "data/processed");
const dest = join(root, "frontend/public/data");

mkdirSync(dest, { recursive: true });
for (const name of readdirSync(src)) {
  if (name.endsWith(".csv") || name.endsWith(".json")) {
    cpSync(join(src, name), join(dest, name));
  }
}

const days = readdirSync(src)
  .filter((n) => n.startsWith("ev_timeseries_") && n.endsWith(".csv"))
  .map((n) => n.replace("ev_timeseries_", "").replace(".csv", ""))
  .sort();

const labels = {
  "2024-09-05": "2024-09-05 · CAISO 2024 peak day (~48.3 GW)",
  "2025-01-13":
    "2025-01-13 · winter weekday (milder belly; hourly peak ~27.2 GW)",
  "2025-04-16": "2025-04-16 · spring weekday (hourly peak ~27.2 GW)",
  "2025-04-18":
    "2025-04-18 · spring belly weekday (deepest net-load trough in library)",
  "2025-08-21": "2025-08-21 · CAISO 2025 peak day (~44.5 GW)",
  "2026-07-15": "2026-07-15 · summer weekday (hourly peak ~43.4 GW)",
};

const manifest = days.map((date) => ({
  date,
  label: labels[date] ?? date,
}));

writeFileSync(join(dest, "available_days.json"), JSON.stringify(manifest, null, 2));
writeFileSync(join(src, "available_days.json"), JSON.stringify(manifest, null, 2));
console.log(`Synced ${days.length} day(s) → public/data`);
