import Link from "next/link";
import { weeklyConclusion } from "@/lib/weekStory";

// Section 9 — Weekly Conclusion. One deterministic verdict combining the
// evidence: the week's takeaway, whether the thesis changed, the single most
// important thing to watch next, and a restrained hook. Reader mode ends with a
// subtle brief CTA; presenter mode ends with the next-episode hook. No hype, no
// price targets, no predictions.
export function WeeklyConclusion({ presenter = false, verdict }: { presenter?: boolean; verdict?: string }) {
  const c = weeklyConclusion();
  return (
    <div className="card-glow p-5 sm:p-7 relative overflow-hidden">
      {verdict && (
        <>
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent mb-2.5">What it means</div>
          <p className="font-display text-ink-50 leading-relaxed text-[17px] sm:text-[20px] max-w-3xl">{verdict}</p>
          <div className="mt-5 pt-4 border-t border-white/[0.06]" />
        </>
      )}
      <div className="text-[10.5px] uppercase tracking-[0.2em] text-accent mb-3">The week in one line</div>
      <p className="font-display text-[18px] sm:text-[22px] text-ink-50 leading-snug tracking-tight-2 max-w-3xl">
        {c.takeaway}
      </p>

      <div className="mt-5 pt-4 border-t border-white/[0.06]">
        <div className="text-[9.5px] uppercase tracking-[0.18em] text-ink-500 mb-1">Watching most closely next</div>
        <p className="text-[13.5px] text-ink-200 leading-relaxed max-w-2xl">{c.nextSignal}</p>
      </div>

      {presenter ? (
        <p className="mt-5 text-[13.5px] text-accent leading-relaxed">
          {c.hook} Next Wednesday, we&rsquo;ll check whether that signal held.
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* Anchors to the page's own inline signup (PR138) instead of
              detouring to the homepage at the moment of highest conviction. */}
          <Link
            href="#subscribe"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-accent text-ink-950 text-[13px] font-medium hover:bg-accent-soft transition-colors"
          >
            Get the Daily Bitcoin Cycle Brief
          </Link>
          <span className="text-[11.5px] text-ink-500">One clear read each morning · no hype, no predictions.</span>
        </div>
      )}
      <p className="mt-5 text-[11px] text-ink-600">Historical context. Not prediction. Not financial advice.</p>
    </div>
  );
}
