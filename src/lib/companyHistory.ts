// Company history & longitudinal performance — the permanent memory behind the
// Founder Review. Four capabilities:
//   • Since Launch — accumulating all-time totals.
//   • Monthly snapshots — captured each month so a year-over-year comparison
//     becomes possible once 12 months of data exists (nothing to show before
//     then — the value is that we START capturing now).
//   • All-time records — each metric's best-ever value + date, updated on a new high.
//   • Founder journal — hand-written monthly reflections (the story behind numbers).
//
// Read paths are safe for previews; the SEND path persists snapshots + records.

import { sbSelect, sbUpsert, sbInsert, sbCount, supabaseConfigured } from "./supabase";
import { referralCountsByCode } from "./referralLeaderboard";
import { streakStats } from "./streak";

// Company launch date (UTC). Override with COMPANY_LAUNCH=YYYY-MM-DD.
export const COMPANY_LAUNCH = process.env.COMPANY_LAUNCH || "2025-06-01";
const DAY = 86_400_000;

function launchMs(): number {
  const t = Date.parse(`${COMPANY_LAUNCH}T00:00:00Z`);
  return Number.isFinite(t) ? t : Date.UTC(2025, 5, 1);
}
export function daysSinceLaunch(nowMs = Date.now()): number {
  return Math.max(0, Math.floor((nowMs - launchMs()) / DAY));
}
export function monthKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function shiftMonthKey(key: string, deltaMonths: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + deltaMonths, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${NAMES[m - 1] ?? "?"} ${y}`;
}

export type SnapshotMetrics = Record<string, number>;
export interface CompanyRecord { metric: string; label: string; value: number; unit: string; achievedOn: string; detail?: string }

// Longest reading streak across the whole community (in days). Powers the
// "Longest reading streak" all-time record.
export async function longestCommunityStreak(nowISO: string): Promise<number> {
  if (!supabaseConfigured) return 0;
  const rows = await sbSelect<{ state: { streakDays?: string[] } | null }[]>("profiles?select=state&limit=50000");
  let max = 0;
  for (const r of rows ?? []) {
    const s = streakStats(r.state?.streakDays, nowISO);
    if (s.longest > max) max = s.longest;
  }
  return max;
}

// ── Since Launch — accumulating all-time totals ──────────────────────────────
export interface SinceLaunchRow { label: string; value: number }

// Computes the permanent, accumulating totals. `known` carries figures the
// caller already has (from the report) to avoid re-querying.
export async function sinceLaunch(
  known: { totalBriefsPublished: number; currentSubscribers: number | null },
  nowMs = Date.now(),
): Promise<{ days: number; rows: SinceLaunchRow[]; metrics: SnapshotMetrics }> {
  let members = 0, emails = 0, pageViews = 0, referrals = 0;
  if (supabaseConfigured) {
    const [m, e, pv, refMap] = await Promise.all([
      sbCount("profiles"),
      sbCount("email_sends"),
      sbCount("events", "name=eq.page_view"),
      referralCountsByCode(),
    ]);
    members = m ?? 0;
    emails = e ?? 0;
    pageViews = pv ?? 0;
    referrals = [...refMap.values()].reduce((s, n) => s + n, 0);
  }
  const days = daysSinceLaunch(nowMs);
  const subscribers = known.currentSubscribers ?? 0;

  const rows: SinceLaunchRow[] = [
    { label: "Days since launch", value: days },
    { label: "Daily Briefs published", value: known.totalBriefsPublished },
    { label: "Total page views", value: pageViews },
    { label: "Subscribers (current)", value: subscribers },
    { label: "Community members", value: members },
    { label: "Emails sent", value: emails },
    { label: "Referrals", value: referrals },
  ];
  // The month's cumulative figures, stored so year-over-year can compare later.
  const metrics: SnapshotMetrics = {
    total_briefs: known.totalBriefsPublished,
    total_page_views: pageViews,
    subscribers,
    community_members: members,
    total_emails: emails,
    total_referrals: referrals,
  };
  return { days, rows, metrics };
}

// ── Monthly snapshots (year-over-year seed) ──────────────────────────────────
export async function captureMonthlySnapshot(metrics: SnapshotMetrics, nowMs = Date.now()): Promise<boolean> {
  if (!supabaseConfigured) return false;
  const month = monthKey(nowMs);
  // Merge over any existing figures for the month so a mid-month re-run enriches
  // rather than clobbers (e.g. manual metrics added via admin are preserved).
  const existing = await getSnapshot(month);
  const merged = { ...(existing ?? {}), ...metrics };
  return sbUpsert("company_snapshots", { month, metrics: merged, updated_at: new Date(nowMs).toISOString() }, "month");
}

// Most recent monthly snapshots, newest first. Powers the Executive Summary's
// social block, which reads the latest manual figures + the previous entry for a
// delta. Empty when Supabase is unconfigured.
export interface DatedSnapshot { month: string; metrics: SnapshotMetrics }
export async function recentSnapshots(limit = 12): Promise<DatedSnapshot[]> {
  if (!supabaseConfigured) return [];
  const rows = await sbSelect<{ month: string; metrics: SnapshotMetrics | null }[]>(
    `company_snapshots?select=month,metrics&order=month.desc&limit=${limit}`,
  );
  return (rows ?? []).map((r) => ({ month: r.month, metrics: r.metrics ?? {} }));
}

export async function getSnapshot(month: string): Promise<SnapshotMetrics | null> {
  if (!supabaseConfigured) return null;
  const rows = await sbSelect<{ metrics: SnapshotMetrics | null }[]>(
    `company_snapshots?select=metrics&month=eq.${encodeURIComponent(month)}&limit=1`,
  );
  return rows?.[0]?.metrics ?? null;
}

// "This Time Last Year": compare the current month's snapshot to the one 12
// months earlier. Returns null until a 12-month-old snapshot exists.
export interface YoYRow { label: string; now: number; then: number; growthPct: number | null }
export async function thisTimeLastYear(currentMetrics: SnapshotMetrics, nowMs = Date.now()): Promise<{ monthLabel: string; lastYearLabel: string; rows: YoYRow[] } | null> {
  const thisMonth = monthKey(nowMs);
  const lastYear = shiftMonthKey(thisMonth, -12);
  const past = await getSnapshot(lastYear);
  if (!past) return null;

  const LABELS: Record<string, string> = {
    total_page_views: "Total page views",
    subscribers: "Subscribers",
    community_members: "Community members",
    total_referrals: "Referrals",
    total_briefs: "Daily Briefs published",
    total_emails: "Emails sent",
    instagram_followers: "Instagram followers",
    x_followers: "X followers",
    youtube_subscribers: "YouTube subscribers",
    email_open_rate: "Email open rate",
  };
  const rows: YoYRow[] = [];
  for (const [key, label] of Object.entries(LABELS)) {
    const now = currentMetrics[key];
    const then = past[key];
    if (typeof now !== "number" || typeof then !== "number") continue;
    const growthPct = then > 0 ? Math.round(((now - then) / then) * 100) : now > 0 ? null : 0;
    rows.push({ label, now, then, growthPct });
  }
  return rows.length ? { monthLabel: monthLabel(thisMonth), lastYearLabel: monthLabel(lastYear), rows } : null;
}

// ── All-time records ─────────────────────────────────────────────────────────
export async function getRecords(): Promise<CompanyRecord[]> {
  if (!supabaseConfigured) return [];
  const rows = await sbSelect<{ metric: string; label: string; value: number; unit: string; achieved_on: string; detail: string | null }[]>(
    "company_records?select=metric,label,value,unit,achieved_on,detail&order=metric.asc&limit=100",
  );
  return (rows ?? []).map((r) => ({ metric: r.metric, label: r.label, value: r.value, unit: r.unit, achievedOn: r.achieved_on, detail: r.detail ?? undefined }));
}

// Merge stored records with fresh candidates, keeping the higher value — so the
// report shows the true current record even before persistence.
export function mergeRecords(stored: CompanyRecord[], candidates: CompanyRecord[]): CompanyRecord[] {
  const by = new Map(stored.map((r) => [r.metric, r]));
  for (const c of candidates) {
    const prev = by.get(c.metric);
    if (!prev || c.value > prev.value) by.set(c.metric, c);
  }
  return [...by.values()];
}

// Persist any candidate that beats the stored record.
export async function updateRecords(candidates: CompanyRecord[]): Promise<void> {
  if (!supabaseConfigured || candidates.length === 0) return;
  const stored = new Map((await getRecords()).map((r) => [r.metric, r]));
  const beats = candidates.filter((c) => {
    const prev = stored.get(c.metric);
    return c.value > 0 && (!prev || c.value > prev.value);
  });
  for (const c of beats) {
    await sbUpsert(
      "company_records",
      { metric: c.metric, label: c.label, value: c.value, unit: c.unit, achieved_on: c.achievedOn, detail: c.detail ?? null, updated_at: new Date().toISOString() },
      "metric",
    );
  }
}

// ── Founder journal ──────────────────────────────────────────────────────────
export interface JournalEntry { proud?: string; surprised?: string; lesson?: string; differently?: string; focus?: string }
export const JOURNAL_PROMPTS: { key: keyof JournalEntry; prompt: string }[] = [
  { key: "proud", prompt: "What am I most proud of this month?" },
  { key: "surprised", prompt: "What surprised me?" },
  { key: "lesson", prompt: "What lesson did I learn?" },
  { key: "differently", prompt: "What would I do differently?" },
  { key: "focus", prompt: "What should we focus on next month?" },
];

export async function latestJournal(): Promise<{ month: string; entry: JournalEntry } | null> {
  if (!supabaseConfigured) return null;
  const rows = await sbSelect<{ month: string; entry: JournalEntry }[]>(
    "founder_journal?select=month,entry&order=month.desc,created_at.desc&limit=1",
  );
  return rows?.[0] ?? null;
}

export async function addJournalEntry(month: string, entry: JournalEntry): Promise<boolean> {
  if (!supabaseConfigured) return false;
  return sbInsert("founder_journal", { month, entry });
}
