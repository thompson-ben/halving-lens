import Link from "next/link";
import { ArrowRight } from "lucide-react";

// The three flagship experiences read as one daily journey, in order:
//   1. The State of Bitcoin  — what changed today
//   2. Accumulation Index    — how attractive today's conditions are vs history
//   3. Historical Price Paths — how far cycles have travelled from here
// This strip sits at the foot of each flagship page so the three feel like a
// single read rather than three separate tools. The current step is marked
// "You're here"; the next step gets a prominent hand-off.

type StepId = "state-of-bitcoin" | "accumulation" | "historical-price-paths";

interface Step {
  id: StepId;
  href: string;
  n: number;
  title: string;
  role: string;
  // The question this page leaves you asking — the bridge to the next step.
  bridge: string;
}

const STEPS: Step[] = [
  {
    id: "state-of-bitcoin",
    href: "/state-of-bitcoin",
    n: 1,
    title: "The State of Bitcoin",
    role: "What changed today, and why it matters.",
    bridge: "You understand today. But does history suggest it's an attractive place to be?",
  },
  {
    id: "accumulation",
    href: "/accumulation",
    n: 2,
    title: "Accumulation Index",
    role: "How attractive today's conditions look versus history.",
    bridge: "History says today looks like this. So how far have previous cycles travelled from here?",
  },
  {
    id: "historical-price-paths",
    href: "/historical-price-paths",
    n: 3,
    title: "Historical Price Paths",
    role: "How far previous cycles travelled from here.",
    bridge: "That's the historical range. Back to today — what just changed in the market?",
  },
];

export function FlagshipJourney({ current }: { current: StepId }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  const cur = STEPS[idx];
  const next = STEPS[(idx + 1) % STEPS.length];

  return (
    <section aria-label="The daily read" className="border-t border-white/[0.06] pt-8">
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-4">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent">The daily read · three views, one picture</div>
        <div className="text-[11px] text-ink-500">Step {idx + 1} of 3</div>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STEPS.map((s) => {
          const here = s.id === current;
          const body = (
            <>
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-mono tabular-nums shrink-0 ${
                    here ? "bg-accent/15 text-accent border border-accent/40" : "bg-white/[0.03] text-ink-400 border border-white/10"
                  }`}
                >
                  {s.n}
                </span>
                <span className={`text-[13.5px] font-medium ${here ? "text-ink-50" : "text-ink-100"}`}>{s.title}</span>
                {here && <span className="ml-auto text-[9.5px] uppercase tracking-[0.14em] text-accent">You&rsquo;re here</span>}
              </div>
              <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">{s.role}</p>
            </>
          );
          return (
            <li key={s.id}>
              {here ? (
                <div className="rounded-xl border border-accent/25 bg-accent/[0.04] p-4 h-full">{body}</div>
              ) : (
                <Link href={s.href} className="card card-interactive p-4 h-full block hover:border-accent/30">
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <Link
        href={next.href}
        className="mt-4 group block rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-accent/30 px-5 py-4 transition-colors"
      >
        {/* Lead with the question this page leaves you asking, then answer it
            with the next step — so the three pages read as one line of thought. */}
        <p className="text-[13.5px] text-ink-200 leading-snug max-w-2xl">{cur.bridge}</p>
        <div className="mt-2.5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500">Next in the daily read · Step {(idx + 1) % STEPS.length + 1}</div>
            <div className="mt-0.5 text-[15px] font-display text-accent truncate">{next.title}</div>
          </div>
          <ArrowRight size={18} className="text-accent shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    </section>
  );
}
