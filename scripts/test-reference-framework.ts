// Deterministic tests for Framework Phase A — the Four Reference Prices
// weekly configuration engine. Invariant-based against the committed
// snapshot (never date- or value-literal) plus fixture tests for the pure
// functions. Run: npm run test-reference-framework

import { ONCHAIN } from "../src/lib/btcData";
import {
  weeklyConfigurationTable,
  configurationId,
  configurationName,
  tierStats,
  lastSimilarWeek,
  frameworkToday,
  matchingWeekPaths,
  _internals,
} from "../src/lib/fourReferencePrices";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

// Language the framework must never emit (banned vocabulary appears on the
// site only inside negated disclaimers, which this engine does not produce).
const BANNED = ["support", "floor", "fair value", "break-even", "breakeven", "target", "will rise", "will fall", "guaranteed"];
const clean = (s: string) => BANNED.every((b) => !s.toLowerCase().includes(b));

// ── Stable configuration identifiers ─────────────────────────────────────────

assert(configurationId(true, true, true) === "above-trend_above-holders_above-miners", "id: full above");
assert(configurationId(false, true, true) === "below-trend_above-holders_above-miners", "id: mixed state");
assert(configurationId(false, null, true) === "below-trend_above-miners", "id: partial availability composes");
assert(configurationId(true, null, null) === "above-trend", "id: trend-only composes");
{
  // Ids are unique across the full 8-state space and stable by construction.
  const ids = new Set<string>();
  for (const t of [true, false]) for (const h of [true, false]) for (const m of [true, false]) ids.add(configurationId(t, h, m));
  assert(ids.size === 8, "id: all eight full configurations are distinct");
}

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
  assert(!!t.configurationId && /^(above|below)-trend(_(above|below)-holders)?(_(above|below)-miners)?$/.test(t.configurationId), "today's configuration carries a stable machine id");
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

// ── What happened after (Phase C) ────────────────────────────────────────────

{
  const paths = matchingWeekPaths(26);
  assert(paths.every((p) => Math.abs(p.path[0] - 100) < 1e-9), "every path is indexed to 100 at its matching week");
  assert(paths.every((p) => p.path.length >= 2 && p.path.length <= 27), "paths span up to 26 following weeks");
  assert(paths.every((p) => p.path.every((v) => Number.isFinite(v) && v > 0)), "paths contain only finite positive values");
  assert(paths.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.startDate)), "every path carries an ISO start date");
  const sim = lastSimilarWeek();
  if (sim) {
    assert(paths.some((p) => p.startDate === sim.date), "the last similar week appears among the paths");
  }
  const table = weeklyConfigurationTable();
  const lastDate = table[table.length - 1].date;
  assert(paths.every((p) => p.startDate < lastDate), "no path starts at the current week");
  console.log(`  info  ${paths.length} historical paths share today's configuration`);
}

console.log(failures === 0 ? "\nAll reference-framework tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
