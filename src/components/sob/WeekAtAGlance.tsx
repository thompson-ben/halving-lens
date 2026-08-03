"use client";

import type { GlanceRow } from "@/lib/weeklyBriefing";

// The front page (SoB 2.0, PR-SB4) — the five questions the briefing exists
// to answer, each with a one-line answer and a link to the act that expands
// it. This is the executive summary AND the running order: a presenter can
// read it top to bottom and know the whole episode before scrolling.

export function WeekAtAGlance({ rows }: { rows: GlanceRow[] }) {
  const go = (anchor: string) => {
    document.querySelector(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <section aria-label="The week at a glance" className="mt-6">
      <div className="eyebrow text-editorial mb-3">
        The week at a glance
      </div>
      <ol className="rounded-xl border border-white/[0.07] overflow-hidden divide-y divide-white/[0.05]">
        {rows.map((r) => (
          <li key={r.question}>
            <button
              onClick={() => go(r.anchor)}
              className="w-full text-left px-4 py-3 bg-[#0b0f15] hover:bg-white/[0.03] transition-colors group flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4"
            >
              <span className="eyebrow text-ink-500 sm:w-52 shrink-0 flex items-baseline gap-2">
                <span className="font-mono text-micro text-ink-600">{r.act}</span>
                {r.label}
              </span>
              <span className="text-body text-ink-200 leading-relaxed group-hover:text-ink-50 transition-colors">
                {r.answer}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The connective line between acts — what makes the page read as one
 *  briefing rather than six dashboards. Never introduces a new fact. */
export function ActBridge({ text }: { text: string }) {
  return (
    <p className="mt-8 mb-2 pl-4 border-l border-editorial/30 text-body text-ink-400 leading-relaxed max-w-measure">
      {text}
    </p>
  );
}
