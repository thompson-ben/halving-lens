// Daily brief send pipeline. Server-only (service-role + Resend). Reuses the
// brief's source of truth via emailBrief. Idempotent per day, logs every send
// and a daily summary into the intelligence warehouse. Never throws — returns a
// structured summary so the sync job and admin route can report cleanly.

import { sbSelect, sbInsert, sbUpdate, supabaseConfigured } from "./supabase";
import { sendEmail, resendConfigured } from "./resend";
import { dailyEmailHtml, dailyEmailText, dailyEmailSubject } from "./emailBrief";
import { showcaseEmailHtml, showcaseEmailText, showcaseEmailSubject } from "./showcaseEmail";
import { weeklyEmailHtml, weeklyEmailText, weeklyEmailSubject } from "./weeklyEmail";
import { latestWeekly } from "./weekly";
import { founderReport } from "./founderReport";
import { founderReportHtml, founderReportSubject } from "./founderReportEmail";
import { captureMonthlySnapshot, updateRecords } from "./companyHistory";
import { briefDate } from "./briefArchive";
import { unsubToken } from "./emailToken";
import { emailTracking } from "./emailTracking";
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

export async function sendDailyBrief(opts: { force?: boolean; testTo?: string } = {}): Promise<SendSummary> {
  const date = today();
  const base: SendSummary = { ok: false, date, subscriberCount: 0, sent: 0, delivered: 0, failed: 0, provider: "resend" };

  // Test mode: send today's brief — rendered identically — to a single address
  // (the admin) only. No subscriber list, no delivery logging, no once-per-day
  // guard, so you can preview the real email in your inbox without emailing
  // anyone else or affecting the day's send.
  if (opts.testTo) {
    if (!resendConfigured) return { ...base, reason: "resend_not_configured" };
    const email = opts.testTo.trim().toLowerCase();
    const unsubUrl = absoluteUrl(`/api/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`);
    const res = await sendEmail({
      to: email,
      subject: `[TEST] ${dailyEmailSubject()}`,
      html: dailyEmailHtml(unsubUrl, "pro", emailTracking(email, `daily-test-${date}`)),
      text: dailyEmailText(),
      headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    return { ...base, ok: res.ok, subscriberCount: 1, sent: 1, delivered: res.ok ? 1 : 0, failed: res.ok ? 0 : 1, reason: res.ok ? "test_sent" : (res.error ?? "send_failed") };
  }

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
    const html = dailyEmailHtml(unsubUrl, "pro", emailTracking(email, `daily-${date}`));
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

// ── Onboarding showcase email (Day 2 drip) ───────────────────────────────────
// A one-time "where to start" tour, sent once to each subscriber a day or two
// after they join — so it doesn't pile on with the welcome email or their first
// daily brief. Idempotent per subscriber via brief_subscribers.showcase_sent_at
// (run supabase/email.sql to add the column). Safe to run daily; never throws.
const SHOWCASE_MIN_AGE_HOURS = 20; // wait ~a day before the tour lands

export async function sendOnboardingShowcase(opts: { force?: boolean; limit?: number } = {}): Promise<SendSummary> {
  const date = today();
  const base: SendSummary = { ok: false, date, subscriberCount: 0, sent: 0, delivered: 0, failed: 0, provider: "resend" };

  if (!supabaseConfigured) return { ...base, reason: "supabase_not_configured" };
  if (!resendConfigured) return { ...base, reason: "resend_not_configured" };

  const cutoff = new Date(Date.now() - SHOWCASE_MIN_AGE_HOURS * 3_600_000).toISOString();
  const limit = opts.limit ?? 2000;
  const ageFilter = opts.force ? "" : `&signup_at=lte.${cutoff}`;

  // Eligible: active, never sent the showcase, and (unless forced) old enough.
  // If showcase_sent_at doesn't exist yet, PostgREST errors and sbSelect returns
  // null → we treat it as "nothing to do" so the daily job stays green.
  const subs = await sbSelect<Subscriber[]>(
    `brief_subscribers?select=id,email&or=(status.is.null,status.eq.active)&showcase_sent_at=is.null${ageFilter}&order=signup_at.asc&limit=${limit}`,
  );
  if (!subs) return { ...base, ok: true, skipped: true, reason: "no_column_or_query_failed" };
  if (subs.length === 0) return { ...base, ok: true, skipped: true, reason: "no_eligible_subscribers" };

  const subject = showcaseEmailSubject();
  const text = showcaseEmailText();

  let delivered = 0;
  let failed = 0;
  const logs: Record<string, unknown>[] = [];

  for (const sub of subs) {
    const unsubUrl = absoluteUrl(`/api/unsubscribe?e=${encodeURIComponent(sub.email)}&t=${unsubToken(sub.email)}`);
    const res = await sendEmail({
      to: sub.email,
      subject,
      html: showcaseEmailHtml(unsubUrl, emailTracking(sub.email, "showcase")),
      text,
      headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (res.ok) {
      delivered += 1;
      // Mark sent only on success, so a transient failure retries next day.
      await sbUpdate("brief_subscribers", `id=eq.${sub.id}`, { showcase_sent_at: new Date().toISOString() });
    } else {
      failed += 1;
    }
    logs.push({
      date,
      subscriber_id: sub.id,
      email: sub.email,
      email_status: res.ok ? "delivered" : "failed",
      provider_message_id: res.id ?? null,
      error: res.ok ? null : (res.error ?? "unknown").slice(0, 300),
    });
  }

  for (let i = 0; i < logs.length; i += 500) await sbInsert("email_sends", logs.slice(i, i + 500));

  return { ...base, ok: true, subscriberCount: subs.length, sent: subs.length, delivered, failed };
}

// ── Weekly Research email (Sundays) ──────────────────────────────────────────
// Idempotent per ISO week. By default only sends on Sundays (UTC); force skips
// the day gate for testing. Never throws.
export async function sendWeekly(opts: { force?: boolean } = {}): Promise<SendSummary & { slug: string }> {
  const w = latestWeekly();
  const slug = w?.slug ?? "";
  const base = { ok: false, date: today(), subscriberCount: 0, sent: 0, delivered: 0, failed: 0, provider: "resend", slug };

  if (!supabaseConfigured) return { ...base, reason: "supabase_not_configured" };
  if (!resendConfigured) return { ...base, reason: "resend_not_configured" };
  if (!w) return { ...base, reason: "no_weekly_report" };
  if (!opts.force && briefDate().getUTCDay() !== 0) return { ...base, ok: true, skipped: true, reason: "not_sunday" };

  if (!opts.force) {
    const seen = await sbSelect<{ slug: string }[]>(`weekly_email_deliveries?select=slug&slug=eq.${encodeURIComponent(slug)}&limit=1`);
    if (seen && seen.length) return { ...base, ok: true, skipped: true, reason: "already_sent_this_week" };
  }

  const subs = (await sbSelect<Subscriber[]>("brief_subscribers?select=id,email&or=(status.is.null,status.eq.active)&limit=20000")) ?? [];
  const subject = weeklyEmailSubject(w);
  const text = weeklyEmailText(w);

  let delivered = 0;
  let failed = 0;
  const logs: Record<string, unknown>[] = [];
  for (const sub of subs) {
    const unsubUrl = absoluteUrl(`/api/unsubscribe?e=${encodeURIComponent(sub.email)}&t=${unsubToken(sub.email)}`);
    const res = await sendEmail({
      to: sub.email,
      subject,
      html: weeklyEmailHtml(w, unsubUrl, emailTracking(sub.email, `weekly-${slug}`)),
      text,
      headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (res.ok) delivered += 1;
    else failed += 1;
    logs.push({ date: today(), subscriber_id: sub.id, email: sub.email, email_status: res.ok ? "delivered" : "failed", provider_message_id: res.id ?? null, error: res.ok ? null : (res.error ?? "unknown").slice(0, 300) });
  }
  for (let i = 0; i < logs.length; i += 500) await sbInsert("email_sends", logs.slice(i, i + 500));
  await sbInsert("weekly_email_deliveries", { slug, subscriber_count: subs.length, emails_sent: subs.length, emails_delivered: delivered, emails_failed: failed, provider: "resend" });

  return { ...base, ok: true, subscriberCount: subs.length, sent: subs.length, delivered, failed };
}

// ── Founder Weekly Intelligence Report (Mondays, founder only) ───────────────
// Sent ONLY to FOUNDER_EMAIL, never to subscribers. Monday-gated + idempotent
// per ISO week (logged in weekly_email_deliveries under a 'founder-' slug).
export async function sendFounderReport(opts: { force?: boolean } = {}): Promise<SendSummary & { recipient: string | null }> {
  const date = today();
  const recipient = process.env.FOUNDER_EMAIL || null;
  const base = { ok: false, date, subscriberCount: 0, sent: 0, delivered: 0, failed: 0, provider: "resend", recipient };

  if (!resendConfigured) return { ...base, reason: "resend_not_configured" };
  if (!recipient) return { ...base, reason: "founder_email_not_set" };
  // Monday = getUTCDay() 1
  if (!opts.force && briefDate().getUTCDay() !== 1) return { ...base, ok: true, skipped: true, reason: "not_monday" };

  // ISO-week idempotency key (reuses the weekly log table).
  const d = briefDate();
  const dd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dd.getUTCDay() || 7;
  dd.setUTCDate(dd.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dd.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((dd.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  const slug = `founder-${dd.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;

  if (supabaseConfigured && !opts.force) {
    const seen = await sbSelect<{ slug: string }[]>(`weekly_email_deliveries?select=slug&slug=eq.${encodeURIComponent(slug)}&limit=1`);
    if (seen && seen.length) return { ...base, ok: true, skipped: true, reason: "already_sent_this_week" };
  }

  const report = await founderReport();
  // Persist this month's snapshot + any new all-time records — the longitudinal
  // memory that powers "Since Launch", year-over-year and the records section.
  await captureMonthlySnapshot(report.persist.snapshot);
  await updateRecords(report.persist.recordCandidates);
  const res = await sendEmail({ to: recipient, subject: founderReportSubject(report), html: founderReportHtml(report), text: report.executive.join("\n") });
  if (supabaseConfigured) {
    await sbInsert("weekly_email_deliveries", { slug, subscriber_count: 1, emails_sent: 1, emails_delivered: res.ok ? 1 : 0, emails_failed: res.ok ? 0 : 1, provider: "resend-founder" });
  }
  return { ...base, ok: res.ok, sent: 1, delivered: res.ok ? 1 : 0, failed: res.ok ? 0 : 1, subscriberCount: 1, reason: res.ok ? undefined : (res.error ?? "send_failed") };
}

// Mark an email unsubscribed (used by the unsubscribe route).
export async function unsubscribeEmail(email: string): Promise<boolean> {
  return sbUpdate(
    "brief_subscribers",
    `email=eq.${encodeURIComponent(email.trim().toLowerCase())}`,
    { status: "unsubscribed", unsubscribed_at: new Date().toISOString() },
  );
}
