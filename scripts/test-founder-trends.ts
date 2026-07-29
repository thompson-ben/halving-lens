// Deterministic tests for the Founder Intelligence dashboard trends layer
// (updated spec: trend-first, 30d vs previous 30d default, 7/90 optional,
// sparklined KPIs, release annotations, cumulative secondary). Built ON the
// spine — verdicts run through the shared compare/goodness substrate.
// Run: npm run test-founder-trends

import { readFileSync } from "node:fs";
import {
  classifyTraffic,
  dayKey,
  DEFAULT_RANGE,
  FOUNDER_RANGES,
  seriesOver,
  trailingPeriod,
  priorPeriod,
  verdictFor,
  weekPeriod,
} from "../src/lib/founderIntelligence";
import { RELEASES, releasesBetween } from "../src/lib/releases";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

// ── Windows ──────────────────────────────────────────────────────────────────

assert(DEFAULT_RANGE === 30, "the default comparison window is 30 days vs the previous 30");
assert(FOUNDER_RANGES.join(",") === "7,30,90", "7-day and 90-day views are the optional ranges");
const NOW = Date.parse("2026-07-28T12:00:00Z");
const p30 = trailingPeriod(30, NOW);
assert(p30.days === 30 && Date.parse(p30.end) - Date.parse(p30.start) === 30 * 86_400_000, "trailingPeriod spans exactly its days");
const prev30 = priorPeriod(p30);
assert(prev30.days === 30 && prev30.end === p30.start, "the previous window abuts the current one, same length");
assert(JSON.stringify(weekPeriod(NOW)) === JSON.stringify({ ...trailingPeriod(7, NOW), label: "Last 7 days" }), "weekPeriod is the days=7 case of the same substrate");

// ── Verdicts (on the spine's compare/goodness) ───────────────────────────────

assert(verdictFor(3, 2) === "insufficient", "below the volume floor there is no verdict — only awaiting data");
assert(verdictFor(40, 20) === "better", "a clear rise is better");
assert(verdictFor(20, 40) === "worse", "a clear fall is worse");
assert(verdictFor(21, 20) === "flat", "changes inside the ±10% band are flat, not knife-edge verdicts");
assert(verdictFor(20, 40, { higherIsBetter: false }) === "better", "inverted metrics judge falls as improvement");
assert(verdictFor(25, 0, { floor: 20 }) === "better", "growth from zero above the floor counts as better");

// ── Traffic classification ───────────────────────────────────────────────────

assert(classifyTraffic(null, "meta") === "campaigns", "any utm_source is a campaign, whatever the network");
assert(classifyTraffic("https://www.google.com/search", null) === "search", "google referrers are search");
assert(classifyTraffic("https://t.co/abc", null) === "social", "t.co is social");
assert(classifyTraffic("https://old.reddit.com/r/bitcoin", null) === "social", "reddit is social");
assert(classifyTraffic(null, null) === "direct", "no referrer and no utm is direct");
assert(classifyTraffic("https://someblog.example.com/post", null) === "referral", "unknown hosts are other referrers");
assert(classifyTraffic("not a url", null) === "referral", "malformed referrers degrade to referral, never throw");

// ── Day bucketing / sparklines ───────────────────────────────────────────────

const counts = new Map<string, number>([
  ["2026-07-28", 5],
  ["2026-07-27", 3],
  ["2026-07-22", 1],
]);
const spark = seriesOver(7, NOW, counts);
assert(spark.length === 7, "the sparkline has one point per day of the window");
assert(spark[6] === 5 && spark[5] === 3 && spark[0] === 1, "points are oldest-first with today last");
assert(spark[3] === 0, "days with no events are zeros, not gaps");
assert(dayKey("2026-07-28T09:15:00Z") === "2026-07-28", "day bucketing is the ISO date");

// ── Release registry ─────────────────────────────────────────────────────────

assert(RELEASES.length >= 4, "the registry carries the sprint's major launches");
assert(RELEASES.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date)), "release dates are ISO days");
assert(RELEASES.every((r, i) => i === 0 || RELEASES[i - 1].date <= r.date), "the registry is append-only chronological");
assert(RELEASES.every((r) => r.label.length <= 24 && r.detail.includes("#")), "labels are chart-tick sized and details cite their PRs");
const win = releasesBetween("2026-07-27", "2026-07-28T23:00:00Z");
assert(win.length >= 2 && win.every((r) => r.date >= "2026-07-27"), "releasesBetween filters to the window");
assert(releasesBetween("2020-01-01", "2020-12-31").length === 0, "windows before the registry are empty");

// ── Wiring ───────────────────────────────────────────────────────────────────

const pageSrc = readFileSync("src/app/admin/founder/page.tsx", "utf8");
assert(pageSrc.includes("searchParams?.range"), "the range toggle is URL-driven (7/30/90)");
assert(pageSrc.includes("Sparkline"), "every KPI card carries a sparkline");
assert(pageSrc.includes("releasesBetween"), "releases annotate the hero trend");
assert(pageSrc.includes("journeyAnalytics"), "the growth strip reuses the journey engine rather than duplicating it");
assert(pageSrc.includes("All-time subscribers"), "cumulative totals are present but secondary");
assert(pageSrc.includes("RESEND_WEBHOOK_SECRET"), "the email section explains enablement instead of showing empty zeros");
assert(pageSrc.includes("awaiting data"), "insufficient-data states are explicit");
const trendsSrc = readFileSync("src/lib/founderIntelligence/trends.ts", "utf8");
assert(trendsSrc.includes('from "./period"'), "trends build on the spine's period/compare substrate, not a parallel one");
const hub = readFileSync("src/app/admin/page.tsx", "utf8");
assert(hub.includes('"/admin/founder"'), "the admin hub links the dashboard");

console.log(failures === 0 ? "\nAll founder-trends tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
