// Production verification for the /pro offer page (Pro discovery, Sep 2026).
// Run via the dispatch-only workflow pro-verification.yml from a GitHub
// runner (which, unlike the development container, can reach production).
//
//   MODE=checks (default) — READ-ONLY: fetches production pages and asserts
//     the release is actually serving (page + links + health). Records the
//     PRODUCTION-AVAILABILITY timestamp (distinct from CI completion).
//   MODE=activity — the CONTROLLED analytics walkthrough: a real headless
//     browser loads /pro?via=verify, clicks the hero CTA, scrolls to the
//     form and submits an INVALID address (fires the form CTA event but is
//     stopped by client-side validation — NO waitlist join is created, NO
//     email is sent, conversions are not inflated). It then reads the
//     events table and confirms the marked events landed. Records the
//     ANALYTICS-VERIFICATION timestamp.
//
// IDENTIFIABILITY / EXCLUSION: every event this walkthrough generates
// carries via=verify (see PRO_VIA.verify), which ALL reporting queries
// exclude (docs/pro-measurement.md). The page_view fired by the generic
// PageTracker carries the run's session id, printed here (masked-free —
// session ids are anonymous) so it can be excluded by session if ever
// needed. No real subscribers are touched, nothing is written beyond the
// excluded analytics rows.

import { sbSelect, supabaseConfigured } from "../src/lib/supabase";

const MODE = (process.env.MODE || "checks").trim();
const BASE = (process.env.PROD_BASE_URL || "https://halvinglens.com").replace(/\/$/, "");

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function get(path: string): Promise<{ status: number; body: string }> {
  const res = await fetch(`${BASE}${path}`, { headers: { "user-agent": "halvinglens-release-verification" }, cache: "no-store" });
  return { status: res.status, body: await res.text() };
}

async function checks(): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log(`[verify] PRODUCTION AVAILABILITY CHECK started ${startedAt} against ${BASE}`);

  const pro = await get("/pro");
  check("/pro responds 200", pro.status === 200, `status ${pro.status}`);
  check("hero headline present", pro.body.includes("Know when Bitcoin conditions"));
  check("proposed price visible", pro.body.includes("£15/month"));
  check("fictional-example label present", pro.body.includes("Illustrative example — fictional values, not a live market alert"));
  check("hero CTA anchors to the form", pro.body.includes('href="#join"') && pro.body.includes('id="join"'));
  check("example link + target present", pro.body.includes('href="#example-alert"') && pro.body.includes('id="example-alert"'));
  check("evidence link points at /price", pro.body.includes('href="/price"'));
  check("nav Pro entry present (Planned beta badge)", pro.body.includes("Planned beta"));

  const price = await get("/price");
  check("/price (evidence target) responds 200", price.status === 200, `status ${price.status}`);

  const dash = await get("/cycle-dashboard");
  check("dashboard links to the offer page", dash.status === 200 && dash.body.includes("/pro?via=dashboard"), `status ${dash.status}`);

  const sitemap = await get("/sitemap.xml");
  check("/pro is in the sitemap", sitemap.status === 200 && sitemap.body.includes(`${BASE}/pro`));

  const health = await get("/api/pro-waitlist/health");
  check("health endpoint responds 200", health.status === 200, `status ${health.status}`);
  try {
    const h = JSON.parse(health.body) as Record<string, unknown>;
    for (const key of ["configured", "table", "emailLog", "publicReplyTo", "confirmationsEnabled"]) {
      check(`health.${key} is true`, h[key] === true, String(h[key]));
    }
    console.log(`  · waitlistCount (authoritative, read-only): ${h.waitlistCount}`);
  } catch {
    check("health endpoint returns JSON", false, health.body.slice(0, 120));
  }

  console.log(`[verify] PRODUCTION AVAILABILITY ${failures === 0 ? "CONFIRMED" : "FAILED"} at ${new Date().toISOString()}`);
}

async function activity(): Promise<void> {
  const startedAt = new Date().toISOString();
  console.log(`[verify] CONTROLLED ANALYTICS WALKTHROUGH started ${startedAt} (via=verify — excluded from all reporting)`);

  // playwright is installed by the workflow for this mode only — it is not a
  // project dependency, so the import is dynamic by module name (typed loose).
  const moduleName = "playwright";
  const { chromium } = (await import(moduleName)) as {
    chromium: { launch: () => Promise<{ newPage: (o: unknown) => Promise<Record<string, any>>; close: () => Promise<void> }> };
  };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${BASE}/pro?via=verify`, { waitUntil: "networkidle" });

  const sid = await page.evaluate(() => sessionStorage.getItem("hl.sid"));
  console.log(`[verify] anonymous walkthrough session id: ${sid}`);

  await page.locator('a[href="#join"]').first().click();
  await page.waitForTimeout(900);
  const priceVisible = await page.getByText("Proposed beta price: £15/month").last().evaluate((el: Element) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  });
  check("hero CTA reaches the form with the proposed price visible", priceVisible);

  // Form CTA: an INVALID address fires pro_offer_cta (placement form) and is
  // stopped by client-side validation — no API call, no join, no email.
  await page.locator("#pro-offer-email").fill("not-an-email");
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(400);
  const errorShown = await page.locator("#pro-offer-error").count();
  check("invalid submission is rejected client-side (no join created)", errorShown === 1);
  await page.waitForTimeout(2500); // let sendBeacon deliveries land
  await browser.close();

  if (!supabaseConfigured) {
    console.error("[verify] Supabase not configured — cannot confirm event ingestion. Walkthrough performed; ingestion UNVERIFIED.");
    process.exitCode = 1;
    return;
  }
  // Confirm the marked events reached the analytics store (retry — ingestion
  // is fire-and-forget on the client).
  let rows: { name: string; props: Record<string, unknown> }[] | null = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await new Promise((r) => setTimeout(r, 5000));
    rows = await sbSelect<{ name: string; props: Record<string, unknown> }[]>(
      `events?select=name,props&created_at=gte.${encodeURIComponent(startedAt)}&name=in.(pro_offer_view,pro_offer_cta)&limit=200`,
    );
    const marked = (rows ?? []).filter((r) => r.props?.via === "verify");
    if (marked.some((r) => r.name === "pro_offer_view") && marked.filter((r) => r.name === "pro_offer_cta").length >= 2) break;
  }
  const marked = (rows ?? []).filter((r) => r.props?.via === "verify");
  check("pro_offer_view (via=verify) reached the events table", marked.some((r) => r.name === "pro_offer_view"));
  check(
    "both pro_offer_cta clicks (hero + form, via=verify) reached the events table",
    new Set(marked.filter((r) => r.name === "pro_offer_cta").map((r) => String(r.props?.placement))).size >= 2,
    marked.map((r) => `${r.name}:${r.props?.placement ?? "-"}`).join(", "),
  );
  const joins = await sbSelect<{ name: string }[]>(
    `events?select=name&created_at=gte.${encodeURIComponent(startedAt)}&name=eq.pro_waitlist_join&limit=10`,
  );
  check("no waitlist join was created by the walkthrough", (joins ?? []).length === 0);

  console.log(
    `[verify] ANALYTICS VERIFICATION ${failures === 0 ? "CONFIRMED" : "FAILED"} at ${new Date().toISOString()} — events carry via=verify and are excluded from reporting.`,
  );
}

async function main(): Promise<void> {
  if (MODE === "activity") await activity();
  else await checks();
  if (failures > 0) {
    console.error(`[verify] ${failures} check(s) failed`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(`[verify] fatal: ${(e as Error).message}`);
  process.exit(1);
});
