// ONE-TIME Pro introduction to eligible existing free subscribers
// (founder commission: Pro discovery & measurement, Sep 2026). Run via the
// dispatch-only workflow pro-announcement.yml — never on a schedule, and
// never without the founder's explicit approval of copy, audience and
// dispatch.
//
//   MODE=dry-run (default) — read-only audience report: eligible count,
//     every exclusion with its reason, and engagement segments (reported
//     separately — an email open is ESTIMATED engagement, never proof).
//     Sends nothing, writes nothing.
//   MODE=test — sends the announcement to FOUNDER_EMAIL only (subject
//     prefixed [TEST]), with the production Reply-To, to verify rendering
//     and reply routing. Nothing recorded, no subscriber touched.
//   MODE=send — the real one-off. Refuses unless CONFIRM_SEND=SEND.
//
// OVERLAP RULE (one Pro introduction per address, EVER): this send and the
// day-18 onboarding step share the lifecycle_sends step key "pro_intro",
// and BOTH claim the row atomically BEFORE sending (conflict-aware insert
// against the unique lower(email)+step index), so even fully concurrent
// runs cannot both send — the database arbitrates, the loser skips. A
// deterministic, channel-independent provider Idempotency-Key backs this
// up at the provider. Ambiguous provider outcomes (timeout/5xx) RETAIN the
// claim as 'ambiguous' for manual reconciliation — never released, never
// blindly retried; only a definitive 4xx releases it. Re-runs are safe
// no-ops for anyone already claimed or sent.
//
// ELIGIBILITY (checked fresh at send time, all exclusions reported):
//   · an ACTIVE Daily Brief subscriber (status active/null — the existing
//     definition; unsubscribed/suppressed are excluded by status);
//   · NOT already on the Pro waitlist (never solicited for a list they are
//     already on);
//   · NOT already sent any Pro introduction (lifecycle_sends pro_intro);
//   · not the internal founder/test address (env-derived, never hardcoded).
// Nothing here ever writes to pro_waitlist — no one is auto-enrolled.

import { sbSelect, sbInsert } from "../src/lib/supabase";
import {
  claimProIntro,
  markProIntroSent,
  proIntroIdempotencyKey,
  releaseProIntroClaim,
  retainProIntroAmbiguous,
  uncertainProIntroClaims,
} from "../src/lib/lifecycleClaims";
import { resendConfigured, sendEmail } from "../src/lib/resend";
import { proReplyTo } from "../src/lib/proWaitlistEmails";
import { buildProAnnouncementEmail, type LifecycleCtx } from "../src/lib/lifecycleEmails";
import { unsubToken } from "../src/lib/emailToken";
import { emailTracking, emailHash } from "../src/lib/emailTracking";
import { absoluteUrl, SITE_URL } from "../src/lib/site";
import { referralCode } from "../src/lib/referral";
// One campaign id for the whole one-off — email_click / email_events rows
// carry it, so delivery and confirmed clicks are queryable per campaign.
import { PRO_ANNOUNCEMENT_CAMPAIGN } from "../src/lib/lifecycleConfig";

const MODE = (process.env.MODE || "dry-run").trim();

const mask = (email: string): string => {
  const [user, domain] = email.split("@");
  return `${(user ?? "").slice(0, 1)}***@${domain ?? "?"}`;
};

interface Sub {
  email: string;
  signup_at: string | null;
}

interface Audience {
  eligible: Sub[];
  excluded: Array<{ email: string; reason: string }>;
  segments: { clickedConfirmed60d: number; openedOnlyEstimated60d: number; noRecordedEngagement: number };
}

