// Pro-waitlist founder emails (feedback flow, founder commission 20 Sep 2026).
//
// Two personal, plain founder notes — deliberately NOT the house dark email
// template: simple paragraphs, founder voice, reply-first.
//
//   'confirmation' — sent ONCE, server-side, on a person's FIRST successful
//     waitlist join (the API's "created" outcome only — a duplicate 409 never
//     triggers it). Confirms their place and asks one open feedback question.
//   'feedback'     — the one-off founder note to members who joined BEFORE
//     the confirmation flow existed, sent by the dispatch-only workflow.
//
// Contracts (CI-pinned in test-member-growth):
//   · Reply-To is the PUBLIC HalvingLens founder address — its own dedicated
//     PRO_REPLY_TO_EMAIL configuration (ben@halvinglens.com), kept separate
//     from FOUNDER_EMAIL, which stays internal-only (notifications and test
//     recipients). There is deliberately NO fallback: without the public
//     address configured, nothing sends — a reply-first email must never go
//     out with a broken reply path, and the internal business address must
//     never be exposed to subscribers.
//   · No prices, no alert/feature pitching — these emails LISTEN, they do
//     not steer (the founder's explicit rule).
//   · Once per person per kind, ever: the pro_waitlist_emails log (unique on
//     lower(email) + kind) is checked before and recorded after every send,
//     which is also what keeps the one-off and the signup flow from ever
//     overlapping.

import { createHash } from "node:crypto";
import { sendEmail, resendConfigured } from "./resend";
import { sbSelect, sbDelete, sbUpdate } from "./supabase";

export type ProWaitlistEmailKind = "confirmation" | "feedback";

/** The PUBLIC reply address for waitlist conversations (PRO_REPLY_TO_EMAIL,
 *  ben@halvinglens.com). NEVER falls back to any other address. */
export function proReplyTo(): string | null {
  const v = (process.env.PRO_REPLY_TO_EMAIL || "").trim().toLowerCase();
  return v || null;
}

