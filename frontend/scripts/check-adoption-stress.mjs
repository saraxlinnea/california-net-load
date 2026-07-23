/**
 * Lightweight checks for adoption stress math (MATH.md §3b).
 * Run from frontend/:  node scripts/check-adoption-stress.mjs
 *
 * Validates mid + N_0 daily EV energy against processed CSV (~16,581 MWh at 27.9 mi/day)
 * and a few fleet / mix identities that mirror adoptionStress.ts.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");

const N0 = 1_981_000;
const N_LDV = 29_657_259;
const MILES_MID = 27.9;
const KWH_PER_MI = 0.3;
const EXPECTED_MID_MWH = (N0 * MILES_MID * KWH_PER_MI) / 1000; // ~16580.97

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL  ${msg}`);
    failed += 1;
  } else {
    console.log(`ok    ${msg}`);
  }
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      const v = cols[i];
      row[h] = v !== undefined && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : v;
    });
    return row;
  });
}

function sum(xs) {
  return xs.reduce((a, b) => a + b, 0);
}

function mixEvLoads(cec, optimized, p) {
  const q = Math.min(1, Math.max(0, p));
  return cec.map((c, i) => (1 - q) * c + q * optimized[i]);
}

function fleetFromAdoption(a) {
  return a * N_LDV;
}

function fleetFromScale(s) {
  return s * N0;
}

// --- constants / formula ---
assert(
  Math.abs(EXPECTED_MID_MWH - 16_580.97) < 0.01,
  `N_0·m·k/1000 = ${EXPECTED_MID_MWH} (≈ 16,581 MWh at 27.9 mi/day)`,
);

const a0 = N0 / N_LDV;
assert(
  a0 > 0.066 && a0 < 0.067,
  `a_0 = N_0/N_LDV ≈ ${(100 * a0).toFixed(2)}%`,
);

assert(fleetFromAdoption(1) === N_LDV, "fleetFromAdoption(1) = N_LDV");
assert(fleetFromScale(1) === N0, "fleetFromScale(1) = N_0");
assert(fleetFromScale(2) === 2 * N0, "fleetFromScale(2) = 2·N_0");

// --- CSV mid energy at N_0 ---
const csvPath = join(root, "data/processed/ev_timeseries_2026-07-15.csv");
const rows = parseCsv(readFileSync(csvPath, "utf8"));
const midMwh = sum(rows.map((r) => r.ev_load_MW_mid));
assert(
  Math.abs(midMwh - EXPECTED_MID_MWH) < 0.5,
  `CSV mid EV daily energy ${midMwh.toFixed(1)} MWh ≈ formula ${EXPECTED_MID_MWH}`,
);

// Scale identity: 2× fleet → 2× energy
const scaled = midMwh * (fleetFromScale(2) / N0);
assert(
  Math.abs(scaled - 2 * midMwh) < 1e-9,
  "scale s=2 doubles mid EV daily energy",
);

// Mix conserves daily energy
const cec = rows.map((r) => r.ev_load_MW_mid);
const optimized = [...cec].reverse(); // same sum, different shape
const mixed = mixEvLoads(cec, optimized, 0.4);
assert(
  Math.abs(sum(mixed) - sum(cec)) < 1e-6,
  "mix p=0.4 conserves daily EV energy",
);
assert(
  Math.abs(sum(mixEvLoads(cec, optimized, 0)) - sum(cec)) < 1e-9,
  "mix p=0 equals CEC energy",
);
assert(
  Math.abs(sum(mixEvLoads(cec, optimized, 1)) - sum(optimized)) < 1e-9,
  "mix p=1 equals optimized energy",
);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll adoption-stress checks passed.");