async function buildAudience(): Promise<Audience | null> {
  const subs = await sbSelect<Sub[]>(
    "brief_subscribers?select=email,signup_at&or=(status.is.null,status.eq.active)&order=signup_at.asc&limit=20000",
  );
  if (subs == null) {
    console.error("[announce] cannot read subscribers — aborting (nothing sent).");
    return null;
  }
  const waitlist = await sbSelect<{ email: string }[]>("pro_waitlist?select=email&limit=100000");
  if (waitlist == null) {
    console.error("[announce] cannot read pro_waitlist — aborting (nothing sent).");
    return null;
  }
  const sent = await sbSelect<{ email: string }[]>("lifecycle_sends?select=email&step=eq.pro_intro&limit=100000");
  if (sent == null) {
    console.error("[announce] cannot read the pro_intro send history — aborting (nothing sent).");
    return null;
  }
  const onWaitlist = new Set(waitlist.map((r) => r.email.toLowerCase()));
  const alreadyIntroduced = new Set(sent.map((r) => r.email.toLowerCase()));
  const internal = (process.env.FOUNDER_EMAIL || "").trim().toLowerCase();

  const eligible: Sub[] = [];
  const excluded: Array<{ email: string; reason: string }> = [];
  const seen = new Set<string>();
  for (const s of subs) {
    const email = s.email.toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    if (internal && email === internal) {
      excluded.push({ email, reason: "internal founder/test address (env-derived exclusion)" });
      continue;
    }
    if (onWaitlist.has(email)) {
      excluded.push({ email, reason: "already on the Pro waitlist — never solicited twice" });
      continue;
    }
    if (alreadyIntroduced.has(email)) {
      excluded.push({ email, reason: "pro_intro already recorded (sent, or a pending/ambiguous claim — blocks both channels)" });
      continue;
    }
    eligible.push({ ...s, email });
  }

  // Engagement segments — reported SEPARATELY, never used to shrink the
  // audience. CONFIRMED clicks combine two existing sources (no new
  // tracking): the site's signed-redirect email_click events (server-side,
  // complete for every tracked link) and any provider-reported clicks in
  // the webhook table. Provider OPENS stay separately labelled as an
  // ESTIMATE (Apple MPP and image proxies inflate them, and webhook
  // coverage may not ingest them at all). Absence of both is "no recorded
  // engagement" — a coverage statement, never proof of disinterest.
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const provider = await sbSelect<{ email_hash: string | null; category: string }[]>(
    `email_events?select=email_hash,category&category=in.(opened,clicked)&occurred_at=gte.${since}&limit=200000`,
  );
  const redirect = await sbSelect<{ props: Record<string, unknown> | null }[]>(
    `events?select=props&name=eq.email_click&created_at=gte.${since}&limit=200000`,
  );
  const clicked = new Set<string>();
  const opened = new Set<string>();
  for (const e of provider ?? []) {
    if (!e.email_hash) continue;
    if (e.category === "clicked") clicked.add(e.email_hash);
    else opened.add(e.email_hash);
  }
  for (const e of redirect ?? []) {
    const sub = e.props?.sub;
    if (typeof sub === "string" && sub) clicked.add(sub);
  }
  let clickedConfirmed60d = 0;
  let openedOnlyEstimated60d = 0;
  for (const m of eligible) {
    const h = emailHash(m.email);
    if (clicked.has(h)) clickedConfirmed60d += 1;
    else if (opened.has(h)) openedOnlyEstimated60d += 1;
  }
  const segments = {
    clickedConfirmed60d,
    openedOnlyEstimated60d,
    noRecordedEngagement: eligible.length - clickedConfirmed60d - openedOnlyEstimated60d,
  };
  if (provider == null) console.log("[announce] note: provider engagement events unreadable — provider opens/clicks reported as zero, audience unaffected.");
  if (redirect == null) console.log("[announce] note: signed-redirect click events unreadable — redirect clicks reported as zero, audience unaffected.");
  return { eligible, excluded, segments };
}

function ctxFor(email: string): LifecycleCtx {
  const unsubUrl = absoluteUrl(`/api/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`);
  return {
    email,
    unsubUrl,
    tracking: emailTracking(email, PRO_ANNOUNCEMENT_CAMPAIGN),
    referralLink: `${SITE_URL}/?ref=${referralCode(email)}`,
  };
}