export interface ProEmailContent {
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Minimal personal rendering: the plain-text is the source of truth; the HTML
// part is the same words as simple paragraphs in a plain reading column.
function personalHtml(paragraphs: string[]): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 14px;font:400 15px/1.6 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1e21;">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 16px;background:#ffffff;"><div style="max-width:560px;margin:0 auto;">
${body}
</div></body></html>`;
}

// ── The founder-approved copy, verbatim ─────────────────────────────────────

export function proFeedbackEmail(): ProEmailContent {
  const paragraphs = [
    "Hi,",
    "Ben here, founder of HalvingLens. Thanks for joining the Pro waitlist.",
    "I’m shaping what Pro will include and would really appreciate your input:",
    "1. What caught your attention enough to join the waitlist?\n2. When you last checked Bitcoin conditions, what were you trying to understand—and which tools or sources did you use?\n3. What was frustrating or missing from that experience?",
    "Just hit reply—even a quick answer to one question would be helpful.",
    "Thanks,\nBen\nFounder, HalvingLens",
  ];
  return {
    subject: "A quick question about HalvingLens Pro",
    text: paragraphs.join("\n\n"),
    html: personalHtml(paragraphs),
  };
}

export function proConfirmationEmail(): ProEmailContent {
  const paragraphs = [
    "Hi,",
    "Thanks for joining the HalvingLens Pro waitlist. I’ll email you when there’s an update on availability and what’s included.",
    "One quick question: what are you hoping Pro will help you with?",
    "Just hit reply—I’d appreciate hearing what matters most to you as I shape the offering.",
    "Thanks,\nBen\nFounder, HalvingLens",
  ];
  return {
    subject: "You’re on the HalvingLens Pro waitlist",
    text: paragraphs.join("\n\n"),
    html: personalHtml(paragraphs),
  };
}

export function proEmailContent(kind: ProWaitlistEmailKind): ProEmailContent {
  return kind === "feedback" ? proFeedbackEmail() : proConfirmationEmail();
}

// ── Send log (pro_waitlist_emails — the once-per-person-per-kind authority) ─

/** The date the confirmation flow shipped — members who joined on/after this
 *  but hold no confirmation row were MISSED (schema not yet applied, or a
 *  send failure) and must be reported, never silently lost. */
export const PRO_FEEDBACK_FLOW_LIVE_FROM = "2026-09-20";

/** Read-only view of the log — used for REPORTING (eligibility lists).
 *  Duplicate SAFETY never relies on this: that is the claim's job below. */
export async function hasProEmail(email: string, kind: ProWaitlistEmailKind): Promise<boolean | null> {
  const rows = await sbSelect<{ id: number }[]>(
    `pro_waitlist_emails?select=id&email=ilike.${encodeURIComponent(email)}&kind=eq.${kind}&limit=1`,
  );
  if (rows == null) return null; // store unreadable — caller must fail SAFE (skip)
  return rows.length > 0;
}

// ── The atomic claim (AT-MOST-ONCE, arbitrated by the database) ─────────────
//
// The log row is written BEFORE the send, as a PENDING CLAIM (sent_at stays
// NULL until the provider confirms acceptance). The unique index on
// lower(email) ALONE makes concurrent claims lose atomically — including
// ACROSS KINDS, so a member can never concurrently receive both the
// confirmation and the founder note. sbInsert deliberately treats 409 as
// success, so the claim uses its own conflict-aware insert.
//
// Outcome handling after the send (founder review, 21 Sep):
//   · provider ACCEPTED → the claim becomes status 'sent' with sent_at +
//     the provider id (a successful send can never lose its record — the
//     record precedes it);
//   · DEFINITIVE rejection (4xx) → the claim is released; a retry may
//     re-claim, and the deterministic Idempotency-Key makes even an
//     overlapping retry dedup-safe provider-side;
//   · AMBIGUOUS outcome (timeout / no response / 5xx — the provider MAY
//     have accepted) → the claim is RETAINED as status 'ambiguous' for
//     manual reconciliation. It is never released and never blindly
//     retried: at-most-once always wins over delivery.

type ClaimResult = "claimed" | "already" | "unavailable";

async function claimSend(email: string, kind: ProWaitlistEmailKind): Promise<ClaimResult> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "unavailable";
  try {
    const res = await fetch(`${url}/rest/v1/pro_waitlist_emails`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ email: email.toLowerCase(), kind, status: "pending" }),
    });
    if (res.status === 409) return "already"; // a claim (either kind) already exists for this member
    if (res.ok) return "claimed";
    return "unavailable"; // schema missing / store down — nothing may send
  } catch {
    return "unavailable";
  }
}

const claimFilter = (email: string, kind: ProWaitlistEmailKind) =>
  `email=eq.${encodeURIComponent(email.toLowerCase())}&kind=eq.${kind}`;

async function releaseClaim(email: string, kind: ProWaitlistEmailKind): Promise<boolean> {
  return sbDelete("pro_waitlist_emails", claimFilter(email, kind));
}

/** Deterministic provider idempotency key for one logical send — stable
 *  across processes and retries, distinct per kind, carrying no readable
 *  address (the provider already receives the address itself). */
export function proEmailIdempotencyKey(email: string, kind: ProWaitlistEmailKind): string {
  return `pro-waitlist/${kind}/${createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32)}`;
}

export interface ProEmailSendResult {
  outcome:
    | "sent"
    | "sent_record_incomplete"
    | "already_sent"
    | "skipped_unconfigured"
    | "skipped_unverifiable"
    | "send_failed"
    | "send_failed_claim_stuck"
    | "send_ambiguous_retained";
  error?: string;
}

/** Send one kind to one member, AT MOST ONCE EVER — concurrency-safe and
 *  ambiguity-safe (see the contract above). Every failure ordering biases
 *  toward a missed-but-identifiable email, never a duplicate. */
export async function sendProWaitlistEmail(email: string, kind: ProWaitlistEmailKind): Promise<ProEmailSendResult> {
  const replyTo = proReplyTo();
  if (!resendConfigured || !replyTo) return { outcome: "skipped_unconfigured" };
  const claim = await claimSend(email, kind);
  if (claim === "already") return { outcome: "already_sent" };
  if (claim === "unavailable") return { outcome: "skipped_unverifiable" };
  const c = proEmailContent(kind);
  const res = await sendEmail({
    to: email,
    subject: c.subject,
    html: c.html,
    text: c.text,
    replyTo,
    idempotencyKey: proEmailIdempotencyKey(email, kind),
  });
  if (res.ok) {
    // Provider ACCEPTED — only now does sent_at exist.
    const recorded = await sbUpdate("pro_waitlist_emails", claimFilter(email, kind), {
      status: "sent",
      sent_at: new Date().toISOString(),
      provider_id: res.id ?? null,
    });
    if (recorded) return { outcome: "sent" };
    // Accepted but the status update failed: the pending claim still blocks
    // duplicates and will surface in the stale-claim report for
    // reconciliation against the provider id logged here.
    return { outcome: "sent_record_incomplete", error: `provider accepted (id ${res.id ?? "unknown"}), status update failed` };
  }
  if (res.ambiguous) {
    // The provider MAY have accepted — retain the claim, never blind-retry.
    await sbUpdate("pro_waitlist_emails", claimFilter(email, kind), { status: "ambiguous" });
    return { outcome: "send_ambiguous_retained", error: res.error };
  }
  // Definitive rejection — release so a retry can re-claim (idempotency key
  // keeps even an overlapping retry safe provider-side).
  const released = await releaseClaim(email, kind);
  return released
    ? { outcome: "send_failed", error: res.error }
    : { outcome: "send_failed_claim_stuck", error: res.error };
}

/** Signup confirmations are gated on an explicit enable flag so they can be
 *  paused (default) without touching waitlist capture. */
export function proConfirmationsEnabled(): boolean {
  const v = process.env.PRO_CONFIRMATION_EMAILS;
  return v === "1" || v === "true";
}
