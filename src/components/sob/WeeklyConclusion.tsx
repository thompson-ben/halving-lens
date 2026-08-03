import Link from "next/link";

// The close of the briefing. It restates the canonical verdict — the SAME
// sentence the page opened with — and nothing else. It computes no summary of
// its own and consumes no generator: everything it shows arrives as props, so
// the close can never disagree with the open.
export function WeeklyConclusion({
  presenter = false,
  verdict,
  nextWatchTitle,
}: {
  presenter?: boolean;
  verdict: string;
  nextWatchTitle?: string;
}) {
  return (
    <div className="card-glow p-5 sm:p-7 relative overflow-hidden">
      <div className="text-[10.5px] uppercase tracking-[0.2em] text-accent mb-3">The week in one line</div>
      <p className="font-display text-[18px] sm:text-[22px] text-ink-50 leading-snug tracking-tight-2 max-w-3xl">
        {verdict}
      </p>

      {presenter ? (
        <p className="mt-5 text-[13.5px] text-accent leading-relaxed">
          {nextWatchTitle
            ? `The key check next week: ${nextWatchTitle.charAt(0).toLowerCase()}${nextWatchTitle.slice(1)}.`
            : "We'll check whether the picture held."}{" "}
          Next Wednesday, we&rsquo;ll check whether that signal held.
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
