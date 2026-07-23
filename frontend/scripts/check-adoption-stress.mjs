/**
 * Lightweight checks for adoption stress math (MATH.md §3b).
 * Run from frontend/:  node scripts/check-adoption-stress.mjs
 *
 * Validates mid + N_0 daily EV energy against processed CSV (~16,581 MWh at 27.9 mi/day)
 * and a few fleet / mix identities that mirror adoptionStress.ts.
 * Also checks fixed-window ramp relief (grid-only belly/peak hours).
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

function hourFromTime(t) {
  const m = String(t).match(/[ T](\d{2}):/);
  return m ? Number(m[1]) : -1;
}

/** Mirror findEveningRampAnchors: belly 9–16, peak at/after belly. */
function findAnchors(net, hours) {
  let bellyI = -1;
  let bellyV = Infinity;
  for (let i = 0; i < hours.length; i++) {
    if (hours[i] >= 9 && hours[i] <= 16 && net[i] < bellyV) {
      bellyV = net[i];
      bellyI = i;
    }
  }
  if (bellyI < 0) return null;
  let peakI = bellyI;
  let peakV = net[bellyI];
  for (let i = 0; i < hours.length; i++) {
    if (hours[i] >= hours[bellyI] && net[i] > peakV) {
      peakV = net[i];
      peakI = i;
    }
  }
  const dh = hours[peakI] - hours[bellyI];
  if (dh <= 0) return null;
  return { bellyH: hours[bellyI], peakH: hours[peakI], hours: dh };
}

function rateAtAnchors(net, hours, anchors) {
  const bi = hours.indexOf(anchors.bellyH);
  const pi = hours.indexOf(anchors.peakH);
  if (bi < 0 || pi < 0) return null;
  return (net[pi] - net[bi]) / anchors.hours;
}

function redistributeToLowestNet(total, netSeries) {
  const netMax = Math.max(...netSeries);
  const weights = netSeries.map((n) => Math.max(netMax - n, 0) + 1e-6);
  const wSum = sum(weights);
  return weights.map((w) => (total * w) / wSum);
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

const scaled = midMwh * (fleetFromScale(2) / N0);
assert(
  Math.abs(scaled - 2 * midMwh) < 1e-9,
  "scale s=2 doubles mid EV daily energy",
);

const cec = rows.map((r) => r.ev_load_MW_mid);
const optimized = [...cec].reverse();
assert(
  Math.abs(sum(mixEvLoads(cec, optimized, 0.4)) - sum(cec)) < 1e-6,
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

// --- Fixed-window ramp relief (grid-only anchors) ---
const hours = rows.map((r) =>
  typeof r.hour === "number" ? r.hour : hourFromTime(r.Time),
);
const gridNet = rows.map((r) => r.net_load_MW);
const anchors = findAnchors(gridNet, hours);
assert(anchors != null, "grid-only evening ramp anchors exist");

// --- EV-removed baseline: unmanaged and mix share daily energy E(N) ---
const netClean = gridNet.map((n, i) => n - cec[i]);
const factor = N_LDV / N0;
const cecFull = cec.map((v) => v * factor);
const optFull = redistributeToLowestNet(
  sum(cecFull),
  netClean.map((n, i) => n + cecFull[i]),
);
const mixFull = mixEvLoads(cecFull, optFull, 0.5);

assert(
  Math.abs(sum(cecFull) - sum(mixFull)) < 1e-6,
  "unmanaged and mix conserve the same daily EV energy E(N)",
);

const unmanagedFull = netClean.map((n, i) => n + cecFull[i]);
const mixNetFull = netClean.map((n, i) => n + mixFull[i]);
assert(
  Math.abs(sum(unmanagedFull.map((v, i) => v - netClean[i])) - sum(cecFull)) <
    1e-6 &&
    Math.abs(sum(mixNetFull.map((v, i) => v - netClean[i])) - sum(mixFull)) <
      1e-6,
  "both net lines add the same fleet energy onto EV-removed baseline",
);

// At N = N0, clean + CEC recovers historical net
const recoverN0 = netClean.map((n, i) => n + cec[i]);
assert(
  recoverN0.every((v, i) => Math.abs(v - gridNet[i]) < 1e-9),
  "at N=N0 unmanaged, net_clean + cec(N0) recovers historical net",
);

const rateU0 = rateAtAnchors(
  netClean.map((n, i) => n + cec[i]),
  hours,
  anchors,
);
assert(
  rateU0 != null && Number.isFinite(rateU0),
  "p=0: fixed-window unmanaged rate is finite",
);

const rateU = rateAtAnchors(unmanagedFull, hours, anchors);
const rateM = rateAtAnchors(mixNetFull, hours, anchors);
assert(rateU != null && rateM != null, "fixed-window rates at large fleet");

assert(
  anchors.bellyH === findAnchors(gridNet, hours).bellyH &&
    anchors.peakH === findAnchors(gridNet, hours).peakH,
  `fixed anchors stay on grid hours (${anchors.bellyH}→${anchors.peakH})`,
);

const ownUnmanaged = findAnchors(unmanagedFull, hours);
const ownMix = findAnchors(mixNetFull, hours);
const windowsDiffer =
  ownUnmanaged != null &&
  ownMix != null &&
  (ownUnmanaged.peakH !== anchors.peakH ||
    ownUnmanaged.bellyH !== anchors.bellyH ||
    ownMix.peakH !== anchors.peakH ||
    ownMix.bellyH !== anchors.bellyH ||
    ownUnmanaged.peakH !== ownMix.peakH ||
    ownUnmanaged.hours !== ownMix.hours);
assert(
  windowsDiffer,
  "at large fleet, series-own belly/peak can differ from grid (why fixed window matters)",
);

const relief = rateU - rateM;
assert(
  Number.isFinite(relief),
  `fixed-window relief at 50% mix / full LDV = ${relief.toFixed(1)} MW/h`,
);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll adoption-stress checks passed.");
