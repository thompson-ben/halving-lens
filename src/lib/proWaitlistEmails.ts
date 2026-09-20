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
//   · Reply-To is the founder's monitored inbox — the EXISTING configuration
//     (the FOUNDER_EMAIL secret, the same address every founder-facing send
//     already uses). Without it, nothing sends: a reply-first email with a
//     broken reply path must never go out.
//   · No prices, no alert/feature pitching — these emails LISTEN, they do
//     not steer (the founder's explicit rule).
//   · Once per person per kind, ever: the pro_waitlist_emails log (unique on
//     lower(email) + kind) is checked before and recorded after every send,
//     which is also what keeps the one-off and the signup flow from ever
//     overlapping.

import { sendEmail, resendConfigured } from "./resend";
import { sbSelect, sbInsert } from "./supabase";

export type ProWaitlistEmailKind = "confirmation" | "feedback";

/** The founder's monitored inbox — the existing FOUNDER_EMAIL configuration. */
export function proReplyTo(): string | null {
  const v = (process.env.FOUNDER_EMAIL || "").trim().toLowerCase();
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

export async function hasProEmail(email: string, kind: ProWaitlistEmailKind): Promise<boolean | null> {
  const rows = await sbSelect<{ id: number }[]>(
    `pro_waitlist_emails?select=id&email=ilike.${encodeURIComponent(email)}&kind=eq.${kind}&limit=1`,
  );
  if (rows == null) return null; // store unreadable — caller must fail SAFE (skip)
  return rows.length > 0;
}

export interface ProEmailSendResult {
  outcome: "sent" | "already_sent" | "skipped_unconfigured" | "skipped_unverifiable" | "send_failed" | "record_failed";
  error?: string;
}

/** Send one kind to one member, at most once ever. Fails SAFE on every edge:
 *  if the send log cannot be read, nothing is sent (better a missed email
 *  than a duplicate); if recording fails after a successful send, that is
 *  reported loudly so it can be reconciled before any re-run. */
export async function sendProWaitlistEmail(email: string, kind: ProWaitlistEmailKind): Promise<ProEmailSendResult> {
  const replyTo = proReplyTo();
  if (!resendConfigured || !replyTo) return { outcome: "skipped_unconfigured" };
  const already = await hasProEmail(email, kind);
  if (already == null) return { outcome: "skipped_unverifiable" };
  if (already) return { outcome: "already_sent" };
  const c = proEmailContent(kind);
  const res = await sendEmail({ to: email, subject: c.subject, html: c.html, text: c.text, replyTo });
  if (!res.ok) return { outcome: "send_failed", error: res.error };
  const recorded = await sbInsert("pro_waitlist_emails", { email: email.toLowerCase(), kind, sent_at: new Date().toISOString() });
  return recorded ? { outcome: "sent" } : { outcome: "record_failed" };
}
