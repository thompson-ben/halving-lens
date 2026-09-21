// One-off founder feedback email to EXISTING Pro-waitlist members
// (founder commission, 20 Sep 2026). Run via the dispatch-only workflow
// pro-waitlist-feedback.yml — never on a schedule.
//
//   MODE=dry-run (default) — reports the eligible recipients (masked) and
//     every exclusion with its reason. Sends nothing, writes nothing.
//   MODE=test — sends BOTH templates (feedback + confirmation) to
//     FOUNDER_EMAIL only, to verify rendering and Reply-To routing. Nothing
//     is recorded, no member is touched.
//   MODE=send — the real one-off. Refuses unless CONFIRM_SEND=SEND. Each
//     eligible member is emailed AT MOST ONCE EVER via the
//     pro_waitlist_emails log (unique on lower(email)+kind).
//
// ELIGIBILITY (overlap prevention + suppression, all reported per member):
//   · on the pro_waitlist;
//   · has NEVER been sent the 'feedback' email (idempotent re-runs);
//   · has NEVER been sent the 'confirmation' email — anyone who joined after
//     the signup-confirmation flow deployed already got the founder question
//     there, so the two flows can never overlap;
//   · not an unsubscribed Brief subscriber (conservative reading of "honour
//     existing suppression": someone who opted out of HalvingLens email is
//     not emailed a survey, even though the Pro list is a separate consent).

import { sbSelect } from "../src/lib/supabase";
import { resendConfigured, sendEmail } from "../src/lib/resend";
import {
  hasProEmail,
  PRO_FEEDBACK_FLOW_LIVE_FROM,
  proConfirmationEmail,
  proFeedbackEmail,
  proReplyTo,
  sendProWaitlistEmail,
} from "../src/lib/proWaitlistEmails";

const MODE = (process.env.MODE || "dry-run").trim();

const mask = (email: string): string => {
  const [user, domain] = email.split("@");
  return `${(user ?? "").slice(0, 1)}***@${domain ?? "?"}`;
};

interface WaitlistRow {
  email: string;
  source: string;
  created_at: string;
}

async function eligibleMembers(): Promise<{ eligible: WaitlistRow[]; excluded: Array<{ email: string; reason: string }> } | null> {
  const rows = await sbSelect<WaitlistRow[]>("pro_waitlist?select=email,source,created_at&order=created_at.asc&limit=10000");
  if (rows == null) {
    console.error("[feedback] cannot read pro_waitlist — aborting (nothing sent).");
    return null;
  }
  const unsubs = await sbSelect<{ email: string }[]>("brief_subscribers?select=email&status=eq.unsubscribed&limit=20000");
  if (unsubs == null) {
    console.error("[feedback] cannot read suppression state — aborting (nothing sent).");
    return null;
  }
  const suppressed = new Set((unsubs ?? []).map((r) => r.email.toLowerCase()));
  // Founder decision (21 Sep): the founder's own internal address (an early
  // form test) is excluded from the one-off — the waitlist ROW is retained
  // untouched; only this send skips it. Derived from the existing
  // FOUNDER_EMAIL configuration, never a hardcoded address.
  const internal = (process.env.FOUNDER_EMAIL || "").trim().toLowerCase();

  const eligible: WaitlistRow[] = [];
  const excluded: Array<{ email: string; reason: string }> = [];
  for (const r of rows) {
    const email = r.email.toLowerCase();
    if (internal && email === internal) {
      excluded.push({ email, reason: "internal founder address — excluded from the one-off (founder decision, 21 Sep); waitlist record retained" });
      continue;
    }
    if (suppressed.has(email)) {
      excluded.push({ email, reason: "unsubscribed Brief subscriber (suppressed)" });
      continue;
    }
    const gotFeedback = await hasProEmail(email, "feedback");
    const gotConfirmation = await hasProEmail(email, "confirmation");
    if (gotFeedback == null || gotConfirmation == null) {
      excluded.push({ email, reason: "send log unreadable — fail safe, skipped" });
      continue;
    }
    if (gotFeedback) {
      excluded.push({ email, reason: "feedback email already sent" });
      continue;
    }
    if (gotConfirmation) {
      excluded.push({ email, reason: "already received the signup confirmation (question already asked)" });
      continue;
    }
    eligible.push({ ...r, email });
  }
  return { eligible, excluded };
}

