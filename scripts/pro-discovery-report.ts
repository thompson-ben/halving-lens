// Pro discovery — the reusable first-seven-days checkpoint report
// (founder commission, Sep 2026). READ-ONLY: queries the existing analytics
// tables and prints the report; it changes nothing and sends nothing.
//
// Run via the dispatch-only workflow pro-discovery-report.yml (or locally
// with Supabase env). THIS IS NOT AUTOMATED MONITORING — no schedule exists;
// each checkpoint is run deliberately (docs/pro-measurement.md has the
// instructions).
//
//   REPORT_SINCE (required, YYYY-MM-DD) — the VERIFIED tracking-availability
//     date (the analytics-verification timestamp from the pro-verification
//     workflow). The report window starts here, never earlier: exposure is
//     measured from when measurement was proven working, not from CI.
//   REPORT_DAYS (default 7) — window length.
//
// HONESTY RULES (enforced in the wording below):
//   · sessions are SESSIONS, not unique people;
//   · a hero/offer view is an OPPORTUNITY to see the price, not attention;
//   · a waitlist join is INTEREST, never a purchase or price acceptance;
//   · via=verify (controlled verification traffic) is excluded everywhere;
//   · email opens are estimated; only clicks are confirmed engagement.

import { sbSelect, sbCount } from "../src/lib/supabase";
import { PRO_ANNOUNCEMENT_CAMPAIGN } from "../src/lib/lifecycleConfig";

const SINCE = (process.env.REPORT_SINCE || "").trim();
const DAYS = Number(process.env.REPORT_DAYS) || 7;

interface Ev {
  name: string;
  path: string | null;
  props: Record<string, unknown> | null;
  session_id: string | null;
  created_at: string;
}

const viaOf = (e: Ev): string => {
  const v = e.props?.via;
  return typeof v === "string" && v ? v : "(none — direct/unattributed)";
};
const isVerify = (e: Ev): boolean => e.props?.via === "verify";

function tally<T>(rows: T[], key: (r: T) => string): Array<[string, number]> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

const pct = (n: number, d: number): string => (d > 0 ? `${((100 * n) / d).toFixed(1)}% (${n}/${d})` : `n/a (denominator 0)`);

