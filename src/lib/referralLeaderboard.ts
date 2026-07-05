// Member-facing referral leaderboard — friendly competition, privacy-safe.
// Built from confirmed signup events carrying a first-touch `ref` code.
//
// Fraud resistance: referrals are counted as DISTINCT referred sessions per code
// (so one visitor refreshing / re-submitting can't inflate a total), and only
// confirmed signups count. Codes are shown as anonymous handles; only the
// current member sees "You".

import { sbSelect } from "./supabase";

export interface LeaderRow {
  rank: number;
  handle: string; // anonymised ("Investor A1B2") or "You"
  referrals: number;
  isYou: boolean;
}

export interface ReferralLeaderboard {
  configured: boolean;
  top: LeaderRow[]; // top 10 all-time
  totalReferrers: number;
  you: { referrals: number; weekly: number; rank: number | null; weeklyRank: number | null } | null;
}

const WEEK_MS = 7 * 86_400_000;

function refOf(props: Record<string, unknown> | null): string | null {
  const r = props?.ref;
  return typeof r === "string" && r.trim().length >= 4 ? r.trim().slice(0, 24) : null;
}

// Deterministic, non-reversible display handle from a referral code.
function handleFor(code: string): string {
  return `Investor ${code.slice(0, 4).toUpperCase()}`;
}

interface SignupRow {
  props: Record<string, unknown> | null;
  session_id: string | null;
  created_at: string;
}

type YouStats = { referrals: number; weekly: number; rank: number | null; weeklyRank: number | null };

export async function referralLeaderboard(myCode?: string): Promise<ReferralLeaderboard> {
  const rows = await sbSelect<SignupRow[]>(
    "events?select=props,session_id,created_at&name=eq.signup&limit=50000",
  );
  const emptyYou: YouStats | null = myCode ? { referrals: 0, weekly: 0, rank: null, weeklyRank: null } : null;
  if (rows == null) return { configured: false, top: [], totalReferrers: 0, you: emptyYou };

  const now = Date.now();
  const all = new Map<string, Set<string>>();
  const week = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, code: string, key: string) =>
    (m.get(code) ?? m.set(code, new Set()).get(code)!).add(key);

  for (const r of rows) {
    const code = refOf(r.props);
    if (!code) continue;
    // Distinct referred party = session (fallback to a per-event key if absent).
    const key = r.session_id || `${code}:${r.created_at}`;
    add(all, code, key);
    if (now - Date.parse(r.created_at) <= WEEK_MS) add(week, code, key);
  }

  const rankList = (m: Map<string, Set<string>>) =>
    [...m.entries()].map(([code, s]) => ({ code, n: s.size })).sort((a, b) => b.n - a.n || a.code.localeCompare(b.code));

  const allRanked = rankList(all);
  const weekRanked = rankList(week);

  const top: LeaderRow[] = allRanked.slice(0, 10).map((e, i) => ({
    rank: i + 1,
    handle: myCode && e.code === myCode ? "You" : handleFor(e.code),
    referrals: e.n,
    isYou: !!myCode && e.code === myCode,
  }));

  let you: YouStats | null = emptyYou;
  if (myCode) {
    const aIdx = allRanked.findIndex((e) => e.code === myCode);
    const wIdx = weekRanked.findIndex((e) => e.code === myCode);
    you = {
      referrals: aIdx >= 0 ? allRanked[aIdx].n : 0,
      weekly: wIdx >= 0 ? weekRanked[wIdx].n : 0,
      rank: aIdx >= 0 ? aIdx + 1 : null,
      weeklyRank: wIdx >= 0 ? wIdx + 1 : null,
    };
  }

  return { configured: true, top, totalReferrers: allRanked.length, you };
}
