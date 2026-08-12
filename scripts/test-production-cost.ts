// Offline tests for the Cost of Production model (PR134). No network; exits
// non-zero on failure; wired into CI.
//
// Run: npm run test-production-cost

import {
  ELECTRICITY_USD_PER_KWH,
  btcIssuedPerDay,
  classifyPremium,
  efficiencyAt,
  productionCostAt,
  productionPremiumPct,
  sane,
  subsidyAt,
} from "../src/lib/data/productionCost";

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`  ok    ${name}`);
  else {
    failures++;
    console.error(`  FAIL  ${name}${detail !== undefined ? ` — got ${JSON.stringify(detail)}` : ""}`);
  }
}
const approx = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// ── Subsidy schedule / issuance ─────────────────────────────────────────────
check("subsidy 2015 era", subsidyAt("2015-06-01") === 25);
check("subsidy 2019 era", subsidyAt("2019-06-01") === 12.5);
check("subsidy 2022 era", subsidyAt("2022-06-01") === 6.25);
check("subsidy post-2024 halving", subsidyAt("2026-07-25") === 3.125);
check("halving-day boundary (UTC date of block 840,000)", subsidyAt("2024-04-20") === 3.125 && subsidyAt("2024-04-19") === 6.25);
check("issuance 2026 = 450 BTC/day", btcIssuedPerDay("2026-07-25") === 450);

// ── Efficiency curve ────────────────────────────────────────────────────────
check("no efficiency before model start", efficiencyAt("2015-12-31") === null);
check("2016 step", efficiencyAt("2016-06-01") === 250);
check("2026 step", efficiencyAt("2026-07-25") === 21);
check("steps only decrease", (() => {
  let prev = Infinity;
  for (const y of [2016, 2018, 2020, 2022, 2024, 2026]) {
    const e = efficiencyAt(`${y}-06-01`)!;
    if (e >= prev) return false;
    prev = e;
  }
  return true;
})());

// ── Model maths — known-input verification ──────────────────────────────────
// 1.0e9 TH/s at 21 J/TH for 86,400s = 5.04e8 kWh/day; at $0.06/kWh = $30.24M;
// over 450 BTC/day = $67,200 per BTC.
{
  const est = productionCostAt(1.0e9, "2026-07-25");
  check("known-input central estimate", est != null && approx(est.central, 67_200), est?.central);
  check("band scalars (low = 2/3, high = 4/3)", est != null && approx(est.low, 44_800) && approx(est.high, 89_600), est);
  check("band ordering", est != null && est.low < est.central && est.central < est.high);
}

// ── Safe failure modes — never zero, never negative, never a guess ──────────
check("null hashrate -> null", productionCostAt(null, "2026-07-25") === null);
check("zero hashrate -> null", productionCostAt(0, "2026-07-25") === null);
check("negative hashrate -> null", productionCostAt(-5, "2026-07-25") === null);
check("NaN hashrate -> null", productionCostAt(Number.NaN, "2026-07-25") === null);
check("pre-model date -> null", productionCostAt(1e9, "2015-01-01") === null);
// Unit error (H/s passed instead of TH/s = 1e12x too large) trips the sanity window.
check("hashrate unit error caught by sanity window", productionCostAt(1.0e21, "2026-07-25") === null);
check("absurdly small hashrate caught", productionCostAt(0.0001, "2026-07-25") === null);
check("sane() rejects inverted band", !sane({ low: 100, central: 90, high: 80 }));

// ── Premium & classification ────────────────────────────────────────────────
check("premium +25%", approx(productionPremiumPct(75_000, 60_000)!, 25));
check("premium -50%", approx(productionPremiumPct(30_000, 60_000)!, -50));
check("premium null on zero cost", productionPremiumPct(60_000, 0) === null);
check("classify below-cost", classifyPremium(-40).band === "below-cost");
check("classify near-cost (negative)", classifyPremium(-10).band === "near-cost");
check("classify near-cost (positive)", classifyPremium(20).band === "near-cost");
check("classify moderate", classifyPremium(50).band === "moderate-premium");
check("classify elevated", classifyPremium(80).band === "elevated-premium");
check("classification boundaries", classifyPremium(-33).band === "below-cost" && classifyPremium(33).band === "moderate-premium");

// ── Electricity band configuration is coherent ──────────────────────────────
check(
  "electricity band ordered",
  ELECTRICITY_USD_PER_KWH.low < ELECTRICITY_USD_PER_KWH.central &&
    ELECTRICITY_USD_PER_KWH.central < ELECTRICITY_USD_PER_KWH.high,
);

console.log(failures ? `\n${failures} failure(s).` : "\nAll production-cost model tests passed.");
process.exit(failures ? 1 : 0);