async function main(): Promise<void> {
  console.log(`[announce] mode=${MODE} campaign=${PRO_ANNOUNCEMENT_CAMPAIGN}`);

  if (MODE === "test") {
    const to = (process.env.FOUNDER_EMAIL || "").trim().toLowerCase();
    if (!to) throw new Error("test mode needs FOUNDER_EMAIL (the internal test recipient)");
    if (!resendConfigured) throw new Error("test mode needs RESEND_API_KEY");
    const replyTo = proReplyTo();
    if (!replyTo) throw new Error("test mode needs PRO_REPLY_TO_EMAIL (the public reply address) — no fallback");
    const c = buildProAnnouncementEmail(ctxFor(to));
    const res = await sendEmail({ to, subject: `[TEST] ${c.subject}`, html: c.html, text: c.text, replyTo });
    console.log(`[announce] test → ${mask(to)}: ${res.ok ? `sent (${res.id})` : `FAILED (${res.error})`}`);
    if (!res.ok) process.exitCode = 1;
    else console.log(`[announce] verify rendering and that Reply goes to ${mask(replyTo)}. Nothing recorded, no subscriber touched.`);
    return;
  }

  // Reconciliation surface: pro_intro claims whose sends are NOT
  // provider-confirmed. These addresses are excluded from any send (the
  // claim row blocks them) and must be reconciled manually — check the
  // provider by the deterministic idempotency key, then either mark the
  // row 'sent' or delete it. Unreadable → nothing may send blind.
  const uncertain = await uncertainProIntroClaims();
  if (uncertain == null) {
    console.log("[announce] uncertain pro_intro claims UNREADABLE — has the rev-2 lifecycle_sends migration (status column) been applied?");
    if (MODE === "send") {
      console.error("[announce] refusing to send without a readable claim state.");
      process.exitCode = 1;
      return;
    }
  } else if (uncertain.length > 0) {
    console.log(`[announce] UNCERTAIN pro_intro claims requiring reconciliation (excluded from sends): ${uncertain.length}`);
    for (const u of uncertain) console.log(`  · ${mask(u.email)} — ${u.status} · claimed ${u.sent_at}`);
  } else {
    console.log("[announce] uncertain pro_intro claims: none — every recorded introduction is provider-confirmed.");
  }

  const audience = await buildAudience();
  if (audience == null) {
    process.exitCode = 1;
    return;
  }
  const { eligible, excluded, segments } = audience;
  console.log(`[announce] active subscribers considered: ${eligible.length + excluded.length}`);
  console.log(`[announce] ELIGIBLE for the one-time announcement: ${eligible.length}`);
  console.log(
    `[announce] engagement segments (informational; audience unaffected): CONFIRMED click in 60d=${segments.clickedConfirmed60d} (signed-redirect + provider) · provider-open only in 60d=${segments.openedOnlyEstimated60d} (ESTIMATED — inflated by mail proxies, and webhook coverage may miss opens entirely) · no recorded engagement=${segments.noRecordedEngagement} (a coverage statement, not disinterest)`,
  );
  console.log(`[announce] excluded: ${excluded.length}`);
  const byReason = new Map<string, number>();
  for (const x of excluded) byReason.set(x.reason, (byReason.get(x.reason) ?? 0) + 1);
  for (const [reason, n] of byReason) console.log(`  · ${n} — ${reason}`);
  for (const x of excluded) console.log(`    - ${mask(x.email)} — ${x.reason}`);

  if (MODE !== "send") {
    console.log("[announce] dry-run complete — nothing sent, nothing written.");
    return;
  }
  if (process.env.CONFIRM_SEND !== "SEND") {
    console.error("[announce] MODE=send requires CONFIRM_SEND=SEND — refusing.");
    process.exitCode = 1;
    return;
  }
  const replyTo = proReplyTo();
  if (!resendConfigured || !replyTo) {
    console.error("[announce] send needs RESEND_API_KEY and PRO_REPLY_TO_EMAIL (the public Reply-To) — refusing.");
    process.exitCode = 1;
    return;
  }

  let sent = 0;
  let failed = 0;
  let claimHeld = 0;
  let ambiguous = 0;
  const logs: Record<string, unknown>[] = [];
  for (const m of eligible) {
    // CLAIM FIRST — the database arbitrates a concurrent onboarding run.
    const claim = await claimProIntro(m.email);
    if (claim !== "claimed") {
      claimHeld += 1;
      console.log(`  · ${mask(m.email)} skipped — ${claim === "already" ? "claim already held (other channel or earlier run)" : "claim store unavailable (fail closed)"}`);
      continue;
    }
    const ctx = ctxFor(m.email);
    const c = buildProAnnouncementEmail(ctx);
    const res = await sendEmail({
      to: m.email,
      subject: c.subject,
      html: c.html,
      text: c.text,
      replyTo,
      idempotencyKey: proIntroIdempotencyKey(m.email),
      headers: { "List-Unsubscribe": `<${ctx.unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (res.ok) {
      sent += 1;
      // The claim becomes the permanent record on provider acceptance —
      // permanently blocking this address here AND in the onboarding drip.
      await markProIntroSent(m.email);
      console.log(`  ✓ ${mask(m.email)} sent`);
    } else if (res.ambiguous) {
      // The provider MAY have accepted (timeout/5xx): RETAIN the claim as
      // 'ambiguous' — never released, never blindly retried; reconcile via
      // the provider dashboard using the deterministic idempotency key.
      ambiguous += 1;
      failed += 1;
      await retainProIntroAmbiguous(m.email);
      console.error(`  ? ${mask(m.email)} AMBIGUOUS (${res.error}) — claim retained for reconciliation`);
    } else {
      failed += 1;
      // Definitive rejection: release the claim so a re-run may retry.
      await releaseProIntroClaim(m.email);
      console.error(`  ✗ ${mask(m.email)} FAILED (${res.error})`);
    }
    logs.push({
      date: new Date().toISOString().slice(0, 10),
      subscriber_id: null,
      email: m.email,
      email_status: res.ok ? "delivered" : "failed",
      provider_message_id: res.id ?? null,
      error: res.ok ? null : (res.error ?? "unknown").slice(0, 300),
    });
  }
  for (let i = 0; i < logs.length; i += 500) await sbInsert("email_sends", logs.slice(i, i + 500));
  console.log(`[announce] RESULT: recipients=${eligible.length} sent=${sent} failed=${failed} ambiguousRetained=${ambiguous} claimHeld=${claimHeld}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`[announce] fatal: ${(e as Error).message}`);
  process.exit(1);
});
