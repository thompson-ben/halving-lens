// Deterministic tests for PR136 — analytics event-taxonomy integrity.
// Three layers:
//   1. the shared taxonomy itself (well-formed, complete, no dead names),
//   2. structural anti-drift guards (the API route and client tracker both
//      derive from the shared module — neither keeps its own list),
//   3. the REAL /api/track route handler driven directly (valid events
//      accepted, unknown events rejected, path/bot filters intact).
// Run: npm run test-analytics-events

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { TRACKED_EVENTS, isTrackedEvent } from "../src/lib/analyticsEvents";
import { decideFromResponse } from "../src/lib/subscription";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "PASS" : "FAIL"}: ${m}`); };

// ── 1. Taxonomy well-formedness ──────────────────────────────────────────────

assert(new Set(TRACKED_EVENTS).size === TRACKED_EVENTS.length, "taxonomy has no duplicate names");
assert(TRACKED_EVENTS.every((n) => /^[a-z][a-z0-9_]*$/.test(n)), "every name is snake_case");
assert(TRACKED_EVENTS.every((n) => n.length <= 40), "every name fits the API's 40-char cap");
assert(TRACKED_EVENTS.every((n) => isTrackedEvent(n)), "every taxonomy event passes isTrackedEvent");

// Representative restored groups (the events silently rejected before PR136).
const RESTORED = [
  "subscription_submit_attempt", "subscription_existing", "subscription_failure", // funnel outcomes
  "nav_subscribe_impression", "nav_subscribe_click", // header CTA funnel
  "section_dwell", // section attention
  "evidence_card_click", "week_signal_click", "snapshot_strip_click",
  "snapshot_research_click", "snapshot_range_click", // SOB internal navigation
  "reference_price_row_clicked", "mining_cost_methodology_opened",
  "mining_cost_related_metric_clicked", // reference-price interactions
  "brief_share", "copy_image", "home_hero_view", "presenter_mode", // share + misc
  "referral_copy", // referrals
  "content_pack_switch", "reel_copy_full", // founder studio (typed, path-skipped)
];
for (const n of RESTORED) assert(isTrackedEvent(n), `restored event accepted: ${n}`);

// Pre-registered Discovery & Return roadmap events (defined call sites arrive
// with PR137/PR139).
for (const n of ["journey_next_impression", "journey_next_click", "youtube_click", "search_impression", "search_query", "search_result_click"]) {
  assert(isTrackedEvent(n), `roadmap event pre-registered: ${n}`);
}

// Names removed on purpose must NOT come back silently.
const REMOVED = [
  "subscription_success", // duplicated the canonical `signup` conversion
  "cta_click", "research_view", "weekly_view", "weekly_share", // dead — no call sites
  "production_cost_methodology_opened", "cost_of_production_related_metric_clicked", // renamed
];
for (const n of REMOVED) assert(!isTrackedEvent(n), `removed event rejected: ${n}`);

assert(!isTrackedEvent("definitely_not_an_event"), "unknown name rejected");
assert(!isTrackedEvent(""), "empty name rejected");

// ── 2. Anti-drift structural guards ──────────────────────────────────────────

const routeSrc = readFileSync("src/app/api/track/route.ts", "utf8");
assert(routeSrc.includes('from "@/lib/analyticsEvents"'), "API route imports the shared taxonomy");
assert(routeSrc.includes("isTrackedEvent("), "API route validates via isTrackedEvent");
assert(!/ALLOWED\s*=/.test(routeSrc) && !/new Set\(\[\s*"/.test(routeSrc), "API route keeps no independent allowlist");

const trackSrc = readFileSync("src/lib/track.ts", "utf8");
assert(trackSrc.includes("name: TrackedEvent"), "client track() is typed against the shared taxonomy");

// No file outside the taxonomy may spell a removed event name (would silently
// 400 again). Scans all of src/.
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}
const offenders: string[] = [];
for (const file of walk("src")) {
  const s = readFileSync(file, "utf8");
  for (const n of REMOVED) if (s.includes(`"${n}"`)) offenders.push(`${file}: ${n}`);
}
assert(offenders.length === 0, `no source file references a removed event name${offenders.length ? ` (${offenders.join(", ")})` : ""}`);

// ── 2b. First-touch attribution is captured BEFORE the page's own effects ────
//
// React flushes effects in tree order, so a component mounted below {children}
// runs its effect AFTER everything on the page. AttributionCapture used to sit
// below {children} in the root layout: on a visitor's FIRST paid landing, the
// hero fired `landing_view` before first-touch attribution had been persisted,
// so the event carried no utm_content and a genuinely paid arrival was recorded
// as untagged. Proven in a browser: WRITE hl.attr came AFTER landing_view.
//
// The fix is positional, so the guard has to be positional too — a future edit
// that moves the component back below the page content must fail the build.

// Comments are stripped first: the layout explains this ordering in a JSX
// comment that necessarily names both tokens, and a prose mention must not be
// mistaken for a mount point.
const stripComments = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const layoutSrc = stripComments(readFileSync("src/app/layout.tsx", "utf8"));
{
  const capture = layoutSrc.indexOf("<AttributionCapture />");
  const children = layoutSrc.indexOf("{children}");
  assert(capture !== -1 && children !== -1, "root layout mounts AttributionCapture and renders children");
  assert(capture < children,
    "AttributionCapture mounts BEFORE the page content — its effect runs first, so the page's first event can carry attribution");
  assert(layoutSrc.split("<AttributionCapture />").length - 1 === 1,
    "AttributionCapture is mounted exactly once (no duplicate capture)");
}

// The capture itself must stay first-touch: it writes once, never overwrites,
// and never invents attribution for an organic arrival.
{
  const attr = readFileSync("src/lib/attribution.ts", "utf8");
  assert(/if \(localStorage\.getItem\(KEY\)\) return;/.test(attr),
    "first-touch wins — captureAttribution returns early when attribution already exists");
  assert(/if \(Object\.keys\(o\)\.length\)/.test(attr),
    "nothing is written when the URL carries no attribution — organic visits create no paid attribution");
  assert((attr.match(/localStorage\.setItem/g) ?? []).length === 1,
    "attribution has exactly one writer");
  assert(!/fetch\(|supabase|from "\.\/track"/.test(attr),
    "attribution stores nothing server-side and emits no event — no schema or table involvement");
}

// The mount-time consumers of stored attribution. Each fires once per mount and
// now runs after the capture. Listed explicitly so a new one cannot be added
// without this test being considered.
for (const [file, event] of [
  ["src/components/LandingClient.tsx", "landing_view"],
  ["src/components/HomeHeroCta.tsx", "home_hero_view"],
] as const) {
  const s = readFileSync(file, "utf8");
  assert(new RegExp(`track\\("${event}"[\\s\\S]{0,200}getAttribution\\(\\)`).test(s),
    `${event} carries first-touch attribution`);
  assert(/fired\.current|seen\.current|useRef\(false\)/.test(s),
    `${file} guards against firing its mount event more than once`);
}

// The message-match repair (#208) is unaffected: the hero headline is resolved
// from the CURRENT url, never from stored first-touch attribution. Attribution
// answers "which source do we credit"; the URL answers "which promise do we
// continue now". This ordering fix must not blur the two.
{
  const hero = readFileSync("src/components/LandingClient.tsx", "utf8");
  assert(/resolveFreeHeadline\(\s*utmContent\s*\)/.test(hero) && /new URLSearchParams\(window\.location\.search\)/.test(hero),
    "the hero still resolves its headline from the CURRENT landing URL");
  assert(!/resolveFreeHeadline\(\s*getAttribution/.test(hero),
    "the hero never resolves its headline from stored first-touch attribution");
}

// ── 3. Single conversion event per signup ────────────────────────────────────

const created = decideFromResponse(200, { ok: true, outcome: "created" });
assert(created.analyticsEvent === "signup" && created.fireConversion === true,
  "confirmed new subscriber → the canonical `signup` event, once");
assert(isTrackedEvent(created.analyticsEvent), "the success event is in the taxonomy");
const existing = decideFromResponse(200, { ok: true, outcome: "existing" });
assert(existing.analyticsEvent === "subscription_existing" && !existing.fireConversion,
  "existing subscriber → no conversion event");
assert(isTrackedEvent(existing.analyticsEvent), "the existing event is in the taxonomy");

// ── 4. The real route handler ────────────────────────────────────────────────

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) test-analytics-events";
function post(body: unknown, ua: string = UA): Request {
  return new Request("http://localhost/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": ua },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

(async () => {
  const { POST } = await import("../src/app/api/track/route");

  // Every supported event is accepted (Supabase unconfigured → store is a
  // no-op, the contract response is what we're testing).
  let allOk = true;
  for (const n of TRACKED_EVENTS) {
    const res = await POST(post({ name: n, path: "/price", props: {}, sessionId: "s1" }));
    if (res.status !== 200) { allOk = false; console.log(`  route rejected supported event: ${n} (${res.status})`); }
  }
  assert(allOk, `route accepts all ${TRACKED_EVENTS.length} supported events`);

  const unknown = await POST(post({ name: "not_a_real_event", path: "/price" }));
  assert(unknown.status === 400, "route rejects an unknown event with 400");

  const removed = await POST(post({ name: "subscription_success", path: "/" }));
  assert(removed.status === 400, "route rejects the removed subscription_success with 400");

  const malformed = await POST(post("{not json"));
  assert(malformed.status === 400, "route rejects malformed JSON with 400");

  const noName = await POST(post({ path: "/price", props: {} }));
  assert(noName.status === 400, "route rejects a missing name with 400");

  const admin = await POST(post({ name: "page_view", path: "/admin/content" }));
  const adminBody = (await admin.json()) as { ok?: boolean; skipped?: string };
  assert(admin.status === 200 && adminBody.skipped === "internal", "internal /admin paths are still skipped, not stored");

  const bot = await POST(post({ name: "page_view", path: "/" }, "Googlebot/2.1"));
  const botBody = (await bot.json()) as { ok?: boolean; skipped?: string };
  assert(bot.status === 200 && botBody.skipped === "bot", "bot traffic is still dropped fail-open");

  const valid = await POST(post({ name: "signup", path: "/state-of-bitcoin", props: { source: "/state-of-bitcoin" }, sessionId: "s1", isNew: true }));
  const validBody = (await valid.json()) as { ok?: boolean };
  assert(valid.status === 200 && validBody.ok === true, "a valid event returns ok:true");

  console.log(failures === 0 ? "\nAll analytics-taxonomy tests passed." : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
})();
