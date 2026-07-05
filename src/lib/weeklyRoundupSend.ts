// Weekly Round-up sender. Sunday-gated, idempotent per ISO week. Personalises
// each email from prefetched profile + referral maps (one query each), so the
// per-recipient cost is just the send. Never throws.

import { sbSelect, sbInsert, supabaseConfigured } from "./supabase";
import { sendEmail, resendConfigured } from "./resend";
import { roundupGeneral, roundupEmailHtml, roundupEmailSubject, type RoundupPersonal } from "./weeklyRoundup";
import { streakStats } from "./streak";
import { referralCountsByCode } from "./referralLeaderboard";
import { referralCode } from "./referral";
import { EARLY_SUPPORTER_LIMIT, displayNamesByCode, type ProfileState } from "./profile";
import { unsubToken } from "./emailToken";
import { emailTracking } from "./emailTracking";
import { absoluteUrl } from "./site";

export interface RoundupSummary {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  slug: string;
  subscriberCount: number;
  sent: number;
  delivered: number;
  failed: number;
  personalised: number;
}

interface Subscriber { id: number; email: string }
interface ProfileRow { email: string; created_at: string; state: ProfileState | null }

function isoWeekSlug(d: Date): string {
  const dd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dd.getUTCDay() || 7;
  dd.setUTCDate(dd.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dd.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((dd.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `roundup-${dd.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function achievementTally(longest: number, refs: number, daysActive: number, memberNo: number): number {
  return (
    [7, 30, 100].filter((m) => longest >= m).length +
    [1, 5, 25].filter((m) => refs >= m).length +
    (daysActive >= 1 ? 1 : 0) +
    (memberNo <= EARLY_SUPPORTER_LIMIT ? 1 : 0)
  );
}

export async function sendWeeklyRoundup(opts: { force?: boolean } = {}): Promise<RoundupSummary> {
  const now = new Date();
  const slug = isoWeekSlug(now);
  const base: RoundupSummary = { ok: false, slug, subscriberCount: 0, sent: 0, delivered: 0, failed: 0, personalised: 0 };

  if (!supabaseConfigured) return { ...base, reason: "supabase_not_configured" };
  if (!resendConfigured) return { ...base, reason: "resend_not_configured" };
  // Sunday only (UTC), unless forced.
  if (!opts.force && now.getUTCDay() !== 0) return { ...base, ok: true, skipped: true, reason: "not_sunday" };
  if (!opts.force) {
    const seen = await sbSelect<{ slug: string }[]>(`weekly_email_deliveries?select=slug&slug=eq.${encodeURIComponent(slug)}&limit=1`);
    if (seen && seen.length) return { ...base, ok: true, skipped: true, reason: "already_sent_this_week" };
  }

  const nowISO = now.toISOString().slice(0, 10);
  const [subs, profiles, refCounts, names, general] = await Promise.all([
    sbSelect<Subscriber[]>("brief_subscribers?select=id,email&or=(status.is.null,status.eq.active)&limit=20000"),
    sbSelect<ProfileRow[]>("profiles?select=email,created_at,state&order=created_at.asc&limit=50000"),
    referralCountsByCode(),
    displayNamesByCode(), // best-effort; empty if the column/migration isn't there yet
    roundupGeneral(),
  ]);

  // email → { state, memberNo } (memberNo from created_at order).
  const profileByEmail = new Map<string, { state: ProfileState; memberNo: number }>();
  (profiles ?? []).forEach((p, i) => profileByEmail.set(p.email.toLowerCase(), { state: p.state ?? {}, memberNo: i + 1 }));

  // Referral leaderboard rank map (code → rank).
  const rankMap = new Map<string, number>();
  [...refCounts.entries()].sort((a, b) => b[1] - a[1]).forEach(([code], i) => rankMap.set(code, i + 1));

  const subscribers = subs ?? [];
  let delivered = 0, failed = 0, personalised = 0;
  const logs: Record<string, unknown>[] = [];

  for (const sub of subscribers) {
    const email = sub.email.toLowerCase();
    const prof = profileByEmail.get(email);
    let personal: RoundupPersonal | null = null;
    if (prof) {
      const s = streakStats(prof.state.streakDays, nowISO);
      const code = referralCode(email);
      const refs = refCounts.get(code) ?? 0;
      personal = {
        name: names.get(code) ?? null,
        streak: s.current,
        longest: s.longest,
        referrals: refs,
        leaderboardPosition: rankMap.get(code) ?? null,
        achievements: achievementTally(s.longest, refs, s.totalDays, prof.memberNo),
      };
      personalised += 1;
    }
    const unsubUrl = absoluteUrl(`/api/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`);
    const res = await sendEmail({
      to: email,
      subject: roundupEmailSubject(),
      html: roundupEmailHtml(unsubUrl, general, personal, emailTracking(email, slug)),
      text: `Your HalvingLens week in review. ${general.marketLine} Open your profile: ${absoluteUrl("/profile")}`,
      headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (res.ok) delivered += 1; else failed += 1;
    logs.push({ date: nowISO, subscriber_id: sub.id, email, email_status: res.ok ? "delivered" : "failed", provider_message_id: res.id ?? null, error: res.ok ? null : (res.error ?? "unknown").slice(0, 300) });
  }

  for (let i = 0; i < logs.length; i += 500) await sbInsert("email_sends", logs.slice(i, i + 500));
  await sbInsert("weekly_email_deliveries", { slug, subscriber_count: subscribers.length, emails_sent: subscribers.length, emails_delivered: delivered, emails_failed: failed, provider: "resend-roundup" });

  return { ok: true, slug, subscriberCount: subscribers.length, sent: subscribers.length, delivered, failed, personalised };
}
