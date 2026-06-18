// Daily brief send pipeline. Server-only (service-role + Resend). Reuses the
// brief's source of truth via emailBrief. Idempotent per day, logs every send
// and a daily summary into the intelligence warehouse. Never throws — returns a
// structured summary so the sync job and admin route can report cleanly.

import { sbSelect, sbInsert, sbUpdate, supabaseConfigured } from "./supabase";
import { sendEmail, resendConfigured } from "./resend";
import { dailyEmailHtml, dailyEmailText, dailyEmailSubject } from "./emailBrief";
import { unsubToken } from "./emailToken";
import { absoluteUrl } from "./site";

export interface SendSummary {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  date: string;
  subscriberCount: number;
  sent: number;
  delivered: number;
  failed: number;
  provider: string;
}

interface Subscriber {
  id: number;
  email: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function alreadySentToday(date: string): Promise<boolean> {
  const rows = await sbSelect<{ date: string }[]>(`email_deliveries?select=date&date=eq.${date}&limit=1`);
  return !!rows && rows.length > 0;
}

export async function sendDailyBrief(opts: { force?: boolean } = {}): Promise<SendSummary> {
  const date = today();
  const base: SendSummary = { ok: false, date, subscriberCount: 0, sent: 0, delivered: 0, failed: 0, provider: "resend" };

  if (!supabaseConfigured) return { ...base, reason: "supabase_not_configured" };
  if (!resendConfigured) return { ...base, reason: "resend_not_configured" };

  if (!opts.force && (await alreadySentToday(date))) {
    return { ...base, ok: true, skipped: true, reason: "already_sent_today" };
  }

  // Active subscribers (status 'active' or legacy null).
  const subs =
    (await sbSelect<Subscriber[]>(
      "brief_subscribers?select=id,email&or=(status.is.null,status.eq.active)&limit=20000",
    )) ?? [];

  const subject = dailyEmailSubject();
  const text = dailyEmailText();

  let delivered = 0;
  let failed = 0;
  const logs: Record<string, unknown>[] = [];

  for (const sub of subs) {
    const email = sub.email;
    const unsubUrl = absoluteUrl(`/api/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`);
    const html = dailyEmailHtml(unsubUrl);
    const res = await sendEmail({
      to: email,
      subject,
      html,
      text,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (res.ok) delivered += 1;
    else failed += 1;
    logs.push({
      date,
      subscriber_id: sub.id,
      email,
      email_status: res.ok ? "delivered" : "failed",
      provider_message_id: res.id ?? null,
      error: res.ok ? null : (res.error ?? "unknown").slice(0, 300),
    });
  }

  // Persist per-email logs (chunked) + the daily summary.
  for (let i = 0; i < logs.length; i += 500) await sbInsert("email_sends", logs.slice(i, i + 500));
  await sbInsert("email_deliveries", {
    date,
    subscriber_count: subs.length,
    emails_sent: subs.length,
    emails_delivered: delivered,
    emails_failed: failed,
    provider: "resend",
  });

  return { ...base, ok: true, subscriberCount: subs.length, sent: subs.length, delivered, failed };
}

// Mark an email unsubscribed (used by the unsubscribe route).
export async function unsubscribeEmail(email: string): Promise<boolean> {
  return sbUpdate(
    "brief_subscribers",
    `email=eq.${encodeURIComponent(email.trim().toLowerCase())}`,
    { status: "unsubscribed", unsubscribed_at: new Date().toISOString() },
  );
}
