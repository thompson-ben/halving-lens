// Offline tests for the observed-series join (PR133). Runs with no network —
// fixtures replicate the exact failure of 25 Jul 2026 (feed lagging the newest
// weekly sample) plus the boundary cases. Exits non-zero on any failure; wired
// into CI.
//
// Run: npm run test-observed-join

import { joinObservedSeries, latestAtOrBefore, ageInDays, MAX_CARRY_DAYS } from "../src/lib/data/observedJoin";
import type { OnchainPoint } from "../src/lib/data/types";

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}${detail !== undefined ? ` — got ${JSON.stringify(detail)}` : ""}`);
  }
}

const HALVING_MS = Date.parse("2024-04-19T00:00:00Z");
const day = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - HALVING_MS) / 86_400_000);

// Daily feed ending 2026-07-23 (as on the defect morning).
const feed: OnchainPoint[] = [];
for (let d = Date.parse("2026-07-01T00:00:00Z"); d <= Date.parse("2026-07-23T00:00:00Z"); d += 86_400_000) {
  const iso = new Date(d).toISOString().slice(0, 10);
  feed.push({ date: iso, value: 52_000 + (d / 86_400_000) % 100 });
}
const feedValue = (iso: string) => feed.find((p) => p.date === iso)?.value;

// ── latestAtOrBefore ────────────────────────────────────────────────────────
check("exact date hit", latestAtOrBefore(feed, "2026-07-10")?.date === "2026-07-10");
check("carries back to last available", latestAtOrBefore(feed, "2026-07-24")?.date === "2026-07-23");
check("before series start -> null", latestAtOrBefore(feed, "2026-06-01") === null);
check("ageInDays", ageInDays("2026-07-23", "2026-07-24") === 1);

// ── The 25 Jul defect scenario: newest sample dated one day past the feed ──
{
  const samples = [
    { day: day("2026-07-10"), realizedPrice: 35_365 }, // synthetic placeholders
    { day: day("2026-07-17"), realizedPrice: 35_365 },
    { day: day("2026-07-24"), realizedPrice: 35_365 }, // past feed tail
  ];
  const r = joinObservedSeries({
    samples,
    sampleKey: "realizedPrice",
    series: feed,
    halvingDateMs: HALVING_MS,
    sourceLabel: "BG",
    modelledLabel: "modelled",
  });
  check("all three samples joined", r.hits === 3, r.hits);
  check("exact dates keep exact values", samples[0].realizedPrice === feedValue("2026-07-10"), samples[0].realizedPrice);
  check(
    "newest sample carries the last observation (NOT the synthetic 35365)",
    samples[2].realizedPrice === feedValue("2026-07-23"),
    samples[2].realizedPrice,
  );
  check("newest provenance observed", r.newestProvenance.mode === "observed", r.newestProvenance);
  check("newest provenance observedAt = feed tail", r.newestProvenance.observedAt === "2026-07-23");
  check("newest provenance age 1 day", r.newestProvenance.ageDays === 1);
}

// ── Stale window: feed several days behind ─────────────────────────────────
{
  const samples = [{ day: day("2026-07-27"), x: -1 }];
  const r = joinObservedSeries({
    samples, sampleKey: "x", series: feed, halvingDateMs: HALVING_MS,
    sourceLabel: "BG", modelledLabel: "modelled",
  });
  check("4-day-old observation still used", samples[0].x === feedValue("2026-07-23"), samples[0].x);
  check("mode observed-stale", r.newestProvenance.mode === "observed-stale", r.newestProvenance);
  check("ageDays 4", r.newestProvenance.ageDays === 4);
}

// ── Carry cap: beyond MAX_CARRY_DAYS the modelled fallback survives ────────
{
  const beyond = new Date(Date.parse("2026-07-23T00:00:00Z") + (MAX_CARRY_DAYS + 1) * 86_400_000)
    .toISOString().slice(0, 10);
  const samples = [{ day: day(beyond), x: 123.456 }];
  const r = joinObservedSeries({
    samples, sampleKey: "x", series: feed, halvingDateMs: HALVING_MS,
    sourceLabel: "BG", modelledLabel: "modelled",
  });
  check("value beyond cap untouched (keeps modelled fallback)", samples[0].x === 123.456, samples[0].x);
  check("mode modelled beyond cap", r.newestProvenance.mode === "modelled", r.newestProvenance);
  check("no hits beyond cap", r.hits === 0, r.hits);
}

// ── Empty / unsorted / non-finite input ────────────────────────────────────
{
  const samples = [{ day: day("2026-07-24"), x: 9 }];
  const r = joinObservedSeries({
    samples, sampleKey: "x", series: [], halvingDateMs: HALVING_MS,
    sourceLabel: "BG", modelledLabel: "modelled",
  });
  check("empty series -> modelled, value untouched", r.hits === 0 && samples[0].x === 9);
}
{
  const messy: OnchainPoint[] = [
    { date: "2026-07-23", value: 52_457 },
    { date: "2026-07-21", value: 52_478 },
    { date: "2026-07-22", value: Number.NaN },
  ];
  const samples = [{ day: day("2026-07-24"), x: 0 }];
  joinObservedSeries({
    samples, sampleKey: "x", series: messy, halvingDateMs: HALVING_MS,
    sourceLabel: "BG", modelledLabel: "modelled",
  });
  check("unsorted input sorted; NaN filtered", samples[0].x === 52_457, samples[0].x);
}

console.log(failures ? `\n${failures} failure(s).` : "\nAll observed-join tests passed.");
process.exit(failures ? 1 : 0);