async function main(): Promise<void> {
  console.log(`[feedback] mode=${MODE}`);

  if (MODE === "test") {
    // Recipient = the INTERNAL founder inbox (FOUNDER_EMAIL); Reply-To = the
    // PUBLIC address (PRO_REPLY_TO_EMAIL), exactly as production sends it —
    // so the test verifies the real reply routing, and refuses rather than
    // ever exposing an internal address.
    const to = (process.env.FOUNDER_EMAIL || "").trim().toLowerCase();
    if (!to) throw new Error("test mode needs FOUNDER_EMAIL (the internal test recipient)");
    if (!resendConfigured) throw new Error("test mode needs RESEND_API_KEY");
    const replyTo = proReplyTo();
    if (!replyTo) throw new Error("test mode needs PRO_REPLY_TO_EMAIL (the public reply address) — no fallback");
    for (const [name, c] of [
      ["feedback", proFeedbackEmail()],
      ["confirmation", proConfirmationEmail()],
    ] as const) {
      const res = await sendEmail({ to, subject: `[TEST] ${c.subject}`, html: c.html, text: c.text, replyTo });
      console.log(`[feedback] test ${name} → ${mask(to)}: ${res.ok ? `sent (${res.id})` : `FAILED (${res.error})`}`);
      if (!res.ok) process.exitCode = 1;
    }
    console.log(`[feedback] verify in your inbox: rendering, and that Reply goes to ${mask(replyTo)}. Nothing recorded, no member touched.`);
    return;
  }

  // Reconciliation surface (founder review, 21 Sep): claims whose sends are
  // NOT confirmed-accepted — 'pending' (e.g. a crash after claiming but
  // before sending) or 'ambiguous' (the provider may have accepted before a
  // timeout). These members hold a claim, so they are EXCLUDED from any
  // send; they must be reconciled manually (check Resend by the
  // deterministic idempotency key / provider id) and never silently missed.
  const uncertain = await sbSelect<{ email: string; kind: string; status: string; claimed_at: string }[]>(
    "pro_waitlist_emails?select=email,kind,status,claimed_at&status=neq.sent&limit=1000",
  );
  if (uncertain == null) {
    console.error("[feedback] cannot read the send log for uncertain claims — aborting (nothing sent).");
    process.exitCode = 1;
    return;
  }
  if (uncertain.length > 0) {
    console.log(`[feedback] UNCERTAIN CLAIMS requiring reconciliation (pending/ambiguous — excluded from sends): ${uncertain.length}`);
    for (const u of uncertain) console.log(`  · ${mask(u.email)} — ${u.kind} · ${u.status} · claimed ${u.claimed_at}`);
  } else {
    console.log("[feedback] uncertain claims: none — every logged send is provider-confirmed.");
  }

  const members = await eligibleMembers();
  if (members == null) {
    process.exitCode = 1;
    return;
  }
  const { eligible, excluded } = members;

  console.log(`[feedback] waitlist total: ${eligible.length + excluded.length}`);
  console.log(`[feedback] ELIGIBLE for the one-off feedback email: ${eligible.length}`);
  for (const m of eligible) console.log(`  · ${mask(m.email)} (joined ${m.created_at.slice(0, 10)}, source ${m.source})`);
  // Members who joined AFTER the confirmation flow shipped but hold no
  // confirmation row were MISSED (schema not yet applied, or a send
  // failure). Never silently lost: they are reported here explicitly, and
  // the one-off founder note is their remediation — it asks the fuller
  // questions and its claim permanently prevents any double-ask.
  const missed = eligible.filter((m) => m.created_at.slice(0, 10) >= PRO_FEEDBACK_FLOW_LIVE_FROM);
  if (missed.length > 0) {
    console.log(`[feedback] of which MISSED CONFIRMATIONS (joined on/after ${PRO_FEEDBACK_FLOW_LIVE_FROM}, none recorded): ${missed.length}`);
    for (const m of missed) console.log(`  · ${mask(m.email)} (joined ${m.created_at.slice(0, 10)}) — will receive the founder note instead`);
  }
  console.log(`[feedback] excluded: ${excluded.length}`);
  for (const x of excluded) console.log(`  · ${mask(x.email)} — ${x.reason}`);

  if (MODE !== "send") {
    console.log("[feedback] dry-run complete — nothing sent, nothing written.");
    return;
  }
  if (process.env.CONFIRM_SEND !== "SEND") {
    console.error("[feedback] MODE=send requires CONFIRM_SEND=SEND — refusing.");
    process.exitCode = 1;
    return;
  }
  if (!resendConfigured || !proReplyTo()) {
    console.error("[feedback] send needs RESEND_API_KEY and PRO_REPLY_TO_EMAIL (the public Reply-To) — refusing.");
    process.exitCode = 1;
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const m of eligible) {
    const res = await sendProWaitlistEmail(m.email, "feedback");
    if (res.outcome === "sent") {
      sent += 1;
      console.log(`  ✓ ${mask(m.email)} sent`);
    } else {
      failed += 1;
      console.error(`  ✗ ${mask(m.email)} ${res.outcome}${res.error ? ` (${res.error})` : ""}`);
    }
  }
  console.log(`[feedback] RESULT: recipients=${eligible.length} sent=${sent} failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`[feedback] fatal: ${(e as Error).message}`);
  process.exit(1);
});
