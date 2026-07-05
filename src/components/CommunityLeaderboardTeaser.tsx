import { Lock, TrendingUp, Users, Trophy, Flag } from "lucide-react";
import type { CommunityStatus } from "@/lib/community";

const GOLD = "#d9b96a";

// Premium "coming soon" experience shown in place of the public leaderboard
// while the community is still small. Builds anticipation with a growth bar
// instead of exposing a sparse ranking. Purely presentational (server component).
export function CommunityLeaderboardTeaser({ community }: { community: CommunityStatus }) {
  const { memberCount, threshold, remaining, progressPct } = community;
  const features = [
    { icon: <TrendingUp size={13} />, label: "Weekly Top Contributors" },
    { icon: <Users size={13} />, label: "All-Time Referrals" },
    { icon: <Trophy size={13} />, label: "Founding Member Rankings" },
    { icon: <Flag size={13} />, label: "Community Milestones" },
  ];
  return (
    <div className="card-glow p-6 text-center">
      <div className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>
        <Lock size={12} /> Launching soon
      </div>
      <h3 className="mt-3 font-display text-[22px] text-ink-50 tracking-tight-2">Community Leaderboard</h3>
      <p className="mt-2 text-[13px] text-ink-400 max-w-md mx-auto leading-relaxed">
        Our community is growing quickly. Once we reach our first {threshold} members, the Community Leaderboard unlocks and you&apos;ll be able to see:
      </p>

      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-sm mx-auto text-left">
        {features.map((f) => (
          <li key={f.label} className="flex items-center gap-2 text-[12.5px] text-ink-300">
            <span className="text-ink-500">{f.icon}</span>
            {f.label}
          </li>
        ))}
      </ul>

      <div className="mt-6 max-w-xs mx-auto">
        <div className="flex items-center justify-between text-[11.5px] text-ink-400 mb-1.5">
          <span>Community growth</span>
          <span className="text-ink-200 font-mono">{memberCount} / {threshold}</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="mt-1.5 text-[11.5px]" style={{ color: GOLD }}>
          {remaining > 0 ? `${remaining} member${remaining === 1 ? "" : "s"} until unlock` : "Unlocking…"}
        </div>
      </div>

      <p className="mt-6 text-[12px] text-ink-500 max-w-md mx-auto">
        You&apos;re one of our founding members — helping build the HalvingLens community. Secure your place before it launches.
      </p>
    </div>
  );
}
