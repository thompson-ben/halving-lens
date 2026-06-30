"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { getRecent, getSaved, getStreak, recordVisitDay, getVisitDayCount } from "@/lib/personalize";
import { evaluateBadges, RARITY_TONE, type BadgeState } from "@/lib/badges";

// Achievements, computed from the on-device signals. Earned and in-progress
// badges are shown for everyone; legacy/referral badges show as locked until
// accounts arrive (Phase 2).
export function DashboardBadges() {
  const [states, setStates] = useState<BadgeState[] | null>(null);

  useEffect(() => {
    recordVisitDay();
    const recent = getRecent();
    const signals = {
      researchRead: recent.filter((r) => r.kind === "research" || r.kind === "finding" || r.kind === "weekly").length,
      metricsViewed: recent.filter((r) => r.kind === "metric").length,
      savedCount: getSaved().length,
      streak: getStreak(),
      dashboardVisits: getVisitDayCount() > 0 ? 1 : 0,
      viewedAccumulation: recent.some((r) => r.href.startsWith("/accumulation")) ? 1 : 0,
      viewedSentiment: recent.some((r) => r.href.startsWith("/sentiment")) ? 1 : 0,
    };
    setStates(evaluateBadges(signals));
  }, []);

  if (!states) return null;

  const earned = states.filter((s) => s.earned);
  const inProgress = states.filter((s) => !s.earned && !s.locked && s.progress > 0).sort((a, b) => b.progress / b.target - a.progress / a.target);
  const locked = states.filter((s) => s.locked);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: "#d9b96a" }}>Achievements</div>
        <div className="text-[11px] text-ink-500">{earned.length} earned</div>
      </div>

      {earned.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {earned.map((s) => (
            <Badge key={s.def.id} s={s} />
          ))}
        </div>
      )}

      {inProgress.length > 0 && (
        <div className="space-y-2 mb-3">
          {inProgress.slice(0, 4).map((s) => (
            <div key={s.def.id} className="flex items-center gap-3 text-[12px]">
              <div className="w-40 shrink-0 text-ink-300">{s.def.name}</div>
              <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.round((s.progress / s.target) * 100)}%` }} />
              </div>
              <div className="w-14 text-right font-mono text-ink-400">{s.progress}/{s.target}</div>
            </div>
          ))}
        </div>
      )}

      {locked.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {locked.slice(0, 6).map((s) => (
            <span key={s.def.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/[0.07] text-[11px] text-ink-500" title={`${s.def.description} — available with accounts`}>
              <Lock size={11} /> {s.def.name}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-ink-500">Streaks and reading achievements are tracked on this device. Founding &amp; referral badges unlock with accounts.</p>
    </section>
  );
}

function Badge({ s }: { s: BadgeState }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] ${RARITY_TONE[s.def.rarity]}`}
      title={`${s.def.description} · ${s.def.rarity}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.def.name}
    </span>
  );
}
