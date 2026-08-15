// CDOE — the Cycle Dashboard onboarding email + one-off broadcast.
//
// Guarantees under test: the email is another PRESENTATION of canonical
// dashboard intelligence (never a second engine), the live verdict is quoted
// verbatim or omitted entirely, the CTA is single and unmistakable, the
// approved day-1 tour corrections hold, and the broadcast cannot send without
// an explicit confirm flag.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LIFECYCLE_STEPS, liveVerdictLine } from "../src/lib/lifecycleEmails";
import { previewLifecycleStep } from "../src/lib/lifecycleEmails";
import { dashboardBroadcastHtml, dashboardBroadcastText, BROADCAST_STEP_ID, ONBOARDING_STEP_ID } from "../src/lib/dashboardBroadcast";
import { cycleDashboardIntel } from "../src/lib/cycleDashboardIntel";

let failures = 0;
function check(name: string, ok: boolean, extra?: unknown) {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}`, extra ?? "");
  }
}

// ── 1 · Lifecycle position ──────────────────────────────────────────────────
console.log("Lifecycle position:");
{
  const step = LIFECYCLE_STEPS.find((s) => s.id === "cycle_dashboard");
  check("the Cycle Dashboard step exists at day 3", step != null && step.dayOffset === 3);
  check("subject is the approved headline", step?.subject === "Know what changed. Know what didn't.");
  const offsets = LIFECYCLE_STEPS.map((s) => s.dayOffset);
  check("sequence stays ordered and un-duplicated", offsets.every((d, i) => i === 0 || d > offsets[i - 1]));
  check("the day-14 feedback/testimonial step is untouched",
    LIFECYCLE_STEPS.some((s) => s.id === "day14_feedback" && s.dayOffset === 14));
}

// ── 2 · Canonical agreement (the email quotes, never computes) ──────────────
console.log("Canonical agreement:");
{
  const line = liveVerdictLine();
  const s = cycleDashboardIntel().summary;
  check("live verdict is the dashboard's own summary, verbatim",
    line === `${s.activityLabel}. ${s.countsLine}`);
  const preview = previewLifecycleStep("cycle_dashboard");
  check("the rendered email carries that exact sentence", preview != null && line != null && preview.html.includes(line));
  check("no invented intelligence in the rendered copy — no scores/thresholds/predictions",
    preview != null && !/score|confidence|will |forecast|predict|target|guarantee/i.test(preview.html.replace(/Historical context[^<]*/g, "")));
}

// ── 3 · CTA discipline ──────────────────────────────────────────────────────
console.log("CTA discipline:");
{
  const preview = previewLifecycleStep("cycle_dashboard");
  const html = preview?.html ?? "";
  check("exactly one Cycle Dashboard CTA button", (html.match(/Open the Cycle Dashboard/g) ?? []).length === 1);
  check("the CTA points at /cycle-dashboard", /\/cycle-dashboard/.test(html));
  check("no competing destinations (only the CTA + unsubscribe)",
    !/\/accumulation|\/similar-moments|\/four-reference-prices|\/profile|\/referrals|youtube/i.test(html));
  const src = readFileSync(join(__dirname, "../src/lib/lifecycleEmails.ts"), "utf8");
  check("the CTA carries its own tracking label", /track: "cdoe_dashboard_cta"/.test(src));
}

// ── 4 · Fallback (omit entirely) ────────────────────────────────────────────
console.log("Fallback behaviour:");
{
  const src = readFileSync(join(__dirname, "../src/lib/lifecycleEmails.ts"), "utf8");
  check("liveVerdictLine returns null on any failure (try/catch, no placeholder)",
    /export function liveVerdictLine\(\): string \| null/.test(src) && /catch \{\s*return null;/.test(src));
  check("the card renders only when a verdict exists", /if \(!line\) return "";/.test(src));
  check("copy adapts its connective when the card is absent", /verdict \? "That verdict is/.test(src));
}

// ── 5 · Approved day-1 tour corrections ─────────────────────────────────────
console.log("Day-1 tour corrections:");
{
  const tour = previewLifecycleStep("tour");
  const html = tour?.html ?? "";
  check("the retired Context Score reference is gone", !/context score/i.test(html));
  check("the ambiguous 'Open your dashboard' CTA is gone", !/Open your dashboard/i.test(html));
  check("the tour now surfaces the Cycle Dashboard", /\/cycle-dashboard/.test(html));
  check("sequence tags renumbered to 6", /Getting started · \d of 6/.test(html) && !/of 5</.test(html));
}

// ── 6 · Broadcast: prepared, send-gated, idempotent ─────────────────────────
console.log("Broadcast safety:");
{
  const html = dashboardBroadcastHtml("https://example.com/unsub");
  const text = dashboardBroadcastText();
  check("broadcast keeps the approved provenance concept",
    /The Brief hands you the conclusion/.test(html) && /is the working/.test(html));
  check("broadcast never claims the reader is a new subscriber", !/welcome to/i.test(html));
  check("broadcast reassures the Brief is unchanged", /Daily Brief continues exactly as it is/.test(html));
  check("broadcast carries the same single CTA", (html.match(/Open the Cycle Dashboard/g) ?? []).length === 1);
  check("broadcast quotes the same canonical verdict (or omits it)",
    liveVerdictLine() == null || html.includes(liveVerdictLine() as string));
  check("plain-text part present", /THE WORKING BEHIND THE ANSWER/.test(text));

  const script = readFileSync(join(__dirname, "../scripts/send-dashboard-broadcast.ts"), "utf8");
  check("SENDS NOTHING without --confirm (dry run by default)",
    /const confirm = argv\.includes\("--confirm"\)/.test(script) && /if \(!confirm\) \{[\s\S]*?DRY RUN[\s\S]*?return;/.test(script));
  check("idempotent via lifecycle_sends under a reserved step id",
    script.includes("BROADCAST_STEP_ID") && /sbInsert\("lifecycle_sends", \{ email: sub\.email, step: BROADCAST_STEP_ID \}\)/.test(script));
  check("day-3 onboarding recipients are excluded — nobody gets both",
    script.includes("ONBOARDING_STEP_ID") && /excluded\.has/.test(script));
  check("only successful sends are recorded (failures retry)", /if \(res\.ok\) \{[\s\S]*?sbInsert\("lifecycle_sends"/.test(script));
  check("the daily sync never calls the broadcast",
    !readFileSync(join(__dirname, "../.github/workflows/sync.yml"), "utf8").includes("broadcast-dashboard"));
  check("step ids are distinct", String(BROADCAST_STEP_ID) !== String(ONBOARDING_STEP_ID));
}

// ── 7 · No new analytics infrastructure ─────────────────────────────────────
console.log("Measurement discipline:");
{
  const src = readFileSync(join(__dirname, "../src/lib/lifecycleEmails.ts"), "utf8");
  const bsrc = readFileSync(join(__dirname, "../src/lib/dashboardBroadcast.ts"), "utf8");
  check("tracking uses the existing emailTracking link wrapper only",
    !/sbInsert\(|new Event|analytics\./.test(src.split("liveVerdictLine")[0]) && /emailTracking|EmailTracking/.test(bsrc));
  check("no new event names or tables introduced", !/events\?|sbInsert\("events"/.test(bsrc));
}

console.log("");
if (failures) {
  console.error(`${failures} failure(s).`);
  process.exit(1);
}
console.log("All dashboard-onboarding tests passed.");