async function main(): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(SINCE)) {
    console.error(
      "[report] REPORT_SINCE (YYYY-MM-DD) is required: the VERIFIED tracking-availability date from the pro-verification 'activity' run. The window never starts before measurement was proven working.",
    );
    process.exit(1);
  }
  const start = `${SINCE}T00:00:00Z`;
  const endMs = Date.parse(start) + DAYS * 86_400_000;
  const end = new Date(Math.min(endMs, Date.now())).toISOString();
  const complete = Date.now() >= endMs;
  console.log(`PRO DISCOVERY CHECKPOINT — window ${start} → ${end} (${DAYS}d target, ${complete ? "complete" : "PARTIAL — window still open"})`);
  console.log("Conventions: sessions are sessions (not people); views are opportunities to see the price; joins are interest, never purchases; via=verify excluded throughout.\n");

  const range = `created_at=gte.${start}&created_at=lt.${end}`;
  const [viewsRaw, ctasRaw, sectionRaw, joinsRaw, existingRaw, pageViewsRaw, emailClicksRaw] = await Promise.all([
    sbSelect<Ev[]>(`events?select=name,path,props,session_id,created_at&name=eq.pro_offer_view&${range}&limit=50000`),
    sbSelect<Ev[]>(`events?select=name,path,props,session_id,created_at&name=eq.pro_offer_cta&${range}&limit=50000`),
    sbSelect<Ev[]>(`events?select=name,path,props,session_id,created_at&name=eq.section_view&${range}&limit=50000`),
    sbSelect<Ev[]>(`events?select=name,path,props,session_id,created_at&name=eq.pro_waitlist_join&${range}&limit=50000`),
    sbSelect<Ev[]>(`events?select=name,path,props,session_id,created_at&name=eq.pro_waitlist_existing&${range}&limit=50000`),
    sbSelect<Ev[]>(`events?select=name,path,props,session_id,created_at&name=eq.page_view&path=eq./pro&${range}&limit=50000`),
    sbSelect<Ev[]>(`events?select=name,path,props,session_id,created_at&name=eq.email_click&${range}&limit=50000`),
  ]);
  if ([viewsRaw, ctasRaw, sectionRaw, joinsRaw, existingRaw, pageViewsRaw].some((r) => r == null)) {
    console.error("[report] events unreadable — aborting rather than reporting partial numbers.");
    process.exit(1);
  }

  const views = (viewsRaw ?? []).filter((e) => !isVerify(e));
  const ctas = (ctasRaw ?? []).filter((e) => !isVerify(e));
  const formViews = (sectionRaw ?? []).filter((e) => e.props?.id === "pro-offer-form");
  const joins = (joinsRaw ?? []).filter((e) => !isVerify(e));
  const existing = (existingRaw ?? []).filter((e) => !isVerify(e));
  const pageViews = pageViewsRaw ?? [];
  const verifyCount = (viewsRaw ?? []).length - views.length + ((ctasRaw ?? []).length - ctas.length);

  // ── Go-live annotation: first OBSERVED event per placement (honest label —
  // observation, not activation; a placement with no traffic shows "not yet
  // observed" and its exposure period cannot be assumed).
  console.log("PLACEMENT GO-LIVE (first observed event per acquisition source in this window):");
  const firstSeen = new Map<string, string>();
  for (const e of [...views, ...ctas, ...joins]) {
    const v = viaOf(e);
    if (!firstSeen.has(v) || e.created_at < (firstSeen.get(v) as string)) firstSeen.set(v, e.created_at);
  }
  for (const via of ["dashboard", "nav", "brief-footer", "onboarding-email", "announcement-email", "(none — direct/unattributed)", "other"]) {
    console.log(`  · ${via}: ${firstSeen.get(via) ?? "not yet observed"}`);
  }

  // ── Exposure ────────────────────────────────────────────────────────────
  const uniqueSessions = new Set(pageViews.map((e) => e.session_id).filter(Boolean)).size;
  console.log("\nEXPOSURE (opportunities to see the proposed price):");
  console.log(`  /pro page views: ${pageViews.length} · unique SESSIONS: ${uniqueSessions} (sessions, not unique people)`);
  console.log(`  offer views (pro_offer_view, verify excluded): ${views.length}`);
  console.log("  by acquisition source (via):");
  for (const [via, n] of tally(views, viaOf)) console.log(`    · ${via}: ${n}`);
  console.log(`  form-section views (measured visibility of the price+form section): ${formViews.length}`);

  // ── Interest ────────────────────────────────────────────────────────────
  const heroCtas = ctas.filter((e) => e.props?.placement === "hero");
  const formCtas = ctas.filter((e) => e.props?.placement === "form");
  console.log("\nINTEREST:");
  console.log(`  CTA clicks — hero: ${heroCtas.length} · form: ${formCtas.length}`);
  console.log("  CTA clicks by acquisition source:");
  for (const [via, n] of tally(ctas, viaOf)) console.log(`    · ${via}: ${n}`);
  console.log(`  NEW waitlist joins attributed to /pro (events, verify excluded): ${joins.length}`);
  for (const [via, n] of tally(joins, viaOf)) console.log(`    · ${via}: ${n}`);
  console.log(`  existing-member re-submissions (separate — never conversions): ${existing.length}`);
  const authoritative = await sbCount("pro_waitlist", `source=eq.${encodeURIComponent("/pro")}&created_at=gte.${start}&created_at=lt.${end}`);
  console.log(`  authoritative new /pro-sourced waitlist rows in window (pro_waitlist table): ${authoritative ?? "UNREADABLE"}`);
  if (authoritative != null && authoritative !== joins.length) {
    console.log(
      `  · note: table (${authoritative}) vs join events (${joins.length}) differ — the TABLE is authoritative; events under-count when analytics is blocked client-side (ad blockers, beacon loss). This gap is expected, not an error.`,
    );
  }

  // ── Email placements (delivery + confirmed clicks) ──────────────────────
  const clicks = (emailClicksRaw ?? []).filter((e) => typeof e.props?.campaign === "string");
  const proIntroClicks = clicks.filter((e) => String(e.props?.campaign) === "lifecycle-pro_intro");
  const annClicks = clicks.filter((e) => String(e.props?.campaign) === PRO_ANNOUNCEMENT_CAMPAIGN);
  const introSent = await sbCount("lifecycle_sends", `step=eq.pro_intro&sent_at=gte.${start}&sent_at=lt.${end}`);
  console.log("\nEMAIL PLACEMENTS (clicks are confirmed; opens are estimated and deliberately not used here):");
  console.log(`  Pro introductions recorded in window (onboarding + announcement share the pro_intro key): ${introSent ?? "UNREADABLE"}`);
  console.log(`  confirmed clicks — onboarding pro_intro: ${proIntroClicks.length} · announcement: ${annClicks.length}`);

  // ── Rates (consistent denominators, stated inline) ─────────────────────
  console.log("\nRATES (each denominator stated — never mix denominators across rates):");
  console.log(`  form-section visibility per offer view: ${pct(formViews.length, views.length)}`);
  console.log(`  form CTA per form-section view: ${pct(formCtas.length, formViews.length)}`);
  console.log(`  joins per offer view: ${pct(joins.length, views.length)}`);
  console.log(
    "  gaps to expect: client analytics is consent-light but blockable (ad blockers, disabled JS, beacon loss) — event counts UNDER-report; the pro_waitlist table and email_click redirects are server-side and complete. Internal/test traffic is excluded only via the via=verify convention" +
      (verifyCount > 0 ? ` (${verifyCount} verify events excluded in this window)` : " (none present in this window)") +
      ".",
  );

  // ── Reading (explicit bands — review aids, never automatic decisions) ───
  const placementsObserved = ["dashboard", "nav", "brief-footer", "onboarding-email", "announcement-email"].filter((v) => firstSeen.has(v)).length;
  console.log("\nREADING (bands are review aids; no pricing or positioning change follows from a handful of visits):");
  if (!complete || views.length < 150 || placementsObserved < 3) {
    console.log("  → TOO LITTLE EXPOSURE TO ASSESS DEMAND.");
    console.log(`    (window ${complete ? "complete" : "incomplete"}; offer views ${views.length} < 150 and/or placements observed ${placementsObserved} < 3.)`);
    console.log("    Next action: distribution, not conclusions — activate/confirm the remaining placements and re-run after the full window.");
  } else if (joins.length === 0 || (formViews.length >= 50 && formCtas.length / Math.max(formViews.length, 1) < 0.02)) {
    console.log("  → EXPOSURE WITH LIMITED INTEREST so far.");
    console.log("    Worth checking the page's framing with a few members before touching price or positioning; keep accumulating.");
  } else {
    console.log("  → INTEREST WORTH EXPLORING THROUGH CONVERSATIONS.");
    console.log("    Enough joins exist to talk to: reply-first outreach to new joiners (the confirmation email already asks the opening question).");
  }
  console.log(`\n[report] generated ${new Date().toISOString()} — read-only, nothing changed.`);
}

main().catch((e) => {
  console.error(`[report] fatal: ${(e as Error).message}`);
  process.exit(1);
});
