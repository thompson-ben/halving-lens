// /pro offer page (founder commission, 21 Sep 2026) — contracts pinned.
//
//   · the page describes a PLANNED beta at a PROPOSED price — never a live
//     service, a charge or a confirmed price; the illustrative alert is
//     prominently labelled fictional and invents no rarity/returns/
//     probabilities/instructions;
//   · the proposed price is visible in the hero AND beside the final form
//     (so anchor arrivals see it before submitting);
//   · the form reuses the EXISTING waitlist machinery end to end, with the
//     canonical /pro source constant, join events only on confirmed NEW
//     capture (offer version attached, no email in analytics), existing
//     members tracked separately without attribution rewrites;
//   · signup behaviour exercised against MOCKED Supabase + Resend — no real
//     member, no real email, production untouched;
//   · the dashboard Pro section links here with its own signup + anchors
//     preserved; no billing or alert-delivery code exists anywhere in this
//     feature.

import { readFileSync } from "node:fs";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const page = readFileSync("src/app/pro/page.tsx", "utf8");
const form = readFileSync("src/components/pro/ProOfferSignup.tsx", "utf8");
const pageC = strip(page);
const formC = strip(form);

async function main(): Promise<void> {
  console.log("1 · Honest pre-launch copy (planned, proposed, fictional)");
  {
    check("hero eyebrow: HalvingLens Pro · Planned beta", page.includes("HalvingLens Pro · Planned beta"));
    check("approved headline verbatim", page.includes("Know when Bitcoin conditions meaningfully change."));
    check("price is PROPOSED, in the hero", page.includes("Proposed beta price") && page.includes("£15/month"));
    check("price also visible BESIDE the final form (anchor arrivals see it)", pageC.slice(pageC.indexOf('id="join"')).includes("£15/month"));
    check("hero note: free to join, no payment details, confirm before deciding", page.includes("Free to join. No payment details or commitment required."));
    check("FAQ says not available yet and waitlist ≠ purchase", page.includes("Not yet. This page describes the proposed beta.") && /does not purchase a\s+subscription/.test(page));
    check("FAQ: no buy/sell instructions, no predictions", page.includes("without price predictions or") && page.includes("personalised investment instructions"));
    check("planned features marked planned, shaped by feedback", page.includes("These features are planned, not currently available.") && page.includes("shaped by") && page.includes("member feedback"));
    check("comparison keeps the free promise intact", page.includes("The existing free experience remains available."));
  }

  console.log("2 · Illustrative alert — labelled fictional, invents nothing");
  {
    check("prominent fictional label verbatim", page.includes("Illustrative example — fictional values, not a live market alert"));
    check("approved example title", page.includes("Bitcoin has crossed below its 200-day average"));
    check("all four approved readings present", ["$82,000", "$80,100", "$79,500", "$80,000"].every((v) => page.includes(v)));
    check("balanced 'why it matters' (a crossing can reverse)", page.includes("A crossing can reverse and does not, by itself, establish a lasting trend."));
    check("evidence link goes to the real /price chart page", /href="\/price"/.test(page) && page.includes("Explore the live price and 200-day average"));
    check("the real-data disclaimer sits with the link", page.includes("This link shows actual market data, not the fictional values above."));
    check("no invented rarity/returns/probabilities/performance", !/percentile|probabilit|historical returns|% of the time|accurac|performance/i.test(pageC));
    check("no buy/sell instruction anywhere on the page", !/\b(buy now|sell now|should buy|should sell)\b/i.test(pageC));
  }

  console.log("3 · Waitlist form — existing machinery, canonical source, honest events");
  {
    const { PRO_SOURCE_OFFER_PAGE, PRO_OFFER_VERSION } = await import("../src/lib/proWaitlist");
    check("canonical /pro source constant", PRO_SOURCE_OFFER_PAGE === "/pro" && formC.includes("PRO_SOURCE_OFFER_PAGE") && !/source: "\/pro"/.test(formC));
    check("offer version is pro_beta_15_v1, from the one constant", PRO_OFFER_VERSION === "pro_beta_15_v1" && formC.includes("PRO_OFFER_VERSION") && !/"pro_beta_15_v1"/.test(formC));
    const route = strip(readFileSync("src/app/api/pro-waitlist/route.ts", "utf8"));
    check("API allowlists the /pro source via the constant", route.includes("PRO_SOURCE_OFFER_PAGE"));
    check("form posts to the EXISTING waitlist API with email only", formC.includes('fetch("/api/pro-waitlist"') && formC.includes("JSON.stringify({ email, source: PRO_SOURCE_OFFER_PAGE })"));
    check("uses the canonical decision contract (success = durable capture only)", formC.includes("decideProWaitlist(status, body)"));
    check("join event fires ONLY on confirmed NEW capture", /if \(d\.fireJoin\) track\("pro_waitlist_join"/.test(formC));
    check("join carries source + offer + first-touch attribution", /track\("pro_waitlist_join", \{ source: PRO_SOURCE_OFFER_PAGE, offer: PRO_OFFER_VERSION, \.\.\.getAttribution\(\) \}\)/.test(formC));
    check("EXISTING members tracked separately, with NO attribution props", /track\("pro_waitlist_existing", \{ source: PRO_SOURCE_OFFER_PAGE, offer: PRO_OFFER_VERSION \}\)/.test(formC));
    check("duplicate shows a clear already-on-the-waitlist state", form.includes("You're already on the Pro waitlist"));
    check("no email address ever reaches analytics", !/track\([^)]*email/i.test(formC));
    check("CTA clicks carry placement + offer (hero and form)", /"pro_offer_cta", \{ placement, offer: PRO_OFFER_VERSION \}/.test(formC) && /placement: "form"/.test(formC) && /placement="hero"/.test(page));
    check("email-only form (no questionnaire fields)", (formC.match(/<input/g) ?? []).length === 1 && /type="email"/.test(formC));
    check("commitments preserved: joins nothing else · confirm by email · Pro-launch notification", form.includes("this joins nothing else") && form.includes("confirm your place by email, then email you again when Pro opens"));
    const events = readFileSync("src/lib/analyticsEvents.ts", "utf8");
    check("new events registered in the shared taxonomy", events.includes('"pro_waitlist_existing"') && events.includes('"pro_offer_cta"'));
    check("form/price section view measured via the existing TrackedSection", /TrackedSection id="pro-offer-form"/.test(page));
    check("no extra page_view call (site-wide PageTracker already covers /pro)", !/page_view/.test(pageC) && !/trackPageView/.test(pageC));
  }

  console.log("4 · Mocked signup exercise (no real member, no real email)");
  {
    // Env BEFORE imports; every network call intercepted below.
    process.env.SUPABASE_URL = "https://mock.supabase.local";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-key";
    process.env.RESEND_API_KEY = "mock-resend";
    process.env.PRO_REPLY_TO_EMAIL = "ben@halvinglens.com";
    process.env.PRO_CONFIRMATION_EMAILS = "1";

    const calls: Array<{ url: string; method: string; headers: Record<string, string>; body: string }> = [];
    let waitlistInsertStatus = 201;
    const realFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>));
      calls.push({ url, method: init?.method ?? "GET", headers, body: String(init?.body ?? "") });
      if (url.includes("/rest/v1/rate_limits")) {
        return new Response(init?.method === "GET" ? "[]" : null, { status: init?.method === "GET" ? 200 : 201 });
      }
      if (url.includes("/rest/v1/pro_waitlist_emails")) {
        return new Response(null, { status: init?.method === "PATCH" ? 204 : 201 });
      }
      if (url.includes("/rest/v1/pro_waitlist")) {
        return new Response(null, { status: waitlistInsertStatus });
      }
      if (url.includes("api.resend.com")) {
        return new Response(JSON.stringify({ id: "mock-provider-id" }), { status: 200 });
      }
      return new Response("[]", { status: 200 });
    }) as typeof fetch;

    try {
      const { POST } = await import("../src/app/api/pro-waitlist/route");
      const post = (email: string) =>
        POST(new Request("https://halvinglens.com/api/pro-waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, source: "/pro" }),
        }));

      // FIRST successful join: captured, confirmed once, correct headers.
      const created = await post("fixture-new@example.com");
      const createdBody = (await created.json()) as { ok: boolean; outcome: string };
      check("first join → ok:true outcome:created", created.status === 200 && createdBody.ok && createdBody.outcome === "created");
      const resendCalls = calls.filter((c) => c.url.includes("api.resend.com"));
      check("exactly ONE confirmation send attempted", resendCalls.length === 1);
      const sent = JSON.parse(resendCalls[0]?.body || "{}") as { to?: string; subject?: string; reply_to?: string };
      check("confirmation goes to the joiner with the approved subject", sent.to === "fixture-new@example.com" && sent.subject === "You’re on the HalvingLens Pro waitlist");
      check("Reply-To is the public address", sent.reply_to === "ben@halvinglens.com");
      check("send carries the deterministic Idempotency-Key", typeof resendCalls[0]?.headers["Idempotency-Key"] === "string" && resendCalls[0]!.headers["Idempotency-Key"].startsWith("pro-waitlist/confirmation/"));
      const insertOrder = calls.findIndex((c) => c.url.includes("/rest/v1/pro_waitlist") && !c.url.includes("emails"));
      const sendOrder = calls.findIndex((c) => c.url.includes("api.resend.com"));
      check("capture-first: the waitlist insert precedes any email", insertOrder >= 0 && insertOrder < sendOrder);
      check("source recorded as the canonical /pro", calls[insertOrder]!.body.includes('"source":"/pro"'));

      // DUPLICATE submission: existing, and NO second email.
      waitlistInsertStatus = 409;
      const dup = await post("fixture-new@example.com");
      const dupBody = (await dup.json()) as { ok: boolean; outcome: string };
      check("duplicate → ok:true outcome:existing", dup.status === 200 && dupBody.ok && dupBody.outcome === "existing");
      check("duplicate submission sends NO email", calls.filter((c) => c.url.includes("api.resend.com")).length === 1);

      // Confirmations PAUSED: capture succeeds, nothing sends.
      delete process.env.PRO_CONFIRMATION_EMAILS;
      waitlistInsertStatus = 201;
      const paused = await post("fixture-paused@example.com");
      const pausedBody = (await paused.json()) as { ok: boolean; outcome: string };
      check("flag off → capture still succeeds (created)", paused.status === 200 && pausedBody.ok && pausedBody.outcome === "created");
      check("flag off → no email attempted", calls.filter((c) => c.url.includes("api.resend.com")).length === 1);
    } finally {
      global.fetch = realFetch;
      delete process.env.PRO_CONFIRMATION_EMAILS;
    }
  }

  console.log("5 · Integration + scope guards");
  {
    const dash = strip(readFileSync("src/components/lens/ProEarlyAccess.tsx", "utf8"));
    check("dashboard Pro section links to the offer page", /href="\/pro"/.test(dash) && dash.includes("See the proposed Pro offer"));
    check("dashboard signup + anchor preserved", /id="pro-early-access"/.test(dash) && /\/api\/pro-waitlist/.test(dash));
    check("/pro is in the sitemap", /"\/pro",/.test(readFileSync("src/app/sitemap.ts", "utf8")));
    check("exactly one h1 on the page", (page.match(/<h1/g) ?? []).length === 1);
    check("no billing/subscription code anywhere in the feature", !/stripe|checkout|billing|card number|subscription_create/i.test(pageC + formC));
    check("no alert-delivery, preferences or history implementation", !/sendAlert|alertHistory|watchlist|preference/i.test(pageC.replace(/Preferences and alert history\./, "") + formC));
    check("no scarcity/countdown/testimonial/waitlist-count furniture", !/countdown|only \d+|spots left|testimonial|\d+ people (have )?joined/i.test(pageC));
    // WCAG AA readability pass (founder review, 22 Sep 2026): ink-500 (~2.2:1)
    // and ink-400 (~3.2:1) fail the 4.5:1 minimum on every /pro background, so
    // neither may be used for text on this page. Muted text is ink-350 on the
    // page shell (4.75:1) or ink-300 in cards/the alert body (≥6:1).
    check("no sub-AA text colours on the offer page", !/text-ink-400|text-ink-500/.test(pageC + formC));
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll pro-offer checks passed");
}

main().catch((e) => {
  console.error(`fatal: ${(e as Error).message}`);
  process.exit(1);
});
