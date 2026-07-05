// Retention analytics for the Founder Dashboard — the "are people coming back?"
// view. Reading streaks come from member profiles; returning/active from the
// first-party event stream. Everything degrades to zeros when Supabase is unset.

import { sbSelect, supabaseConfigured } from "./supabase";
import { streakStats } from "./streak";
import { FOUNDING_MEMBER_LIMIT } from "./entitlements";
import { type ProfileState } from "./profile";

export interface RetentionAnalytics {
  configured: boolean;
  members: number;
  foundingMembers: number;
  activeThisWeek: number; // members who read at least once in the last 7 days
  avgCurrentStreak: number;
  longestStreak: number;
  streakDistribution: { label: string; count: number }[];
  returning7d: number; // distinct returning sessions (last 7 days)
  dau: number; // avg distinct daily sessions over the last 7 days
}

const EMPTY: RetentionAnalytics = {
  configured: false, members: 0, foundingMembers: 0, activeThisWeek: 0,
  avgCurrentStreak: 0, longestStreak: 0, streakDistribution: [], returning7d: 0, dau: 0,
};

const DAY = 86_400_000;

export async function retentionAnalytics(): Promise<RetentionAnalytics> {
  if (!supabaseConfigured) return EMPTY;

  const now = Date.now();
  const nowISO = new Date(now).toISOString().slice(0, 10);
  const [profiles, views] = await Promise.all([
    sbSelect<{ state: ProfileState | null }[]>("profiles?select=state&limit=50000"),
    sbSelect<{ session_id: string | null; is_new: boolean; created_at: string }[]>(
      "events?name=eq.page_view&select=session_id,is_new,created_at&order=created_at.desc&limit=30000",
    ),
  ]);

  // ── Reading streaks across members ──
  const buckets = [
    { label: "No active streak", min: 0, max: 0, count: 0 },
    { label: "1–6 days", min: 1, max: 6, count: 0 },
    { label: "7–29 days", min: 7, max: 29, count: 0 },
    { label: "30–99 days", min: 30, max: 99, count: 0 },
    { label: "100+ days", min: 100, max: Infinity, count: 0 },
  ];
  let sumCurrent = 0, longest = 0, activeThisWeek = 0;
  const rows = profiles ?? [];
  for (const p of rows) {
    const s = streakStats(p.state?.streakDays, nowISO);
    sumCurrent += s.current;
    if (s.longest > longest) longest = s.longest;
    const b = buckets.find((x) => s.current >= x.min && s.current <= x.max);
    if (b) b.count += 1;
    // Active this week: any visit day within the last 7 days.
    if ((p.state?.streakDays ?? []).some((d) => now - Date.parse(`${d}T00:00:00Z`) <= 7 * DAY)) activeThisWeek += 1;
  }
  const members = rows.length;

  // ── Returning + DAU from the event stream (last 7 days) ──
  const cutoff = now - 7 * DAY;
  const returningSessions = new Set<string>();
  const perDay = new Map<string, Set<string>>();
  for (const v of views ?? []) {
    const ts = Date.parse(v.created_at);
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    const sid = v.session_id || "";
    if (!sid) continue;
    if (v.is_new === false) returningSessions.add(sid);
    const day = v.created_at.slice(0, 10);
    (perDay.get(day) ?? perDay.set(day, new Set()).get(day)!).add(sid);
  }
  const dayCounts = [...perDay.values()].map((s) => s.size);
  const dau = dayCounts.length ? Math.round(dayCounts.reduce((a, b) => a + b, 0) / dayCounts.length) : 0;

  return {
    configured: true,
    members,
    foundingMembers: Math.min(members, FOUNDING_MEMBER_LIMIT),
    activeThisWeek,
    avgCurrentStreak: members ? Math.round((sumCurrent / members) * 10) / 10 : 0,
    longestStreak: longest,
    streakDistribution: buckets.map((b) => ({ label: b.label, count: b.count })),
    returning7d: returningSessions.size,
    dau,
  };
}
