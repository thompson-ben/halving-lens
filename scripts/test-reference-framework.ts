// Deterministic tests for Framework Phase A — the Four Reference Prices
// weekly configuration engine. Invariant-based against the committed
// snapshot (never date- or value-literal) plus fixture tests for the pure
// functions. Run: npm run test-reference-framework

import { ONCHAIN } from "../src/lib/btcData";
import {
  weeklyConfigurationTable,
  configurationName,
  tierStats,
  lastSimilarWeek,
  frameworkToday,
  _internals,
} from "../src/lib/fourReferencePrices";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

// Language the framework must never emit (banned vocabulary appears on the
// site only inside negated disclaimers, which this engine does not produce).
const BANNED = ["support", "floor", "fair value", "break-even", "breakeven", "target", "will rise", "will fall", "guaranteed"];
const clean = (s: string) => BANNED.every((b) => !s.toLowerCase().includes(b));

// ── configurationName truth table ────────────────────────────────────────────

assert(configurationName(true, true, true) === "Above all three references", "full: above everything");
assert(configurationName(false, false, false) === "Below all three references", "full: below everything");
assert(
  configurationName(false, true, true) === "Above the holder cost basis and mining-cost estimate, below the trend",
  "full: mixed state names both sides",
);
assert(
  configurationName(true, false, null) === "Above the trend, below the holder cost basis",
  "partial availability: miners absent drops cleanly",
);
assert(configurationName(true, null, null) === "Above trend", "trend-only: reads naturally");
assert(configurationName(false, null, null) === "Below trend", "trend-only: below reads naturally");
assert(
  [
    configurationName(true, true, false),
    configurationName(true, false, true),
    configurationName(false, true, null),
  ].every(clean),
  "no configuration name uses banned vocabulary",
);

// ── valueAt staleness cap (fixture) ──────────────────────────────────────────

{
  const day = 86_400_000;
  const series = [{ ts: 0, value: 10 }, { ts: 20 * day, value: 20 }];
  assert(_internals.valueAt(series, 21 * day) === 20, "join uses latest at-or-before value");
  assert(_internals.valueAt(series, 15 * day) === null, "join refuses values staler than the cap");
  assert(_internals.valueAt(series, -1) === null, "join refuses timestamps before the series");
}

// ── Weekly table invariants (committed snapshot) ─────────────────────────────

const table = weeklyConfigurationTable();
assert(table.length > 400, `weekly table spans the cycle corpus (${table.length} rows)`);
assert(table.every((r, i) => i === 0 || table[i - 1].ts < r.ts), "rows strictly ascending");
assert(table.every((r) => r.price > 0 && r.ma200 > 0), "price and trend always positive");
assert(table.every((r) => r.aboveTrend === r.price >= r.ma200), "aboveTrend flag matches the values");
assert(
  table.every((r) => (r.realised == null) === (r.aboveHolders == null) && (r.mining == null) === (r.aboveMiners == null)),
  "flags are null exactly when the reference is absent",
);
assert(
  table.every((r) => r.aboveHolders == null || r.aboveHolders === (r.realised != null && r.price >= r.realised)),
  "aboveHolders flag matches the values",
);

// Evidence discipline: realised must never appear before the observed
// archive floor (PR140/141), mining never before the model start.
{
  const floor = ONCHAIN?.series?.realizedPrice?.[0]?.date;
  if (floor) {
    const floorTs = Date.parse(`${floor}T00:00:00Z`);
    assert(
      table.every((r) => r.realised == null || r.ts >= floorTs),
      `no realised value precedes the archive floor (${floor})`,
    );
  }
  assert(
    table.every((r) => r.mining == null || r.date >= "2016-01-01"),
    "no mining estimate precedes the model window",
  );
}

// ── Tier statistics ──────────────────────────────────────────────────────────

for (const tier of ["full", "trend-miners", "trend-only"] as const) {
  const s = tierStats(tier);
  if (!s) {
    console.log(`  info  tier ${tier}: too few weeks — correctly returns null`);
    continue;
  }
  assert(s.weeks >= 8 && s.windowFirst <= s.windowLast, `${tier}: coherent window (${s.windowFirst} → ${s.windowLast}, ${s.weeks} wks)`);
  assert(s.aboveAllPct >= 0 && s.aboveAllPct <= 100 && s.belowAllPct >= 0 && s.belowAllPct <= 100, `${tier}: shares within 0–100`);
  assert(s.aboveAllPct + s.belowAllPct <= 100.01, `${tier}: above-all and below-all are disjoint`);
  assert(s.matchingTodayPct == null || s.matchingTodayPct > 0, `${tier}: today's configuration counts itself`);
  assert(s.currentSpellWeeks == null || s.currentSpellWeeks >= 1, `${tier}: current spell includes this week`);
}

// The full tier must start no earlier than the realised archive floor.
{
  const s = tierStats("full");
  const floor = ONCHAIN?.series?.realizedPrice?.[0]?.date;
  if (s && floor) assert(s.windowFirst >= floor, "full-tier window respects the archive floor");
}

// ── lastSimilarWeek ──────────────────────────────────────────────────────────

{
  const sim = lastSimilarWeek();
  if (sim) {
    assert(/^\d{4}-\d{2}-\d{2}$/.test(sim.date), "last similar week has an ISO date");
    assert(sim.name.length > 0 && clean(sim.name), "last similar week is named cleanly");
    const spellTier = tierStats("full") ?? tierStats("trend-miners") ?? tierStats("trend-only");
    if (spellTier?.currentSpellWeeks != null) {
      const spellStartTs = table[table.length - 1].ts - (spellTier.currentSpellWeeks - 1) * _internals.MS_WEEK;
      assert(Date.parse(`${sim.date}T00:00:00Z`) < spellStartTs, "last similar week predates the current spell");
    }
  } else {
    console.log("  info  no prior week shares today's configuration — valid outcome");
  }
}

// ── Today's read + interpretation ────────────────────────────────────────────

{
  const t = frameworkToday();
  assert(t.price != null && t.price > 0, "today's price present");
  assert(!!t.configuration && clean(t.configuration), "today's configuration named cleanly");
  assert(!!t.nearest && Number.isFinite(t.nearest.gapPct), "nearest reference identified");
  assert(!!t.paragraph, "interpretation paragraph generated");
  if (t.paragraph) {
    assert(t.paragraph.endsWith("Historical context, not a prediction."), "paragraph closes with the standing line");
    assert(clean(t.paragraph), "paragraph uses no banned vocabulary");
    assert(!/\b(will|forecast|predict(?!ion))/i.test(t.paragraph.replace("not a prediction", "")), "paragraph never forecasts");
    assert(t.paragraph === frameworkToday().paragraph, "output is deterministic");
    console.log(`  info  today: "${t.configuration}" — ${t.paragraph.slice(0, 120)}…`);
  }
}

console.log(failures === 0 ? "\nAll reference-framework tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
