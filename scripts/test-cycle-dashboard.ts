// Cycle Dashboard tests (Cycle Dashboard V2, CD2). Offline, deterministic.
//
// Two halves: the Lens client PAYLOAD is proven to be a faithful, compact
// projection of the CD1 engine (every value traceable, unavailable states
// preserved, nothing recomputed downstream), and the PAGE/renderer contracts
// are pinned by targeted source scans — the client consumes the payload
// only, the accessible control is real, the routing/retirement landed, and
// the Pro seam reuses the existing subscription machinery honestly.
//
// Run: npm run test-cycle-dashboard

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { lensClientPayload, parseLensDay } from "../src/lib/lensPayload";
import {
  lensObservation,
  lensAtDay,
  lensSeries,
  CURRENT_FUTURE_REASON,
  LENS_OBSERVATION_VERSION,
} from "../src/lib/cycleLens";
import { cycleAnchor } from "../src/lib/cycleDay";
import { decideProWaitlist } from "../src/lib/proWaitlist";
import { isTrackedEvent } from "../src/lib/analyticsEvents";

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}${detail !== undefined ? ` — got ${JSON.stringify(detail)}` : ""}`);
  }
}
const read = (p: string) => readFileSync(join(__dirname, p), "utf8");

// ── 1 · Payload is a faithful projection of the engine ──────────────────────
console.log("Lens payload assembly:");
const payload = lensClientPayload();
check("four cycles, house order", payload.cycles.map((c) => c.cycleId).join(",") === "2,3,4,5");
check("payload is cached (same object)", lensClientPayload() === payload);
check("asOfDate is the CD0 anchor", payload.asOfDate === cycleAnchor().asOfDate);
check("currentCycleDay is the anchor's day", payload.currentCycleDay === cycleAnchor().cycleDay);
check("maxDay is the largest cycle record (C4, 1438)", payload.maxDay === 1438);
for (const c of payload.cycles) {
  const n = c.lastDay + 1;
  check(
    `C${c.cycleId} parallel arrays cover days 0..${c.lastDay}`,
    c.multiple.length === n && c.drawdown.length === n && c.mayer.length === n,
  );
  check(`C${c.cycleId} multiple[0] is exactly 1`, c.multiple[0] === 1);
}
check("forward arrays exist ONLY for completed cycles", payload.cycles.every((c) => (c.cycleId === 5 ? !c.fwd : !!c.fwd && c.fwd[30].length === c.lastDay + 1)));
check("the current cycle's future is never in the payload", !("fwd" in payload.cycles.find((c) => c.cycleId === 5)!) || payload.cycles.find((c) => c.cycleId === 5)!.fwd === undefined);
check("currentFutureReason quotes the engine verbatim", payload.currentFutureReason === CURRENT_FUTURE_REASON);
check("observation methodology version travels", payload.observationVersion === LENS_OBSERVATION_VERSION);

console.log("Payload values trace to the engine (spot fixtures):");
const c2 = payload.cycles.find((c) => c.cycleId === 2)!;
const c3 = payload.cycles.find((c) => c.cycleId === 3)!;
const c5 = payload.cycles.find((c) => c.cycleId === 5)!;
const eng839 = lensAtDay(839).cycles.find((c) => c.cycleId === 3);
check("C3 fwd30[839] = engine's −38.4%", eng839?.reached === true && c3.fwd![30][839] === Math.round((eng839.forward[30] as { changePct: number }).changePct * 10) / 10);
check("C2 fwd90[1250] preserves the engine's unavailable (null)", c2.fwd![90][1250] === null);
check("C2 fwd30[1250] is observable", typeof c2.fwd![30][1250] === "number");
check("C5 mayer[0] = 1.35 (full 200-day history at the 2024 halving)", c5.mayer[0] === 1.35);
check("C2 drawdown day 371 (the peak) is 0", c2.drawdown[371] === 0);
check("peakDay carried from the engine's daily-derived peak", c5.peakDay === lensSeries(5).peakDay);

console.log("Per-day observations, sentences deduped:");
check("one entry per current-cycle day", payload.observations.length === payload.currentCycleDay + 1);
check("day 0 is the engine's null (0)", payload.observations[0] === 0);
const o839 = payload.observations[839];
const e839 = lensObservation(839)!;
check(
  "day 839 quotes the engine sentence, lifecycle and run start",
  o839 !== 0 && payload.sentences[o839.s] === e839.sentence && o839.lifecycle === e839.lifecycle && o839.sinceDay === e839.stateSinceDay,
);
check("sentence table is small and fully referenced", payload.sentences.length <= 8 && payload.observations.every((o) => o === 0 || (o.s >= 0 && o.s < payload.sentences.length)));

console.log("parseLensDay — validated and clamped:");
check("missing → current day", parseLensDay(undefined, payload) === payload.currentCycleDay);
check("garbage → current day", parseLensDay("abc", payload) === payload.currentCycleDay);
check("negative clamps to 0", parseLensDay("-5", payload) === 0);
check("huge clamps to maxDay", parseLensDay("99999", payload) === payload.maxDay);
check("in-range passes through", parseLensDay("400", payload) === 400);
check("array takes the first value", parseLensDay(["250", "300"], payload) === 250);

// ── 2 · Renderer contracts (source scans) ───────────────────────────────────
console.log("CycleLensExplorer renderer contracts:");
const explorer = read("../src/components/lens/CycleLensExplorer.tsx");
check("consumes the payload only — never imports the engine", !/from "@\/lib\/cycleLens"/.test(explorer));
check("no threshold mechanics in the component", !/LENS_THRESHOLDS/.test(explorer));
check("quotes the engine's sentences verbatim", /payload\.sentences\[/.test(explorer));
check("quotes the engine's current-future reason", /currentFutureReason/.test(explorer));
check("range input is the canonical control", /type="range"/.test(explorer) && /aria-label="Cycle day"/.test(explorer));
check("aria-valuetext narrates day + date", /aria-valuetext=/.test(explorer));
check("live region updates at an interaction boundary", /aria-live="polite"/.test(explorer) && /setTimeout/.test(explorer));
check("history updates via replaceState, never a navigation", /replaceState/.test(explorer) && !/router\.push|useRouter/.test(explorer));
check("pointer scrubbing is an enhancement, not the only way in", /onPointerDown/.test(explorer) && /type="range"/.test(explorer));
check("chart paths memoised — no per-scrub recompute", /useMemo\(/.test(explorer));
check("unavailable forward windows render as a state, not an omission", /not observable/.test(explorer));
check("beyond-current state is explicit and unprojected", /has not reached day/.test(explorer) && /never projected/.test(explorer));
check("lifecycle shapes the treatment (standing quiet, fresh accented)", /standing/.test(explorer) && /LIFECYCLE_EYEBROW/.test(explorer));
check("cycles are named, never colour-only", /"Now"/.test(explorer) && /c\.year/.test(explorer));

console.log("Page contracts:");
const page = read("../src/app/cycle-dashboard/page.tsx");
check("server-readable ?day= initial state", /searchParams/.test(page) && /parseLensDay\(/.test(page));
check("canonical route metadata", /canonical: "\/cycle-dashboard"/.test(page));
check("orientation before interaction (price, day, phase, health)", /BTC price/.test(page) && /Cycle day/.test(page) && /Phase/.test(page) && /Market health/.test(page));
check("day discloses its asOf via the CD0 pattern", /cycleDayAsOf\(\)/.test(page) && /LastUpdated/.test(page));
check("market health colours come from the canonical band", /scoreBand\(/.test(page) && !/score\s*>=\s*\d/.test(page));
check("the standing close is present", /Historical context, not a prediction\./.test(page));

// ── 2b · CD3 — the intelligence sections ────────────────────────────────────
console.log("CD3 page composition:");
check("page consumes the composition layer, not the engines directly", /cycleDashboardIntel\(\)/.test(page) && !/marketMovers\(/.test(page) && !/metricWatch\(/.test(page));
check(
  "final hierarchy: orientation → state strip → Metric Watch → Lens → What's Moving → explore → Pro",
  (() => {
    const order = ["<header", "<StateStrip", "<MetricWatchToday", "<CycleLensExplorer", "<WhatsMoving", "<ExploreFurther", "<ProEarlyAccess"];
    const idx = order.map((m) => page.indexOf(m));
    return idx.every((v, i) => v >= 0 && (i === 0 || v > idx[i - 1]));
  })(),
);
check("new sections are measured with existing event machinery only", (page.match(/TrackedSection/g) ?? []).length >= 3 && !/track\(/.test(page));

console.log("MetricWatchToday renderer contracts:");
const mw = read("../src/components/dashboard/MetricWatchToday.tsx");
check("consumes the payload only — no engine or threshold imports", !/from "@\/lib\/marketMovers"/.test(mw) && !/WATCH_THRESHOLDS|EXCEPTIONAL_SIGNIFICANCE|MATERIAL_SIGNIFICANCE/.test(mw));
check("quiet day quotes the engine-owned quiet line verbatim", /\{watch\.quietLine\}/.test(mw));
check(
  "all three product states handled by presence, never placeholders",
  /watch\.mostInteresting &&/.test(mw) &&
    /watch\.oneToWatch &&/.test(mw) &&
    !/placeholder|coming soon|no event/i.test(mw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")),
);
check("engine strings rendered verbatim (headline, why, context)", /\{c\.headline\}/.test(mw) && /\{c\.whyNoteworthy\}/.test(mw) && /\{c\.historicalContext\}/.test(mw));
check("no internal significance number is displayed", !/significance\.value|\{sig\.value\}/.test(mw));
check("asymmetric treatment — one card, one aside", /<article className="card/.test(mw) && /<aside/.test(mw));
check("band chip only claims rarity when the engine allows it", /rarityState !== "available"/.test(mw));

console.log("WhatsMoving renderer contracts:");
const wmv = read("../src/components/dashboard/WhatsMoving.tsx");
check("quotes the movers' own formatter — no numbers re-derived", /formatMovement\(/.test(wmv) && !/toFixed|Math\.round/.test(wmv));
check("no toggle, no thresholds, no second movement engine", !/useState|PERIODS|MATERIAL_SIGNIFICANCE/.test(wmv));
check("direction carried by the sign, colour as reinforcement", /formatMovement/.test(wmv) && /direction/.test(wmv));
check("scope sentence quoted from the payload", /\{rail\.scopeLine\}/.test(wmv));
check("deep link to the full snapshot", /\/state-of-bitcoin#movers/.test(wmv));

console.log("StateStrip renderer contracts:");
const strip = read("../src/components/dashboard/StateStrip.tsx");
check("one strip, not three cards", !/className="card/.test(strip));
check("state words quoted from the payload", /\{s\.stateLabel\}/.test(strip) && /\{s\.detail\}/.test(strip));
check("unavailable is an explicit rendered state", /unavailableReason/.test(strip) && /Not measurable/.test(strip));
check("state age shown honestly, never at series start", /sinceIsSeriesStart/.test(strip));

console.log("ExploreFurther contracts:");
const explore = read("../src/components/dashboard/ExploreFurther.tsx");
check("four destinations, not the navigation reproduced", (explore.match(/href: "/g) ?? []).length === 4);
check("compact text links, no cards", !/className="card/.test(explore));

console.log("CD2 defect fixes:");
check("Pro section carries the anchor id its source key references", /id="pro-early-access"/.test(read("../src/components/lens/ProEarlyAccess.tsx")));
check("explorer live region uses the payload's halving date, not a literal", !/2024-04-19/.test(explorer) && /current\.halvingDate/.test(explorer));

console.log("Pro early-access seam — first-class intent, decoupled from the Daily Brief:");
const pro = read("../src/components/lens/ProEarlyAccess.tsx");
check("persists via the dedicated waitlist endpoint", /\/api\/pro-waitlist/.test(pro));
check("does NOT touch the Daily Brief subscribe machinery", !/\/api\/subscribe/.test(pro) && !/decideFromResponse|BriefSignup/.test(pro));
check("distinct measurable source cohort", /pro-early-access/.test(pro));
check("uses the waitlist decision contract (success = durable capture only)", /decideProWaitlist/.test(pro));
check("fires only the registered demand event, on confirmed NEW capture", /d\.fireJoin/.test(pro) && /"pro_waitlist_join"/.test(pro) && (pro.match(/track\(/g) ?? []).length === 1);
check("honest about being a future feature", /doesn(?:'|&apos;)t exist yet/.test(pro));
check("honest that it joins nothing else", /joins nothing else/.test(pro) && !/Daily Brief/.test(pro));
check(
  "no payment claim, no gating in the member-facing copy",
  !/price|checkout|stripe|payment|unlock/i.test((pro.match(/"[^"\n]*"|`[^`\n]*`|'[^'\n]*'/g) ?? []).join(" ")),
);

