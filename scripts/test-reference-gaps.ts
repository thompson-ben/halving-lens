// Deterministic tests for the reference-gap engine (PR-FRP1): gap-series
// construction without interpolation, cadence gates, the explicit mining-cost
// 24h omission, trajectory/held/level phrasing, rarity floors on the gap's
// own history, the corrected mining-cost cadence declaration, and the
// language safeguards.
// Run: npm run test-reference-gaps

import { readFileSync } from "node:fs";
import {
  gapSeries,
  gapReadingFrom,
  referenceGap,
  allReferenceGaps,
  gapPhrase,
  gapTrajectoryLine,
  gapRarity,
  REFERENCE_IDS,
  GAP_PERIODS,
  LEVEL_PP,
  type GapReading,
} from "../src/lib/referenceGaps";
import { RARITY_MIN_OBSERVATIONS, type Point } from "../src/lib/marketMovers/distribution";
import { metricById } from "../src/lib/marketMovers/registry";
import { observedWindows } from "../src/lib/data/observedWindows";
import { PRICE_ARCHIVE } from "../src/lib/data/priceArchiveData";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

const iso = (n: number): string => new Date(Date.UTC(2024, 0, 1) + n * 86_400_000).toISOString().slice(0, 10);
const daily = (n: number, f: (i: number) => number): Point[] => Array.from({ length: n }, (_, i) => ({ date: iso(i), value: f(i) }));
const weekly = (n: number, f: (i: number) => number): Point[] => Array.from({ length: n }, (_, i) => ({ date: iso(i * 7), value: f(i) }));
const META = { referenceId: "ma200" as const, label: "Test Reference", nature: "derived" as const };

// ── gap series: no interpolation, guarded values ────────────────────────────

{
  const market = daily(30, () => 110);
  const ref = weekly(4, () => 100);
  const s = gapSeries(market, ref);
  assert(s.length === 4 && s.every((p) => Math.abs(p.value - 10) < 1e-9), "the gap samples at reference dates against SAME-DAY market closes — a step lookup, never interpolation");
}
{
  // A reference date with no same-day market close is skipped, not stretched.
  const market = daily(30, () => 110).filter((p) => p.date !== iso(7));
  const ref = weekly(4, () => 100);
  assert(gapSeries(market, ref).length === 3, "a reference date without a same-day market close is dropped, never matched to a stale close");
}
{
  const market = daily(10, () => 110);
  const ref = daily(10, (i) => (i === 3 ? 0 : 100));
  assert(gapSeries(market, ref).length === 9, "non-positive reference values can never form a gap");
}

// ── cadence gates and the explicit mining-cost omission ─────────────────────

{
  const market = daily(60, () => 110);
  const ref = weekly(8, () => 100);
  const one = gapReadingFrom(market, ref, 1, META);
  assert(!one.available && /not observable/.test((one as { reason: string }).reason), "a weekly reference cannot support a 24-hour comparison");
  const seven = gapReadingFrom(market, ref, 7, META);
  assert(seven.available, "a weekly reference supports a 7-day comparison — exactly one step apart");
}
{
  // The mining-cost 24h omission is an editorial rule, not a cadence
  // accident: it holds even against a perfectly daily fixture, so it
  // survives the day the live series' median cadence turns daily.
  const denseDaily = daily(400, (i) => 100 + (i % 5));
  const market = daily(400, () => 110);
  const r = gapReadingFrom(market, denseDaily, 1, { referenceId: "mining_cost", label: "Est. Mining Cost", nature: "estimated" });
  assert(!r.available, "mining cost never shows a 24-hour comparison, whatever its cadence maths says");
  const reason = (r as { reason: string }).reason;
  assert(/intentionally omitted/.test(reason) && /noisy/.test(reason), "the omission explains itself to members");
  assert(!/cadence|resolves every|median|series/.test(reason), "the member-facing reason carries no implementation plumbing");
}

// ── trajectory phrasing ─────────────────────────────────────────────────────

