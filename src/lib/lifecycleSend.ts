// Onboarding drip sender. Runs daily; for each active subscriber it sends the one
// onboarding email they're next due (if any), records it in lifecycle_sends for
// idempotency, and never touches the Daily Brief. Safe to run daily; never throws.

import { sbSelect, sbInsert, supabaseConfigured } from "./supabase";
import { sendEmail, resendConfigured } from "./resend";
import { nextStep } from "./lifecycle";
import { type LifecycleCtx } from "./lifecycleEmails";
import { unsubToken } from "./emailToken";
import { emailTracking } from "./emailTracking";
import { absoluteUrl, SITE_URL } from "./site";
import { referralCode } from "./referral";

export interface LifecycleSummary {
  ok: boolean;
  reason?: string;
  eligible: number;
  sent: number;
  delivered: number;
  failed: number;
  byStep: Record<string, number>;
}

interface Subscriber {
  id: number;
  email: string;
  signup_at: string | null;
}

const EMPTY: LifecycleSummary = { ok: false, eligible: 0, sent: 0, delivered: 0, failed: 0, byStep: {} };

export async function sendLifecycleEmails(opts: { limit?: number } = {}): Promise<LifecycleSummary> {
  if (!supabaseConfigured) return { ...EMPTY, reason: "supabase_not_configured" };
  if (!resendConfigured) return { ...EMPTY, reason: "resend_not_configured" };

  const now = Date.now();
  const limit = opts.limit ?? 3000;

  const subs =
    (await sbSelect<Subscriber[]>(
      "brief_subscribers?select=id,email,signup_at&or=(status.is.null,status.eq.active)&order=signup_at.asc&limit=20000",
    )) ?? [];

  // Every recorded onboarding send, grouped by email → set of step ids.
  const sentRows = (await sbSelect<{ email: string; step: string }[]>("lifecycle_sends?select=email,step&limit=200000")) ?? [];
  const sentByEmail = new Map<string, Set<string>>();
  for (const r of sentRows) {
    const e = r.email.toLowerCase();
    (sentByEmail.get(e) ?? sentByEmail.set(e, new Set()).get(e)!).add(r.step);
  }

  let delivered = 0;
  let failed = 0;
  let sent = 0;
  const byStep: Record<string, number> = {};
  const logs: Record<string, unknown>[] = [];

  for (const sub of subs) {
    if (sent >= limit) break;
    const email = sub.email.toLowerCase();
    const seen = sentByEmail.get(email) ?? new Set<string>();
    const step = nextStep(sub.signup_at, seen, now);
    if (!step) continue;

    const unsubUrl = absoluteUrl(`/api/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`);
    const ctx: LifecycleCtx = {
      email,
      unsubUrl,
      tracking: emailTracking(email, `lifecycle-${step.id}`),
      referralLink: `${SITE_URL}/?ref=${referralCode(email)}`,
    };
    const { html, text } = step.build(ctx);

    const res = await sendEmail({
      to: email,
      subject: step.subject,
      html,
      text,
      headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });

    sent += 1;
    byStep[step.id] = (byStep[step.id] ?? 0) + 1;
    if (res.ok) {
      delivered += 1;
      // Record only on success, so a transient failure retries next run.
      await sbInsert("lifecycle_sends", { email, step: step.id });
    } else {
      failed += 1;
    }
    logs.push({
      date: new Date(now).toISOString().slice(0, 10),
      subscriber_id: sub.id,
      email,
      email_status: res.ok ? "delivered" : "failed",
      provider_message_id: res.id ?? null,
      error: res.ok ? null : (res.error ?? "unknown").slice(0, 300),
    });
  }

  for (let i = 0; i < logs.length; i += 500) await sbInsert("email_sends", logs.slice(i, i + 500));

  return { ok: true, eligible: sent, sent, delivered, failed, byStep };
}