console.log("Pro waitlist route:");
const route = read("../src/app/api/pro-waitlist/route.ts");
check("stores into pro_waitlist, never brief_subscribers", /rest\/v1\/pro_waitlist/.test(route) && !/brief_subscribers/.test(route));
check("no welcome email, no entitlement", !/welcomeEmail|sendEmail|resend/i.test(route));
check("email is the identity — 409 duplicate reads as existing", /409/.test(route) && /"existing"/.test(route));
check("rate-limited like the subscribe endpoint", /rateLimitAll/.test(route));
check("reuses the house email validation", /normalizeEmail/.test(route) && /isValidEmail/.test(route));
check("failure is a retryable 503, never success", /503/.test(route) && /persist_failed/.test(route));
check("source attribution is allowlisted — junk lands as unknown", /KNOWN_SOURCES/.test(route) && /"unknown"/.test(route));

console.log("Pro waitlist schema — repository-owned and reproducible:");
const schema = read("../supabase/pro_waitlist.sql");
check("supabase/pro_waitlist.sql follows the house one-file-per-table convention", /create table if not exists public\.pro_waitlist/.test(schema));
check("schema is idempotent (if not exists everywhere)", !/create table (?!if not exists)/.test(schema) && /create unique index if not exists/.test(schema));
check("email unique + case-insensitive guard", /email\s+text not null unique/.test(schema) && /lower\(email\)/.test(schema));
check("RLS locked down in the table file", /alter table public\.pro_waitlist enable row level security/.test(schema));
check("RLS also listed in the consolidated rls.sql", /public\.pro_waitlist\s+enable row level security/.test(read("../supabase/rls.sql")));
check("the route points at the schema file, not inline SQL", /supabase\/pro_waitlist\.sql/.test(route) && !/create table/.test(route));
const health = read("../src/app/api/pro-waitlist/health/route.ts");
check("health endpoint verifies the live table (deployment gate)", /rest\/v1\/pro_waitlist/.test(health) && /table: true/.test(health));
check("the allowlisted source matches what the seam sends", route.includes('"/cycle-dashboard#pro-early-access"') && pro.includes('"/cycle-dashboard#pro-early-access"'));

