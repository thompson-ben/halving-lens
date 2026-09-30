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
import {
  PRO_ANNOUNCEMENT_CAMPAIGN,
  PRO_ANNOUNCEMENT_SENT_DATE,
  PRO_ANNOUNCEMENT_BATCH_FROM,
  PRO_ANNOUNCEMENT_BATCH_TO,
  PRO_ANNOUNCEMENT_DISPATCH_COMPLETED,
} from "../src/lib/lifecycleConfig";

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

// ── Announcement delivery outcomes (founder commission, 27 Sep 2026) ─────────
// READ-ONLY, counts only — no addresses, no hashes, no per-recipient rows in
// the output. Scoped to the one-time announcement batch via its logged
// provider message ids (email_sends rows: NULL subscriber_id, inserted in one
// batch inside the dispatch window), matched against provider webhook events
// (email_events). Definitions and honesty rules are printed with the numbers.
async function announcementDelivery(uniqueClickers: number): Promise<void> {
  console.log(`\nANNOUNCEMENT DELIVERY (one-time batch of ${PRO_ANNOUNCEMENT_SENT_DATE}; provider-reported outcomes, counts only):`);

  const batch = await sbSelect<Array<{ email_status: string; provider_message_id: string | null }>>(
    `email_sends?select=email_status,provider_message_id&date=eq.${PRO_ANNOUNCEMENT_SENT_DATE}` +
      `&subscriber_id=is.null&sent_at=gte.${PRO_ANNOUNCEMENT_BATCH_FROM}&sent_at=lt.${PRO_ANNOUNCEMENT_BATCH_TO}&limit=5000`,
  );
  if (batch == null) {
    console.log("  send log UNREADABLE this run — delivery outcomes unavailable (provider acceptance was already reported at dispatch; nothing here implies failure).");
    return;
  }
  // In the send log, email_status 'delivered' means PROVIDER-ACCEPTED at
  // dispatch (the API call succeeded) — not delivery to an inbox.
  const acceptedIds = batch.filter((r) => r.email_status === "delivered" && r.provider_message_id).map((r) => r.provider_message_id as string);
  const loggedFailed = batch.filter((r) => r.email_status !== "delivered").length;
  if (batch.length === 0) {
    console.log("  no batch rows found in the send log — check the environment; delivery outcomes unavailable.");
    return;
  }

  // Fetch this batch's provider events in id chunks (never a broad scan).
  const categories = new Map<string, Set<string>>();
  for (let i = 0; i < acceptedIds.length; i += 60) {
    const chunk = acceptedIds.slice(i, i + 60);
    const rows = await sbSelect<Array<{ provider_message_id: string | null; category: string }>>(
      `email_events?select=provider_message_id,category&provider_message_id=in.(${chunk.join(",")})&limit=10000`,
    );
    if (rows == null) {
      console.log("  provider event store UNREADABLE this run — delivery outcomes unavailable rather than partially reported.");
      return;
    }
    for (const r of rows) {
      if (!r.provider_message_id) continue;
      const set = categories.get(r.provider_message_id) ?? new Set<string>();
      set.add(r.category);
      categories.set(r.provider_message_id, set);
    }
  }

  const withCat = (c: string): number => acceptedIds.filter((id) => categories.get(id)?.has(c)).length;
  const delivered = withCat("delivered");
  const bounced = withCat("bounced");
  const complained = withCat("complained");
  const delayed = withCat("delayed");
  const unknown = acceptedIds.filter((id) => !categories.get(id)?.has("delivered") && !categories.get(id)?.has("bounced")).length;

  console.log(`  accepted:   ${acceptedIds.length} — the provider accepted the message at dispatch (API-level acceptance; the batch denominator)`);
  console.log(`  delivered:  ${delivered} — the provider's webhook reported delivery to the recipient's mail server (not necessarily read)`);
  console.log(`  bounced:    ${bounced} — the provider reported the message could not be delivered`);
  console.log(`  complained: ${complained} — the recipient marked it as spam (a complaint usually FOLLOWS a delivery, so this overlaps with delivered)`);
  if (delayed > 0) console.log(`  delayed:    ${delayed} — transient deferral reported; may later resolve to delivered or bounced (overlaps with both)`);
  console.log(`  no recorded delivery outcome: ${unknown} — UNKNOWN, not failed: absence of a webhook event is absence of evidence, not a bounce.`);
  console.log(`  unique-recipient click rate: ${pct(uniqueClickers, acceptedIds.length)} — distinct clicking recipients ÷ accepted (server-side signed redirects, deduplicated by recipient hash).`);
  if (loggedFailed > 0) console.log(`  (send log also holds ${loggedFailed} dispatch-time failure row(s) — those were reported at dispatch and are outside the accepted denominator.)`);
  console.log(`  reporting cutoff: ${new Date().toISOString()} — events arrive over days; these counts can rise after this instant.`);
  console.log(
    "  coverage: categories are per-message flags that OVERLAP and do not necessarily sum to the accepted count; outcomes exist only where the provider webhook was configured, reachable and forwarded the event — the provider dashboard remains the complete record.",
  );
}

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
  console.log(`Query cutoff for EVERY event metric below: ${end} — the window end, NOT report generation time. The window starts at 00:00 UTC on the since date; if tracking was verified later that day, the first hours predate verified coverage.`);
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
  // The section tracker emits `props.section` (TrackedSection.tsx) — this
  // report originally queried `props.id` and therefore read 0 while the
  // events were being recorded correctly all along (defect found 30 Sep;
  // no data gap, no reconstruction — the stored events were always right).
  // via=verify exclusion applies from the marking's deploy; walkthroughs
  // before it produced unmarked form-section views (a handful at most),
  // which is disclosed with the numbers below.
  const formViews = (sectionRaw ?? []).filter((e) => e.props?.section === "pro-offer-form" && !isVerify(e));
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
  console.log(
    `  form-section views (measured visibility of the price+form section): ${formViews.length}` +
      " — may include unmarked verification walkthroughs from before the via marking deployed (a handful at most); marked verify traffic is excluded.",
  );

  // ── Interest ────────────────────────────────────────────────────────────
  const heroCtas = ctas.filter((e) => e.props?.placement === "hero");
  const formCtas = ctas.filter((e) => e.props?.placement === "form");
  console.log("\nINTEREST:");
  console.log(`  CTA clicks — hero: ${heroCtas.length} · form: ${formCtas.length}`);
  console.log("  CTA clicks by acquisition source:");
  for (const [via, n] of tally(ctas, viaOf)) console.log(`    · ${via}: ${n}`);
  console.log(`  waitlist-join EVENTS (all signup surfaces fire the same event; verify excluded): ${joins.length}`);
  console.log("    by acquisition source (via):");
  for (const [via, n] of tally(joins, viaOf)) console.log(`      · ${via}: ${n}`);
  console.log("    by signup surface (the event's source prop):");
  for (const [src, n] of tally(joins, (e) => (typeof e.props?.source === "string" && e.props.source ? String(e.props.source) : "(unknown)")))
    console.log(`      · ${src}: ${n}`);
  console.log(`  existing-member re-submissions (separate — never conversions): ${existing.length}`);
  // Reconciliation: the TABLE is authoritative, per surface — join events are
  // fired by EVERY signup surface, so they must never share the /pro-only
  // denominator. New rows in the window, by their stored source:
  const waitRows = await sbSelect<Array<{ source: string | null }>>(
    `pro_waitlist?select=source&created_at=gte.${start}&created_at=lt.${end}&limit=10000`,
  );
  const authoritative = waitRows == null ? null : waitRows.filter((r) => r.source === "/pro").length;
  if (waitRows == null) {
    console.log("  NEW waitlist rows in window (authoritative table): UNREADABLE — event counts above cannot be reconciled this run.");
  } else {
    console.log(`  NEW waitlist rows in window (authoritative pro_waitlist table), by signup surface — total ${waitRows.length}:`);
    for (const [src, n] of tally(waitRows, (r) => r.source ?? "(none)")) console.log(`    · ${src}: ${n}`);
    console.log(`    · verified /pro joins (the ONLY numerator for /pro rates): ${authoritative}`);
    if (waitRows.length !== joins.length) {
      console.log(
        `  · reconciliation note: table total (${waitRows.length}) vs join events (${joins.length}) differ — the TABLE is authoritative; events can under-count (ad blockers, beacon loss) and cover every surface, so per-surface rows are the check.`,
      );
    }
  }

  // ── Email placements (delivery + confirmed clicks) ──────────────────────
  const clicks = (emailClicksRaw ?? []).filter((e) => typeof e.props?.campaign === "string");
  const proIntroClicks = clicks.filter((e) => String(e.props?.campaign) === "lifecycle-pro_intro");
  const annClicks = clicks.filter((e) => String(e.props?.campaign) === PRO_ANNOUNCEMENT_CAMPAIGN);
  const introSent = await sbCount("lifecycle_sends", `step=eq.pro_intro&sent_at=gte.${start}&sent_at=lt.${end}`);
  console.log("\nEMAIL PLACEMENTS (clicks are confirmed; opens are estimated and deliberately not used here):");
  console.log(`  Pro introductions recorded in window (onboarding + announcement share the pro_intro key): ${introSent ?? "UNREADABLE"}`);
  // Click EVENTS vs distinct RECIPIENTS: every signed-redirect event carries
  // the recipient hash (props.sub), so deduplication is supported — a
  // unique-recipient rate may only ever be stated from the distinct count.
  const distinctSubs = (evs: Ev[]): { unique: number; noSub: number } => {
    const subs = new Set<string>();
    let noSub = 0;
    for (const e of evs) {
      const s = e.props?.sub;
      if (typeof s === "string" && s) subs.add(s);
      else noSub += 1;
    }
    return { unique: subs.size, noSub };
  };
  const annD = distinctSubs(annClicks);
  const introD = distinctSubs(proIntroClicks);
  console.log(
    `  confirmed clicks — onboarding pro_intro: ${proIntroClicks.length} events / ${introD.unique} distinct recipients · announcement: ${annClicks.length} events / ${annD.unique} distinct recipients` +
      (annD.noSub + introD.noSub > 0 ? ` (${annD.noSub + introD.noSub} event(s) without a recipient hash counted in events only)` : ""),
  );
  const elapsedMs = Date.parse(end) - Date.parse(PRO_ANNOUNCEMENT_DISPATCH_COMPLETED);
  if (elapsedMs > 0) {
    const d = Math.floor(elapsedMs / 86_400_000);
    const h = Math.floor((elapsedMs % 86_400_000) / 3_600_000);
    const m = Math.floor((elapsedMs % 3_600_000) / 60_000);
    console.log(`  campaign elapsed at the query cutoff: ${d}d ${h}h ${m}m (dispatch completed ${PRO_ANNOUNCEMENT_DISPATCH_COMPLETED} → cutoff ${end})`);
  }

  await announcementDelivery(annD.unique);

  // ── Rates (consistent denominators, stated inline) ─────────────────────
  console.log("\nRATES (each denominator stated — never mix denominators across rates):");
  console.log(`  form-section visibility per offer view: ${pct(formViews.length, views.length)}`);
  console.log(`  form CTA per form-section view: ${pct(formCtas.length, formViews.length)}`);
  console.log(
    `  joins per offer view (authoritative /pro table rows ÷ /pro offer views — never event joins from other surfaces): ${authoritative == null ? "n/a (table unreadable)" : pct(authoritative, views.length)}`,
  );
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
