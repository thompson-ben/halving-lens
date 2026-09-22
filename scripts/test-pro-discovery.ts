// Pro discovery & measurement — deterministic verification
// (founder commission, Sep 2026). Guards the coordinated introduction:
// canonical via carrier, placements (nav / dashboard / Brief footer), the
// day-18 onboarding Pro step (no retro batch, waitlist exclusion, public
// reply routing), the one-time announcement's gates, and the honesty
// contracts of the verification + checkpoint tooling.
//
// Static imports are hoisted ABOVE any statement, so every module that reads
// env at load time (lifecycleConfig, supabase, resend) is imported DYNAMICALLY
// inside main(), after the overrides below run. Only env-free modules may be
// imported statically here.
import { readFileSync } from "fs";
import { PRO_VIA, PRO_VIA_PARAM, proViaFromSearch } from "../src/lib/proWaitlist";
import { NO_EMAIL_TRACKING } from "../src/lib/emailTracking";
import type { LifecycleCtx } from "../src/lib/lifecycleEmails";

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

const DAY = 86_400_000;
const strip = (s: string): string => s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

async function main(): Promise<void> {
  // Deterministic engine dates + a fully mocked provider/store — set BEFORE
  // the dynamic imports below evaluate their modules.
  process.env.LIFECYCLE_LAUNCH = "2025-01-01";
  process.env.LIFECYCLE_PRO_INTRO_FROM = "2025-06-01";
  process.env.SUPABASE_URL = "https://mock.supabase.local";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
  process.env.RESEND_API_KEY = "mock-resend";
  process.env.EMAIL_FROM = "HalvingLens <brief@mock.local>";
  process.env.PRO_REPLY_TO_EMAIL = "ben@halvinglens.com";
  const { PRO_ANNOUNCEMENT_CAMPAIGN } = await import("../src/lib/lifecycleConfig");
  const { dueSteps, LIFECYCLE_STEPS } = await import("../src/lib/lifecycle");
  const { buildProAnnouncementEmail, previewLifecycleStep } = await import("../src/lib/lifecycleEmails");

  console.log("1 · Canonical acquisition-source (via) contract");
  {
    check(
      "PRO_VIA values are the pinned placement set",
      PRO_VIA.dashboard === "dashboard" &&
        PRO_VIA.nav === "nav" &&
        PRO_VIA.briefFooter === "brief-footer" &&
        PRO_VIA.onboarding === "onboarding-email" &&
        PRO_VIA.announcement === "announcement-email" &&
        PRO_VIA.verify === "verify" &&
        PRO_VIA_PARAM === "via",
    );
    check("allowlisted via passes through", proViaFromSearch("?via=brief-footer") === "brief-footer");
    check("unknown via collapses to 'other' (no reporting fragmentation)", proViaFromSearch("?via=spam-junk") === "other");
    check("absent via is undefined (direct visit)", proViaFromSearch("") === undefined && proViaFromSearch("?x=1") === undefined);
    const attr = readFileSync("src/lib/attribution.ts", "utf8");
    check("via is NOT a first-touch attribution field (never overwrites anyone's first touch)", !/"via"/.test(attr));
    const tax = readFileSync("src/lib/analyticsEvents.ts", "utf8");
    check("pro_offer_view registered in the taxonomy", /"pro_offer_view"/.test(tax));
  }

  console.log("2 · /pro page carries via on events (analytics only — never the row)");
  {
    const form = readFileSync("src/components/pro/ProOfferSignup.tsx", "utf8");
    const formC = strip(form);
    check("view tracker fires pro_offer_view with via + offer", /pro_offer_view/.test(formC) && /ProOfferViewTracker/.test(formC));
    for (const ev of ["pro_offer_cta", "pro_waitlist_join", "pro_waitlist_existing"]) {
      const calls = formC.split(`track("${ev}"`).slice(1);
      check(`${ev} carries the via prop on every call`, calls.length > 0 && calls.every((c) => c.slice(0, 120).includes("currentVia()")));
    }
    check("the API request body is untouched (email + source only — via never sent to the row)", /JSON\.stringify\(\{ email, source: PRO_SOURCE_OFFER_PAGE \}\)/.test(form));
    const route = strip(readFileSync("src/app/api/pro-waitlist/route.ts", "utf8"));
    check("the waitlist route knows nothing of via (authoritative source preserved)", !/\bvia\b/.test(route));
    const page = readFileSync("src/app/pro/page.tsx", "utf8");
    check("the page mounts the view tracker", /<ProOfferViewTracker \/>/.test(page));
  }

  console.log("3 · Placements");
  {
    const nav = readFileSync("src/components/navItems.ts", "utf8");
    check("nav gains ONE modest Pro entry in Invest with the Planned beta badge", /href: "\/pro\?via=nav", label: "Pro", icon: Bell, badge: "Planned beta"/.test(nav));
    check("nav Pro entry appears exactly once", (nav.match(/href: "\/pro/g) ?? []).length === 1);
    const sidebar = readFileSync("src/components/Sidebar.tsx", "utf8");
    const mobile = readFileSync("src/components/MobileNav.tsx", "utf8");
    check("desktop sidebar renders the badge", /badge/.test(sidebar) && /Planned beta|\{badge\}/.test(sidebar));
    check("mobile nav renders the badge", /\{badge\}/.test(mobile));
    check("mobile active-state matches on the path alone (query-safe)", /pathname === item\.href\.split\("\?"\)\[0\]/.test(mobile));
    const dash = readFileSync("src/components/lens/ProEarlyAccess.tsx", "utf8");
    check("dashboard Pro link leads to /pro with via=dashboard", /href="\/pro\?via=dashboard"/.test(dash));
    check("dashboard signup + anchor preserved", /id="pro-early-access"/.test(dash) && /\/api\/pro-waitlist/.test(dash));

    const brief = readFileSync("src/lib/briefEditionEmail.ts", "utf8");
    const briefC = strip(brief);
    check("Brief footer destination is /pro with the brief-footer carrier, from the canonical constants",
      /PRO_INVITE_PATH = `\/pro\?\$\{PRO_VIA_PARAM\}=\$\{PRO_VIA\.briefFooter\}`/.test(brief) && !/"brief-footer"/.test(briefC));
    check("Brief footer uses the approved pre-launch wording (html)",
      brief.includes("Want to spend less time checking Bitcoin conditions?") && brief.includes("Explore the planned HalvingLens Pro beta"));
    check("plain-text mirror updated", brief.includes("Explore the planned HalvingLens Pro beta: ${SITE_URL}${PRO_INVITE_PATH}"));
    check("still exactly one Pro block, still the pro-invite label (hlb exclusion is semantic)",
      (brief.match(/"pro-invite"/g) ?? []).length === 1);
  }

  console.log("4 · Onboarding Pro step (day 18, no retro batch, send-time gates)");
  {
    const step = LIFECYCLE_STEPS.find((s) => s.id === "pro_intro");
    check("pro_intro exists at dayOffset 18 (widening rhythm 6→10→14→18, after feedback)", step?.dayOffset === 18);
    check("pro_intro carries an introduction date and the public reply route", !!step?.from && typeof step?.replyTo === "function");
    const others = new Set(LIFECYCLE_STEPS.filter((s) => s.id !== "pro_intro").map((s) => s.id));

    // Engine: NO retrospective batch. from=2025-06-01 (env). A subscriber
    // whose day-18 due date fell BEFORE the introduction date is never
    // caught up, even inside the general catch-up window.
    const from = Date.parse("2025-06-01T00:00:00Z");
    const retroSignup = new Date(from - 25 * DAY).toISOString();
    const retroNow = from - 25 * DAY + 18 * DAY + 2 * DAY; // due+2d — inside catch-up
    check("due date before the introduction date → NEVER sent (no catch-up batch)",
      !dueSteps(retroSignup, others, retroNow).some((s) => s.id === "pro_intro"));
    const naturalSignup = new Date(from - 10 * DAY).toISOString();
    const naturalNow = from - 10 * DAY + 18 * DAY; // due = from+8d
    check("due date after the introduction date → ordinary drip delivery",
      dueSteps(naturalSignup, others, naturalNow).some((s) => s.id === "pro_intro"));
    check("catch-up ceiling still applies",
      !dueSteps(naturalSignup, others, naturalNow + 31 * DAY).some((s) => s.id === "pro_intro"));

    // Copy contracts (preview render — no tracking, no recipients).
    const preview = previewLifecycleStep("pro_intro");
    const html = preview?.html ?? "";
    check("subject leads with the benefit", preview?.subject === "Spend less time checking charts");
    check("distinction: free Brief stays free, exactly as it is", html.includes("Your free Daily Brief") && html.includes("This stays free, exactly as it is."));
    check("distinction: planned Pro = monitoring chosen readings with explanations", html.includes("Planned Pro") && html.includes("readings you choose") && html.includes("why it matters"));
    check("one clearly-fictional illustrative example", html.includes("Illustrative example — fictional values, not a live alert") && html.includes("crossed below its 200-day average"));
    check("proposed £15/month beta stated", /proposed &pound;15\/month beta/.test(html));
    check("not available yet + no payment/commitment", html.includes("isn&rsquo;t available yet") && html.includes("no payment and no commitment"));
    check("primary CTA is Explore the Pro plan → /pro via onboarding-email", html.includes("Explore the Pro plan") && html.includes(`/pro?${PRO_VIA_PARAM}=${PRO_VIA.onboarding}`));
    check("reply-first, personal, from Ben", html.includes("Just reply") && html.includes("— Ben"));
    check("no questionnaire, predictions, performance claims or urgency",
      !/questionnaire|survey|\bpredicts?\b|\bforecasts?\b|guarantee|\breturns\b|performance|hurry|last chance|limited (time|spots)|act now|don&rsquo;t miss/i.test(html));

    // Sender gates (source contract; the mocked exercise below proves them live).
    const send = readFileSync("src/lib/lifecycleSend.ts", "utf8");
    check("sender excludes Pro-waitlist members from pro_intro at send time", /pro_waitlist\?select=email/.test(send) && /proWaitlisted\.has\(email\)/.test(send));
    check("sender skips (never mis-routes) when the public reply address is unconfigured", /proNoReplyTo/.test(send));
    check("a withheld pro_intro never blocks later steps (iterates dueSteps)", /for \(const candidate of dueSteps\(/.test(send));
    check("replyTo is passed through to the provider", /replyTo,\n/.test(send));
    const sync = readFileSync(".github/workflows/sync.yml", "utf8");
    check("lifecycle send env supplies PRO_REPLY_TO_EMAIL", /send-lifecycle[\s\S]{0,900}PRO_REPLY_TO_EMAIL/.test(sync));
  }

  console.log("5 · Mocked drip exercise (no real subscribers, no production writes)");
  {
    const { sendLifecycleEmails } = await import("../src/lib/lifecycleSend");

    const now = Date.now();
    const signup = new Date(now - 19 * DAY).toISOString(); // day 18 due yesterday, inside catch-up, after from
    const otherSteps = LIFECYCLE_STEPS.filter((s) => s.id !== "pro_intro").map((s) => s.id);
    const sentRows = ["waitlisted@example.com", "clean@example.com"].flatMap((email) => otherSteps.map((step) => ({ email, step })));
    const resendCalls: { url: string; body: Record<string, unknown> }[] = [];
    const inserts: { table: string; body: unknown }[] = [];

    const realFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();
      const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
      if (url.includes("api.resend.com")) {
        resendCalls.push({ url, body: JSON.parse(String(init?.body ?? "{}")) });
        return json({ id: `mock-${resendCalls.length}` });
      }
      if (url.includes("brief_subscribers")) return json([
        { id: 1, email: "waitlisted@example.com", signup_at: signup },
        { id: 2, email: "clean@example.com", signup_at: signup },
      ]);
      if (url.includes("lifecycle_sends") && method === "GET") return json(sentRows);
      if (url.includes("pro_waitlist")) return json([{ email: "waitlisted@example.com" }]);
      if (method === "POST") {
        inserts.push({ table: url.split("/rest/v1/")[1]?.split("?")[0] ?? url, body: JSON.parse(String(init?.body ?? "{}")) });
        return json([], 201);
      }
      return json([]);
    }) as typeof fetch;

    try {
      const summary = await sendLifecycleEmails();
      check("exactly one pro_intro sent — to the non-waitlisted subscriber only", summary.byStep["pro_intro"] === 1 && resendCalls.length === 1 && String(resendCalls[0].body.to).includes("clean@example.com"));
      check("the waitlisted subscriber was skipped and counted", summary.skipped.proWaitlisted === 1);
      check("the send carries the PUBLIC reply address", resendCalls[0].body.reply_to === "ben@halvinglens.com");
      check("the subject is the approved benefit lead", resendCalls[0].body.subject === "Spend less time checking charts");
      const recorded = inserts.filter((i) => i.table === "lifecycle_sends");
      check("recorded under the shared pro_intro key (blocks the announcement)", recorded.length === 1 && (recorded[0].body as { step?: string }).step === "pro_intro");

      // Reply address unconfigured → the step is withheld, nothing mis-routed.
      resendCalls.length = 0;
      const saved = process.env.PRO_REPLY_TO_EMAIL;
      delete process.env.PRO_REPLY_TO_EMAIL;
      const summary2 = await sendLifecycleEmails();
      // The waitlisted subscriber still hits the waitlist gate first; the
      // clean one hits the missing-reply-address gate. Zero sends either way.
      check(
        "no public reply address → pro_intro withheld, zero sends",
        resendCalls.length === 0 && summary2.skipped.proNoReplyTo === 1 && summary2.skipped.proWaitlisted === 1,
      );
      process.env.PRO_REPLY_TO_EMAIL = saved;
    } finally {
      global.fetch = realFetch;
    }
  }

  console.log("6 · One-time announcement (dispatch-gated, overlap-safe)");
  {
    const ctx: LifecycleCtx = {
      email: "preview@example.com",
      unsubUrl: "https://halvinglens.com/api/unsubscribe?e=preview",
      tracking: NO_EMAIL_TRACKING,
      referralLink: "https://halvinglens.com/?ref=preview",
    };
    const a = buildProAnnouncementEmail(ctx);
    check("announcement shares the Pro-introduction substance", a.html.includes("Planned Pro") && /proposed &pound;15\/month beta/.test(a.html) && a.html.includes("Illustrative example — fictional values, not a live alert"));
    check("announcement CTA → /pro via announcement-email", a.html.includes(`/pro?${PRO_VIA_PARAM}=${PRO_VIA.announcement}`) && a.html.includes("Explore the Pro plan"));
    check("announcement footer states the one-time reason honestly", a.html.includes("one-time note") && a.html.includes("Daily Brief continues as normal"));
    check("announcement subject is personal, no urgency", a.subject === "What I'm planning next: HalvingLens Pro" && !/hurry|last|limited|now or/i.test(a.subject));

    const script = readFileSync("scripts/send-pro-announcement.ts", "utf8");
    const sc = strip(script);
    check("modes dry-run/test/send with the SEND confirmation gate", /MODE !== "send"/.test(sc) && /CONFIRM_SEND !== "SEND"/.test(sc));
    check("audience excludes waitlist members, prior pro_intro recipients and the internal address",
      /pro_waitlist\?select=email/.test(sc) && /step=eq\.pro_intro/.test(sc) && /FOUNDER_EMAIL/.test(sc));
    check("active = the existing subscription-status definition", sc.includes("or=(status.is.null,status.eq.active)"));
    check("records the shared pro_intro key ONLY on provider acceptance", /if \(res\.ok\) \{[\s\S]{0,400}lifecycle_sends[\s\S]{0,80}pro_intro/.test(sc));
    check("never writes to pro_waitlist (no auto-enrolment)", !/sbInsert\("pro_waitlist"/.test(sc));
    check("engagement segments reported separately, opens labelled estimated", /segments/.test(sc) && /ESTIMATED/i.test(script));
    check("recipient addresses are masked in logs", /mask\(/.test(sc) && !/console\.(log|error)\(`[^`]*\$\{m\.email\}/.test(sc));
    check("public Reply-To required, no fallback", /PRO_REPLY_TO_EMAIL \(the public Reply-To\) — refusing/.test(script));

    const wf = readFileSync(".github/workflows/pro-announcement.yml", "utf8");
    check("announcement workflow is dispatch-only, defaulting to dry-run", /workflow_dispatch/.test(wf) && !/^\s*(schedule|push):/m.test(wf) && /default: dry-run/.test(wf));
  }

  console.log("7 · Verification + checkpoint tooling honesty");
  {
    const v = readFileSync("scripts/verify-pro-production.ts", "utf8");
    check("walkthrough is marked via=verify and excluded from reporting", v.includes("/pro?via=verify") && v.includes("excluded from all reporting"));
    check("walkthrough can never create a join or send email (invalid address, client-side stop)", v.includes("not-an-email") && v.includes("no waitlist join was created"));
    check("records production-availability and analytics-verification timestamps distinctly", v.includes("PRODUCTION AVAILABILITY") && v.includes("ANALYTICS VERIFICATION"));
    const vw = readFileSync(".github/workflows/pro-verification.yml", "utf8");
    check("verification workflow is dispatch-only", /workflow_dispatch/.test(vw) && !/^\s*(schedule|push):/m.test(vw));

    const r = readFileSync("scripts/pro-discovery-report.ts", "utf8");
    check("report requires the VERIFIED tracking date (never CI time)", r.includes("REPORT_SINCE") && r.includes("proven working"));
    check("report excludes via=verify everywhere", /isVerify/.test(r) && r.includes('via === "verify"'));
    check("sessions labelled sessions; views are opportunities; joins are interest", r.includes("sessions, not unique people") && r.includes("opportunities to see the proposed price") && r.includes("never purchases"));
    check("three-band reading with a distribution-first low-exposure rule", r.includes("TOO LITTLE EXPOSURE") && r.includes("LIMITED INTEREST") && r.includes("WORTH EXPLORING THROUGH CONVERSATIONS") && r.includes("distribution, not conclusions"));
    check("the waitlist TABLE stays authoritative over join events", r.includes("the TABLE is authoritative"));
    check("go-live annotated as first OBSERVED per placement", r.includes("first observed"));
    const rw = readFileSync(".github/workflows/pro-discovery-report.yml", "utf8");
    check("report workflow is dispatch-only (monitoring is deliberate, not automated)", /workflow_dispatch/.test(rw) && !/^\s*(schedule|push):/m.test(rw));
    check("measurement conventions documented", readFileSync("docs/pro-measurement.md", "utf8").includes("Acquisition source"));
    check("campaign id shared from one constant", PRO_ANNOUNCEMENT_CAMPAIGN === "pro-announcement-2026-09" && r.includes("PRO_ANNOUNCEMENT_CAMPAIGN"));
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll pro-discovery checks passed");
}

main().catch((e) => {
  console.error(`fatal: ${(e as Error).message}`);
  process.exit(1);
});