console.log("Privacy coverage:");
const privacy = read("../src/app/privacy/page.tsx");
check("policy covers waitlist email storage and purpose", /early-access waitlist/.test(privacy) && /tell you when that product opens/.test(privacy));
check("policy covers waitlist retention", /Waitlist emails are kept until/.test(privacy));
check("the seam links the policy (house pattern)", /href="\/privacy"/.test(pro));

console.log("Waitlist decision contract (fixtures):");
check("created → success + fireJoin", (() => { const d = decideProWaitlist(200, { ok: true, outcome: "created" }); return d.state === "success" && d.fireJoin; })());
check("existing → idempotent success, no join event", (() => { const d = decideProWaitlist(200, { ok: true, outcome: "existing" }); return d.state === "existing" && !d.fireJoin; })());
check("400 → invalid, not retryable", (() => { const d = decideProWaitlist(400, { ok: false, outcome: "invalid" }); return d.state === "invalid" && !d.retryable; })());
check("429 → rate-limited, retryable", (() => { const d = decideProWaitlist(429, { ok: false, outcome: "rate_limited" }); return d.state === "rate_limited" && d.retryable; })());
check("503 → error, retryable, never success", (() => { const d = decideProWaitlist(503, { ok: false, outcome: "error" }); return d.state === "error" && d.retryable && !d.fireJoin; })());
check("network failure (null) → error, never success", decideProWaitlist(null, null).state === "error");
check("a 200 without confirmed capture is NOT success", decideProWaitlist(200, { ok: false }).state === "error");
check("pro_waitlist_join is a registered event", isTrackedEvent("pro_waitlist_join"));

