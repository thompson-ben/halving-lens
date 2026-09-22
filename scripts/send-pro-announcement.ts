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
// day-18 onboarding step share the lifecycle_sends step key "pro_intro".
// Whichever reaches a subscriber first permanently blocks the other — the
// onboarding engine already skips recorded steps, and this script excludes
// recorded addresses. Re-runs are therefore safe no-ops for anyone already
// sent.
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
  segments: { clicked60d: number; openedOnly60d: number; noRecordedEngagement: number };
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
      excluded.push({ email, reason: "already received a Pro introduction (pro_intro recorded)" });
      continue;
    }
    eligible.push({ ...s, email });
  }

  // Engagement segments — reported SEPARATELY, never used to shrink the
  // audience: a confirmed click is real engagement; an open is only an
  // ESTIMATE (Apple MPP and image proxies inflate it); absence of both is
  // "no recorded engagement", not proof of disinterest.
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const events = await sbSelect<{ email_hash: string | null; category: string }[]>(
    `email_events?select=email_hash,category&category=in.(opened,clicked)&occurred_at=gte.${since}&limit=200000`,
  );
  const clicked = new Set<string>();
  const opened = new Set<string>();
  for (const e of events ?? []) {
    if (!e.email_hash) continue;
    if (e.category === "clicked") clicked.add(e.email_hash);
    else opened.add(e.email_hash);
  }
  let clicked60d = 0;
  let openedOnly60d = 0;
  for (const m of eligible) {
    const h = emailHash(m.email);
    if (clicked.has(h)) clicked60d += 1;
    else if (opened.has(h)) openedOnly60d += 1;
  }
  const segments = {
    clicked60d,
    openedOnly60d,
    noRecordedEngagement: eligible.length - clicked60d - openedOnly60d,
  };
  if (events == null) console.log("[announce] note: engagement events unreadable — segments reported as zero, audience unaffected.");
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

  const audience = await buildAudience();
  if (audience == null) {
    process.exitCode = 1;
    return;
  }
  const { eligible, excluded, segments } = audience;
  console.log(`[announce] active subscribers considered: ${eligible.length + excluded.length}`);
  console.log(`[announce] ELIGIBLE for the one-time announcement: ${eligible.length}`);
  console.log(
    `[announce] engagement segments (informational — opens are ESTIMATED, absence is not disinterest): confirmed click in 60d=${segments.clicked60d} · opened-only in 60d=${segments.openedOnly60d} · no recorded engagement=${segments.noRecordedEngagement}`,
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
  const logs: Record<string, unknown>[] = [];
  for (const m of eligible) {
    const ctx = ctxFor(m.email);
    const c = buildProAnnouncementEmail(ctx);
    const res = await sendEmail({
      to: m.email,
      subject: c.subject,
      html: c.html,
      text: c.text,
      replyTo,
      headers: { "List-Unsubscribe": `<${ctx.unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (res.ok) {
      sent += 1;
      // Recorded ONLY on provider acceptance — a transient failure stays
      // eligible for a founder-approved re-run; a recorded address is
      // permanently blocked here AND in the onboarding drip (shared key).
      await sbInsert("lifecycle_sends", { email: m.email, step: "pro_intro" });
      console.log(`  ✓ ${mask(m.email)} sent`);
    } else {
      failed += 1;
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
  console.log(`[announce] RESULT: recipients=${eligible.length} sent=${sent} failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`[announce] fatal: ${(e as Error).message}`);
  process.exit(1);
});
