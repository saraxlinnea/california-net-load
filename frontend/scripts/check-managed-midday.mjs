/**
 * MATH.md §4b midday weights: max(solar,0) in hours 10–15; equal sixths only if Σw=0.
 * Catches the old `Math.max(solar,0) || 1` bug (zero-solar hours wrongly got weight 1).
 * Run from frontend/: node scripts/check-managed-midday.mjs
 */

const WINDOW = new Set([10, 11, 12, 13, 14, 15]);

function middayWeights(hours, solarMw) {
  const solarWeights = hours.map((h, i) =>
    WINDOW.has(h) ? Math.max(solarMw[i], 0) : 0,
  );
  const solarSum = solarWeights.reduce((s, v) => s + v, 0);
  if (solarSum > 0) return solarWeights;
  return hours.map((h) => (WINDOW.has(h) ? 1 : 0));
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL  ${msg}`);
    failed += 1;
  } else {
    console.log(`ok    ${msg}`);
  }
}

const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16];
const solarPartial = [0, 0, 100, 50, 0, 0, 80, 20, 0];
const wPartial = middayWeights(hours, solarPartial);
assert(wPartial[4] === 0 && wPartial[5] === 0, "zero-solar hours 12–13 get weight 0 when other midday solar > 0");
assert(wPartial[2] === 100 && wPartial[6] === 80, "positive solar hours keep solar MW as weight");
assert(wPartial[0] === 0 && wPartial[8] === 0, "hours outside 10–15 stay 0");

const solarAllZero = hours.map(() => 0);
const wZero = middayWeights(hours, solarAllZero);
assert(
  wZero.slice(2, 8).every((w) => w === 1) && wZero[0] === 0 && wZero[8] === 0,
  "all-zero solar → equal weight 1 on six midday hours only",
);

// Old bug pattern would have set weight 1 on zero-solar midday hours when solarSum > 0
const buggy = hours.map((h, i) =>
  WINDOW.has(h) ? Math.max(solarPartial[i], 0) || 1 : 0,
);
assert(
  buggy[4] === 1 && wPartial[4] === 0,
  "documents that ||1 would have assigned 1 where MATH wants 0",
);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll managed-midday weight checks passed.");