console.log("Routing and retirement:");
const nav = read("../src/components/navItems.ts");
check("nav points at /cycle-dashboard", /href: "\/cycle-dashboard"/.test(nav));
check("no nav entry for /replay remains", !/"\/replay"/.test(nav));
const config = read("../next.config.js");
check("/replay 308-redirects into the dashboard", /source: "\/replay",\s*destination: "\/cycle-dashboard", permanent: true/.test(config.replace(/\n\s*/g, " ")));
check("the replay page is gone", !existsSync(join(__dirname, "../src/app/replay")));
check("the CycleReplay component is gone", !existsSync(join(__dirname, "../src/components/CycleReplay.tsx")));
check("sitemap lists the dashboard, not /replay", /"\/cycle-dashboard"/.test(read("../src/app/sitemap.ts")) && !/"\/replay"/.test(read("../src/app/sitemap.ts")));
check("homepage signature card points at the dashboard", /href="\/cycle-dashboard"/.test(read("../src/app/page.tsx")));

// ── 3 · Language ────────────────────────────────────────────────────────────
console.log("Language scan (new surfaces):");
const BANNED = [
  /\blikely\b/i, /\bsuggests?\b/i, /\bbullish\b/i, /\bbearish\b/i, /\bbuy\b/i, /\bsell\b/i,
  /\bsupport\b/i, /\bfloor\b/i, /fair value/i, /break-even/i, /price target/i, /\brally\b/i,
];
for (const [name, src] of [
  ["page", page],
  ["explorer", explorer],
  ["pro seam", pro],
  ["metric watch", mw],
  ["whats moving", wmv],
  ["state strip", strip],
  ["explore further", explore],
] as const) {
  const strings = (src.match(/"[^"\n]*"|`[^`\n]*`|'[^'\n]*'/g) ?? []).join(" ");
  check(`${name} passes the banned-vocabulary scan`, BANNED.every((re) => !re.test(strings)), BANNED.filter((re) => re.test(strings)).map(String));
}

// ── Result ──────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("\nAll cycle-dashboard tests passed.");