{
  // Market walks from 8% above to 2% below the reference: a crossing.
  const ref = daily(40, () => 100);
  const market = daily(40, (i) => 108 - i * 0.5);
  const g = gapReadingFrom(market, ref, 30, META) as GapReading;
  assert(g.available && g.crossed, "a trajectory passing zero is flagged as a crossing");
  assert(/above → .*below/.test(gapTrajectoryLine(g)), "the trajectory reads earlier → now, and shows the side change");
}
{
  // A stable gap says "held", plainly.
  const ref = daily(40, () => 100);
  const market = daily(40, () => 121);
  const g = gapReadingFrom(market, ref, 7, META) as GapReading;
  assert(gapTrajectoryLine(g) === "Held at 21% above over the last 7 days.", "an unchanged gap is a finding, phrased as one");
}
{
  // Level on both sides reads as level, not "0% above".
  const ref = daily(40, () => 100);
  const market = daily(40, () => 100.2);
  const g = gapReadingFrom(market, ref, 7, META) as GapReading;
  assert(gapTrajectoryLine(g) === "Held level over the last 7 days.", "a level gap never prints a meaningless 0%");
  assert(gapPhrase(LEVEL_PP - 0.01) === "level" && gapPhrase(LEVEL_PP + 0.1) !== "level", "the level threshold is exact");
}

// ── rarity floors on the gap's own history ──────────────────────────────────

{
  const ref = daily(40, () => 100);
  const market = daily(40, (i) => 100 + i);
  const g = gapReadingFrom(market, ref, 7, META) as GapReading;
  assert(g.rarityState === "maturing" && g.rarityPercentile == null, `below ${RARITY_MIN_OBSERVATIONS} observations the state is maturing and no percentile is claimed`);
  assert(/still maturing/.test(gapRarity(g)?.line ?? ""), "the maturing state is disclosed, not hidden");

  // The adaptive narrative tells the reader what the percentile MEANS, on
  // the same band cut-offs as the Market Snapshot.
  const mk = (p: number): GapReading => ({ ...g, rarityState: "available", rarityPercentile: p, observations: 500 });
  assert(gapRarity(mk(96))!.line === "One of the largest 7-day gap shifts on record.", "an exceptional shift leads with the meaning, percentile as evidence");
  assert(/Larger than 96%/.test(gapRarity(mk(96))!.evidence ?? ""), "the exceptional narrative carries its percentile as supporting evidence");
  assert(gapRarity(mk(71))!.line === "Larger than 71% of its own 7-day record.", "a moderate shift states the percentile plainly");
  assert(gapRarity(mk(33))!.line === "An ordinary shift within its own history.", "an ordinary shift says so — the reader never interprets a low percentile");
  assert(/33rd percentile/.test(gapRarity(mk(33))!.evidence ?? ""), "the ordinary narrative keeps the percentile as evidence, correctly ordinal");
}

// ── live data ───────────────────────────────────────────────────────────────

