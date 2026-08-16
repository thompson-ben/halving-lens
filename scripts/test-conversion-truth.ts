// Programme 1 — Conversion Truth & Continuity.
//
// These checks encode the §14 acceptance tests as executable guarantees, so a
// future edit cannot quietly re-introduce a promise the product does not keep.
//
// The three defect classes under permanent guard:
//   · RETIRED PRODUCT shown as the current one (the legacy edition preview,
//     the retired Context Score vocabulary on acquisition surfaces);
//   · UNDELIVERED PROMISES (a "what to watch next" section the Daily Brief V2
//     does not contain; alert channels that are not built);
//   · BROKEN CONTINUITY (peak intent pointing away from the Cycle Dashboard,
//     the signature product missing from acquisition, two "dashboards").
//
// It also pins the untouchables: Daily Brief V2, Cycle Dashboard V2.1 and CDOE
// must be byte-for-byte unaffected by this programme, and the audit's
// do-not-change list must survive.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { briefIntel } from "../src/lib/briefIntel";
import { BRIEF_PROMISE, BRIEF_PROMISE_TEXT } from "../src/lib/briefPromise";
import { welcomeEmailHtml, welcomeEmailText, welcomeEmailSubject } from "../src/lib/welcomeEmail";
import { FLAGSHIP, NAV_SECTIONS } from "../src/components/navItems";
import { LIFECYCLE_STEPS } from "../src/lib/lifecycleEmails";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
/** Source with comments stripped — vocabulary bans apply to RENDERED copy,
 *  never to the explanatory comments that record what was removed and why. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** Every .ts/.tsx file under src/ — repo-wide vocabulary bans need all of it. */
function srcFiles(dir = "src"): string[] {
  const out: string[] = [];
  for (const e of readdirSync(join(root, dir))) {
    const rel = `${dir}/${e}`;
    if (statSync(join(root, rel)).isDirectory()) out.push(...srcFiles(rel));
    else if (/\.tsx?$/.test(e)) out.push(rel);
  }
  return out;
}

