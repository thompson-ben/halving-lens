import type { SimilarityTrend } from "@/lib/similarity";

// "What's changed?" for the closest-historical-match read. Similarity is
// context, not a signal, so movement is shown neutrally (grey + arrow, never
// good/bad) and a change in the #1 match is flagged. Descriptive only — a match
// is context for what happened before, never a forecast of the next move.
export function SimilarityChange({ trend, className = "" }: { trend: SimilarityTrend; className?: string }) {
  const t = trend;
  if (!t.available || !t.current) {
    return (
      <div className={`card p-4 sm:p-5 ${className}`}>
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">Closest match · what&rsquo;s changed</div>
        <p className="mt-2 text-[13px] text-ink-400">Not enough history yet to compare the closest match over time.</p>
      </div>
    );
  }

  const delta = t.delta;
  const arrow = delta == null || delta === 0 ? "→" : delta > 0 ? "↑" : "↓";
  const summary = (() => {
    if (t.topChanged && t.prior) {
      return `${t.current.dateLabel} is now the closest historical match (it was ${t.prior.dateLabel} a week ago), at ${t.current.similarity}% similarity. Historical context, not a forecast.`;
    }
    if (t.prior && delta != null && delta !== 0) {
      return `${t.current.dateLabel} remains the closest historical match, with similarity ${delta > 0 ? "rising" : "declining"} from ${t.prior.similarity}% to ${t.current.similarity}% over the past week. Historical context, not a forecast.`;
    }
    return `${t.current.dateLabel} remains the closest historical match at ${t.current.similarity}% — little changed this week. Historical context, not a forecast.`;
  })();

  return (
    <div className={`card p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">Closest match · what&rsquo;s changed</div>
          <div className="mt-1 flex items-baseline gap-2.5 flex-wrap">
            <span className="font-display text-[26px] sm:text-[30px] leading-none text-ink-50">{t.current.dateLabel}</span>
            <span className="text-[13px] text-ink-300 tabular-nums">{t.current.similarity}% similar</span>
          </div>
        </div>
        <span className={`text-[10.5px] px-2.5 py-1 rounded-full border shrink-0 ${t.topChanged ? "text-signal-amber border-signal-amber/30 bg-signal-amber/[0.08]" : "text-ink-300 border-white/10 bg-white/[0.03]"}`}>
          {t.topChanged ? "Match changed" : "Match steady"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4 border-t border-white/[0.06] pt-4">
        <div className="min-w-0" title={t.sinceLabel ? `as of ${t.sinceLabel}` : undefined}>
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-500">7 days ago</div>
          <div className="mt-1 text-[15px] text-ink-200 leading-tight">{t.prior ? t.prior.dateLabel : "—"}</div>
          {t.prior && <div className="text-[10.5px] text-ink-500">{t.prior.similarity}% similar</div>}
        </div>
        <div className="min-w-0">
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-500">Similarity Δ (7d)</div>
          <div className="mt-1 text-[15px] text-ink-300 tabular-nums">
            <span aria-hidden>{arrow}</span> {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta} pts`}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-500">Cycle day</div>
          <div className="mt-1 text-[15px] text-ink-200 tabular-nums leading-tight">Day {t.cycleDay}</div>
        </div>
        <div className="min-w-0">
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-500">Drawdown</div>
          <div className="mt-1 text-[15px] text-ink-200 tabular-nums leading-tight">{Math.round(t.drawdown)}%</div>
        </div>
      </div>

      <div className="mt-3.5 border-t border-white/[0.06] pt-3.5">
        <p className="text-[12.5px] sm:text-[13px] text-ink-300 leading-snug">{summary}</p>
      </div>
    </div>
  );
}
