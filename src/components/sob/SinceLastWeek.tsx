import { ArrowRight, Eye } from "lucide-react";
import { sinceLastWeek, lastWeekWatch, type RowTone, type WatchOutcome } from "@/lib/weekComparison";

// Section 3 — Since Last Wednesday. The signature continuity section for
// Documenting the Cycle: a compact then-vs-now of the core readings, plus the
// accountability beat — "last week we were watching X, here's what happened."
// All values come from the archived brief nearest ~7 days ago (date disclosed)
// and the live reads. Honest first-edition state when no prior brief exists.
// Responsive: comparison rows stack on mobile (no cramped table).

const TONE: Record<RowTone, string> = { good: "text-accent", bad: "text-signal-red", neutral: "text-ink-300" };

const OUTCOME_STYLE: Record<WatchOutcome, { label: string; cls: string }> = {
  held: { label: "Held", cls: "border-white/12 bg-white/[0.03] text-ink-300" },
  moved: { label: "Moved", cls: "border-accent/30 bg-accent/[0.06] text-accent" },
  escalated: { label: "More notable", cls: "border-signal-amber/30 bg-signal-amber/[0.06] text-signal-amber" },
  eased: { label: "Calmed", cls: "border-accent/30 bg-accent/[0.06] text-accent" },
  insufficient: { label: "No data", cls: "border-white/12 bg-white/[0.03] text-ink-400" },
};

export function SinceLastWeek() {
  const cmp = sinceLastWeek();
  const watch = lastWeekWatch();

  return (
    <div className="space-y-4">
      {!cmp.available ? (
        <div className="card p-6">
          <p className="text-[14px] text-ink-300 leading-relaxed max-w-2xl">
            This is an early edition. Once a prior week&rsquo;s brief is archived, this section will show a clear
            then-vs-now for every core reading — and hold last week&rsquo;s watch item to account. Nothing is fabricated
            before that history exists.
          </p>
        </div>
      ) : (
        <>
          <p className="text-[12.5px] text-ink-500">
            Compared with the archived brief from <span className="text-ink-300">{cmp.dateLabel}</span> ({cmp.daysAgo} days ago).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cmp.rows.map((r) => (
              <div key={r.key} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500">{r.label}</span>
                  {r.delta && <span className={`text-[12px] tabular-nums ${TONE[r.tone]}`}>{r.delta}</span>}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[14px] text-ink-100">
                  <span className="text-ink-400 tabular-nums">{r.then}</span>
                  <ArrowRight size={13} className="text-ink-600 shrink-0" />
                  <span className="tabular-nums">{r.now}</span>
                </div>
                <div className={`mt-1.5 text-[12px] ${TONE[r.tone]}`}>{r.meaning}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Last week we were watching → what happened */}
      <div className="card-glow p-5 sm:p-6 relative overflow-hidden">
        <span className="absolute left-0 top-0 h-full w-[3px] bg-accent/60" aria-hidden />
        <div className="flex items-center gap-2 text-accent mb-2">
          <Eye size={14} strokeWidth={1.9} />
          <span className="text-[10.5px] uppercase tracking-[0.2em]">Last week we were watching</span>
          {watch.available && (
            <span className={`ml-auto inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] ${OUTCOME_STYLE[watch.outcome].cls}`}>
              {OUTCOME_STYLE[watch.outcome].label}
            </span>
          )}
        </div>
        {watch.signal && (
          <h3 className="font-display text-[18px] sm:text-[21px] font-medium tracking-tight-2 text-ink-50 leading-snug">
            {watch.signal}
          </h3>
        )}
        <p className="mt-2 text-[13.5px] text-ink-300 leading-relaxed max-w-2xl">{watch.detail}</p>
      </div>
    </div>
  );
}