let failures = 0;
function check(name: string, ok: boolean, extra?: unknown) {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}`, extra ?? "");
  }
}

// Surfaces that describe the product to someone who has NOT yet subscribed.
const ACQUISITION = ["src/app/page.tsx", "src/app/free/page.tsx", "src/app/start/page.tsx"];

// ── 1 · The preview shows the product that actually ships ───────────────────
console.log("Daily Brief preview truth:");
{
  const src = code("src/components/DailyBriefPreview.tsx");
  check("the preview renders the canonical V2 payload, not the retired engine",
    /from "@\/lib\/briefIntel"/.test(src) && !/emailBrief|editionContent/.test(src));
  check("no retired vocabulary survives in the preview",
    !/Context Score|contextScore|The scorecard|What to watch/i.test(src));
  check("it renders the V2 hierarchy: verdict → story → one secondary → states → CTA",
    /The verdict/.test(src) && /StoryCard/.test(src) && /alsoToday\[0\]/.test(src) &&
    /State of the cycle/.test(src) && /b\.cta\.sub/.test(src));
  check("max ONE secondary is rendered (the payload's own contract)",
    !/alsoToday\.map|alsoToday\.slice/.test(src));
  check("fallback omits ENTIRELY rather than showing stale or invented content",
    /catch \{\s*return null;/.test(src) && /if \(!b\) return null;/.test(src));
  check("every story shape the payload can produce has a renderer",
    ["mover", "state_change", "etf", "quiet_duration", "quiet_lens"].every((k) => src.includes(`"${k}"`)));

  for (const p of ACQUISITION) {
    check(`${p} no longer imports the retired edition engine`, !/editionContent|emailBrief/.test(code(p)));
  }

  // The rendered strings must be the payload's own, never re-worded.
  const b = briefIntel();
  check("the payload's subject, verdict and counts line are all quoted verbatim",
    typeof b.subject === "string" && b.subject.length > 0 &&
    typeof b.verdict.activityLabel === "string" && typeof b.verdict.countsLine === "string");
}

// ── 2 · Context Score is gone from acquisition proof ────────────────────────
console.log("Retired vocabulary:");
{
  for (const p of ACQUISITION) {
    check(`${p} shows no Context Score`, !/Context Score|contextScore/i.test(code(p)));
  }
  check("/start's proof now comes from the canonical dashboard authority",
    /cycleDashboardIntel/.test(read("src/app/start/page.tsx")));
}

// ── 3 · The signup journey promises only what V2 delivers ──────────────────
console.log("Signup promise:");
{
  check("there is ONE promise authority", BRIEF_PROMISE.length > 0 && BRIEF_PROMISE_TEXT.length === BRIEF_PROMISE.length);
  check("the withdrawn 'what to watch next' promise is absent from it",
    !BRIEF_PROMISE.some((b) => /what to watch/i.test(b)));
  check("the signup form quotes that authority (no second hand-maintained list)",
    /BRIEF_PROMISE/.test(read("src/components/BriefSignup.tsx")));
  const html = welcomeEmailHtml("https://example.com/unsub");
  const text = welcomeEmailText();
  check("the welcome email quotes the same authority",
    BRIEF_PROMISE.every((b) => html.includes(b.replace(/&/g, "&amp;"))));
  check("the welcome email promises no watch section", !/what to watch/i.test(html) && !/what to watch/i.test(text));
  check("no subscribe CTA anywhere promises a watch section",
    (() => {
      for (const p of ["src/app/market-health/page.tsx", "src/app/accumulation/page.tsx"]) {
        if (/what to watch/i.test(read(p).match(/<BriefSignup[\s\S]*?\/>/)?.[0] ?? "")) return false;
      }
      return true;
    })());
  check("the quiet promise — the differentiator — is stated before signup",
    BRIEF_PROMISE.some((b) => /nothing changed/i.test(b)));
}

// ── 4 · Peak intent points at the current product hierarchy ────────────────
console.log("Post-signup continuity:");
{
  const src = read("src/components/SignupConfirmation.tsx");
  check("the recommended 'today' destination is the Cycle Dashboard",
    /const READ_HREF = "\/cycle-dashboard";/.test(src));
  check("it no longer routes peak intent to /state-of-bitcoin", !/\/state-of-bitcoin/.test(src));
  check("both variants (new + already-subscribed) use that destination",
    (src.match(/href=\{READ_HREF\}/g) ?? []).length === 2);
  check("steps 1 and 3 are untouched", /Open the welcome email/.test(src) && /\/profile/.test(src));
  // A subscriber who follows that step must be credited for it.
  const prof = read("src/lib/investorProfile.ts");
  check("visiting the Cycle Dashboard completes the profile's 'today's analysis' task",
    /cycle-dashboard\|accumulation/.test(prof) && /href: "\/cycle-dashboard"/.test(prof));
}

// ── 5 · The signature product appears in acquisition + onboarding ──────────
console.log("Cycle Dashboard presence:");
{
  check("/free lists it in 'What you get'", /Cycle Dashboard/.test(read("src/app/free/page.tsx")));
  check("/start lists it in the product showcase", /"\/cycle-dashboard"/.test(read("src/app/start/page.tsx")));
  const html = welcomeEmailHtml("https://example.com/unsub");
  check("the welcome email links to it", /\/cycle-dashboard/.test(html));
  const welcomeSrc = read("src/lib/welcomeEmail.ts");
  check("the welcome email did not grow a competing CTA — /brief stays the single primary",
    (welcomeSrc.match(/welcome_read_brief/g) ?? []).length === 1 && !/welcome_today/.test(welcomeSrc));
  check("plain-text welcome carries it too", /\/cycle-dashboard/.test(welcomeEmailText()));
  check("a new subscriber meets it BEFORE day 3",
    /\/cycle-dashboard/.test(read("src/components/SignupConfirmation.tsx")) && /\/cycle-dashboard/.test(html));
  check("welcome subject, deliverability tip and 8am expectation are preserved",
    welcomeEmailSubject() === "Welcome to HalvingLens — your Cycle Brief is on the way" &&
    /brief@\$\{SITE_HOST\}/.test(welcomeSrc) && /8am UK/.test(html));
}

// ── 6 · One unambiguous "dashboard" in navigation ──────────────────────────
console.log("Navigation:");
{
  const nav = read("src/components/navItems.ts");
  check("the Cycle Dashboard sits in the flagship group",
    FLAGSHIP.some((l) => l.href === "/cycle-dashboard"));
  check("it appears exactly once across the whole navigation",
    NAV_SECTIONS.flatMap((s) => s.items).filter((l) => l.href === "/cycle-dashboard").length === 1);
  check("no second nav item is called a 'dashboard'",
    NAV_SECTIONS.flatMap((s) => s.items)
      .filter((l) => /dashboard/i.test(l.label))
      .every((l) => l.href === "/cycle-dashboard"));
  check("the personal page keeps its route — label-only change, no migration",
    /href: "\/dashboard"/.test(nav) && NAV_SECTIONS.flatMap((s) => s.items).some((l) => l.href === "/dashboard"));
  check("no /dashboard redirect or rewrite was introduced",
    !/\/dashboard/.test((() => { try { return read("next.config.ts"); } catch { return ""; } })()) &&
    !/\/dashboard/.test((() => { try { return read("next.config.js"); } catch { return ""; } })()));
}

// ── 7 · /alerts is retired, and its claims are gone repo-wide ──────────────
console.log("Alerts retirement:");
{
  const cfg = read("next.config.js");
  check("the route no longer exists", !existsSync(join(root, "src/app/alerts/page.tsx")));
  check("old links 308 to the EXISTING early-access surface — no new destination",
    /source: "\/alerts", destination: "\/cycle-dashboard#pro-early-access", permanent: true/.test(cfg));
  check("no second waitlist or Pro destination was invented",
    (cfg.match(/pro-early-access/g) ?? []).length === 1 &&
    !/\/pro\b|\/waitlist|\/premium/.test(cfg));
  check("the one early-access capture still lives where it always did",
    /id="pro-early-access"/.test(read("src/components/lens/ProEarlyAccess.tsx")) &&
    /\/api\/pro-waitlist/.test(read("src/components/lens/ProEarlyAccess.tsx")));
  check("the sitemap does not advertise the redirecting URL",
    !/"\/alerts"/.test(read("src/app/sitemap.ts")));
  check("nothing in the app links to the retired route",
    srcFiles().every((f) => !/["'`]\/alerts/.test(read(f))));
  // The claims must be gone from the REPOSITORY, not merely from one page.
  const rendered = srcFiles().map((f) => code(f)).join("\n");
  check("the 'called every cycle peak' claim exists nowhere in the app",
    !/called every cycle peak/i.test(rendered));
  // Narrow and precise: the ban is on promising ALERT DELIVERY, not on the
  // unrelated legitimate uses of these words (Resend delivery webhooks in the
  // admin tooling, share-preview comments naming chat apps).
  check("no unbuilt alert-delivery channel is promised anywhere",
    !rendered.split("\n").some((l) =>
      /alert/i.test(l) && /telegram|webhook|push notification|browser notification/i.test(l)));
}