if (PRICE_ARCHIVE.length > 1000) {
  const all = allReferenceGaps();
  assert(all.length === REFERENCE_IDS.length * GAP_PERIODS.length, "every reference × period pair is accounted for — available or explained");

  const mining1 = referenceGap("mining_cost", 1);
  assert(!mining1.available, "live: mining cost 24h is omitted");
  assert(referenceGap("mining_cost", 7).available && referenceGap("mining_cost", 30).available, "live: mining cost 7d and 30d are honest and available");
  for (const id of ["ma200", "realized_price"] as const) {
    for (const p of GAP_PERIODS) assert(referenceGap(id, p).available, `live: ${id} supports ${p}-day comparisons (daily observed)`);
  }

  // Sign cross-check straight from the series: the gap must agree with the
  // raw levels it summarises.
  const market = metricById("price")!.series();
  for (const id of REFERENCE_IDS) {
    const g = referenceGap(id, 7);
    if (!g.available) continue;
    const ref = metricById(id)!.series();
    const m = market[market.length - 1].value;
    const r = ref[ref.length - 1].value;
    const expected = (m / r - 1) * 100;
    assert(Math.abs(g.gapNow - expected) < 1.5, `live: ${id} gap matches the raw levels (${g.gapNow.toFixed(1)} vs ${expected.toFixed(1)})`);
  }

  for (const g of all) {
    if (!g.available) continue;
    assert(g.observations >= RARITY_MIN_OBSERVATIONS === (g.rarityState === "available"), `${g.referenceId} ${g.period}d: rarity state honours the shared floor`);
    assert(g.asOf <= market[market.length - 1].date, `${g.referenceId} ${g.period}d: measured to an observation that exists`);
  }

  assert(JSON.stringify(allReferenceGaps()) === JSON.stringify(allReferenceGaps()), "the engine is deterministic and cached");

  // Language safeguards over every emitted sentence.
  const text = all
    .flatMap((g) => (g.available ? [gapTrajectoryLine(g), gapRarity(g)?.line ?? "", gapRarity(g)?.evidence ?? ""] : [g.reason]))
    .join(" \n ");
  const BANNED = [/\bwill\b/i, /\bexpect/i, /forecast/i, /predict/i, /\bshould\b/i, /because/i, /\bcaused?\b/i, /\bdrove\b/i, /surging|plunging|soar|crash/i];
  assert(!BANNED.some((re) => re.test(text)), "no predictive, causal or hype language in any emitted line");
  const HOUSE = [/\bsupport\b/i, /\bfloor\b/i, /\bfair value\b/i, /\bbreak-?even\b/i, /\btarget\b/i, /\bcheap\b/i, /\bexpensive\b/i];
  assert(!HOUSE.some((re) => re.test(text)), "no banned house vocabulary in any emitted line");
}

// ── declarations and structure ──────────────────────────────────────────────

{
  const w = observedWindows().find((x) => x.id === "miningCost");
  assert(w?.cadence === "mixed", "the mining-cost window declares its real cadence — mixed, not the mislabelled daily");
}
{
  const src = readFileSync("src/lib/referenceGaps.ts", "utf8");
  assert(!/from "react"|className|<[a-z]+ /.test(src), "the gap engine emits no markup — the FRP page and Act 2 are renderers of one engine");
  assert(/Historical context\. Not forecasts\./.test(src), "the standing constraint is recorded in the engine");
  assert(/EXCLUDED_PERIODS/.test(src) && /mining_cost/.test(src), "the 24-hour omission is an explicit rule, not an emergent behaviour");
}

// ── renderer contracts (PR-FRP2): two surfaces, one engine ─────────────────

{
  const frpPage = readFileSync("src/app/four-reference-prices/page.tsx", "utf8");
  const grid = readFileSync("src/components/FourPricesGrid.tsx", "utf8");
  const act2 = readFileSync("src/components/sob/ReferencePrices.tsx", "utf8");

  assert(/gapTrajectoryLine|gapRarity/.test(frpPage), "the FRP page quotes the engine's describe layer");
  assert(!/gapSeries|historicalMoves|absPercentile/.test(frpPage + grid + act2), "no renderer reaches past the engine into the distribution primitives");
  assert(!/value \/ .*value - 1|\* 100/.test(grid), "the grid computes no gap of its own — every sentence arrives pre-rendered");
  assert(/"use client"/.test(grid) && !/from "@\/lib\/(referenceGaps|marketMovers)/.test(grid), "the client grid imports no engine — the data layer stays on the server");
  assert((act2.match(/weekTrajectory\("/g) ?? []).length === 3, "Act 2 adds exactly one trajectory line per reference row — three rows, three calls");
  assert(/referenceGap\(id, 7\)/.test(act2), "Act 2 reads the weekly lens — the page's own time frame");
  assert(/formatMovement/.test(frpPage), "the reference's own movement is quoted from the movers describe layer, not recomputed");
  assert(/aria-pressed/.test(grid), "the period toggle carries its pressed state for assistive technology");
}

console.log(failures === 0 ? "\nAll reference-gap tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
