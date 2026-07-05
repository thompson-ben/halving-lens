import Link from "next/link";
import type { Metadata } from "next";
import { Flame, Users, Trophy } from "lucide-react";
import { sbSelect } from "@/lib/supabase";
import { type ProfileState } from "@/lib/profile";
import { referralCode } from "@/lib/referral";
import { referralCountsByCode } from "@/lib/referralLeaderboard";
import { streakStats } from "@/lib/streak";
import { FOUNDING_MEMBER_LIMIT } from "@/lib/entitlements";
import { EARLY_SUPPORTER_LIMIT } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Hall of Founders — HalvingLens",
  description: "The earliest supporters of HalvingLens. Founding Members, recognised permanently.",
  robots: { index: false },
};

const GOLD = "#d9b96a";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthYear = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

interface Row {
  email: string;
  created_at: string;
  state: ProfileState | null;
}

export default async function HallOfFoundersPage() {
  const nowISO = new Date().toISOString().slice(0, 10);
  const [rows, refCounts] = await Promise.all([
    sbSelect<Row[]>(`profiles?select=email,created_at,state&order=created_at.asc&limit=${FOUNDING_MEMBER_LIMIT}`),
    referralCountsByCode(),
  ]);

  const founders = (rows ?? [])
    .map((r, i) => {
      const memberNo = i + 1; // created_at asc ⇒ join order
      const st = r.state ?? {};
      const streak = streakStats(st.streakDays, nowISO);
      const refs = refCounts.get(referralCode(r.email)) ?? 0;
      // A light achievements tally (streak + referral milestones + early supporter).
      const ach =
        [7, 30, 100].filter((m) => streak.longest >= m).length +
        [1, 5, 25].filter((m) => refs >= m).length +
        (streak.totalDays >= 1 ? 1 : 0) +
        (memberNo <= EARLY_SUPPORTER_LIMIT ? 1 : 0);
      const hidden = st.hideFromHall === true;
      const name = (st.hallName || "").trim();
      return { memberNo, joined: monthYear(r.created_at), handle: name || `Member #${memberNo}`, named: !!name, streak: streak.longest, refs, ach, hidden };
    })
    .filter((f) => !f.hidden);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="text-center pt-2 pb-6 border-b border-white/[0.08]">
        <div className="text-[10.5px] uppercase tracking-[0.24em]" style={{ color: GOLD }}>Hall of Founders</div>
        <h1 className="mt-3 font-display text-[34px] lg:text-[44px] leading-[1.05] text-ink-50 tracking-tightest">
          The earliest supporters of HalvingLens
        </h1>
        <p className="mt-4 text-[14px] text-ink-400 max-w-xl mx-auto">
          Founding Members joined before member #{FOUNDING_MEMBER_LIMIT.toLocaleString()}. Their status is permanent — this
          is where they&apos;re recognised.
        </p>
      </header>

      {founders.length === 0 ? (
        <p className="text-center text-[13.5px] text-ink-400">The Hall is being written. Founding Members appear here as profiles are created.</p>
      ) : (
        <div className="space-y-2">
          {founders.map((f) => (
            <div key={f.memberNo} className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="w-12 shrink-0 text-center">
                <div className="font-mono text-[15px] text-ink-200">{f.memberNo <= 3 ? ["🥇", "🥈", "🥉"][f.memberNo - 1] : `#${f.memberNo}`}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-ink-100 truncate">{f.handle}</span>
                  {f.memberNo <= EARLY_SUPPORTER_LIMIT && <span className="text-[10px]" style={{ color: GOLD }}>◆ Early Supporter</span>}
                </div>
                <div className="text-[11.5px] text-ink-500">Member since {f.joined}</div>
              </div>
              <div className="hidden sm:flex items-center gap-5 text-[12.5px] text-ink-300 font-mono">
                <span className="inline-flex items-center gap-1" title="Longest reading streak"><Flame size={12} className="text-signal-amber" /> {f.streak}</span>
                <span className="inline-flex items-center gap-1" title="Referrals"><Users size={12} className="text-ink-500" /> {f.refs}</span>
                <span className="inline-flex items-center gap-1" title="Achievements"><Trophy size={12} style={{ color: GOLD }} /> {f.ach}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-[11px] text-ink-500 pt-4 border-t border-white/[0.06]">
        Members are shown by number to protect privacy; Founding Members can opt out from their{" "}
        <Link href="/profile" className="text-accent">Investor Profile</Link>.
      </p>
    </div>
  );
}