// ── 8 · The untouchables ───────────────────────────────────────────────────
console.log("Out-of-scope surfaces untouched:");
{
  check("Daily Brief V2 payload version is unchanged", briefIntel().version === "brief-intel-v1");
  check("the V2 renderer still quotes the payload and nothing else",
    /from "\.\/briefIntel"/.test(read("src/lib/briefEmailV2.ts")));
  check("the day-3 CDOE onboarding email is untouched",
    LIFECYCLE_STEPS.some((s) => s.id === "cycle_dashboard" && s.dayOffset === 3 &&
      s.subject === "Know what changed. Know what didn't."));
  check("the CDOE broadcast module is untouched",
    /BROADCAST_SUBJECT = "Where your Daily Brief comes from"/.test(read("src/lib/dashboardBroadcast.ts")));
  check("the Cycle Dashboard composition layer is untouched",
    /cycle-dashboard-intel-v4/.test(read("src/lib/cycleDashboardIntel.ts")));
}

// ── 9 · The do-not-change list survives ────────────────────────────────────
console.log("Protected conversion mechanics:");
{
  const landing = read("src/components/LandingClient.tsx");
  const free = read("src/app/free/page.tsx");
  const signup = read("src/components/BriefSignup.tsx");
  check("the read-length claim matches the product's own (30s), on site",
    !/60 second|60-second|under 60/.test(landing) &&
    !/60 second|60-second|under 60/.test(free) &&
    !/60 second|60-second|under 60/.test(read("src/app/start/page.tsx")));
  check("the /free reassurance row is intact",
    /Free forever/.test(landing) && /No hype or predictions/.test(landing) &&
    /Arrives ~8am UK/.test(landing) && /Unsubscribe anytime/.test(landing));
  check('"Predictions made: 0" is intact', /Predictions made/.test(free) && /value="0"/.test(free));
  check("the signup expectation microcopy is intact",
    /welcome email now, then the daily brief from/.test(signup));
  check("the subscription decision contract is intact",
    /decideFromResponse/.test(signup) && /d\.fireConversion/.test(signup));
  check("the Founding Members line is intact", /Founding Members/.test(free));
  check("the message-match architecture is intact",
    /resolveFreeHeadline/.test(landing) && /FREE_HEADLINES/.test(read("src/lib/freeHeadlines.ts")));
  check("social-proof rounding discipline is intact",
    /SOCIAL_PROOF_MIN_DEFAULT = 100/.test(read("src/lib/socialProof.ts")));
  check("/start-here is untouched", /Bitcoin, explained calmly/.test(read("src/app/start-here/page.tsx")));
  check("ProEarlyAccess keeps its honest posture",
    /Pro doesn&apos;t exist yet; this list is how we decide to build it/.test(read("src/components/lens/ProEarlyAccess.tsx")));
  check("standing disclaimers survive on both paid landings",
    /Not financial advice/i.test(free) && /not financial advice/i.test(read("src/app/start/page.tsx")));
}

// ── 10 · No new analytics infrastructure ───────────────────────────────────
console.log("Measurement discipline:");
{
  const events = read("src/lib/analyticsEvents.ts");
  check("no event name was added for this programme",
    !/conversion_truth|preview_view|alerts_/.test(events));
  check("the /start hero no longer emits a secondary-CTA exit",
    !/hero_secondary/.test(read("src/components/LandingClient.tsx")));
  check("the welcome email reuses the existing link-tracking wrapper only",
    /tracking\.link/.test(read("src/lib/welcomeEmail.ts")) &&
    !/sbInsert\(|new Event\(/.test(read("src/lib/welcomeEmail.ts")));
}

console.log("");
if (failures) {
  console.error(`${failures} failure(s).`);
  process.exit(1);
}
console.log("All conversion-truth tests passed.");
