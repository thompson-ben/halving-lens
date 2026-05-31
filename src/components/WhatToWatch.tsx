import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cycleSummary, type WatchLevel } from "@/lib/cycleSummary";

const LEVEL: Record<WatchLevel, { label: string; dot: string; text: string; ring: string }> = {
  elevated: {
    label: "Elevated",
    dot: "bg-signal-amber",
    text: "text-signal-amber",
    ring: "border-signal-amber/25",
  },
  watch: {
    label: "Watch",
    dot: "bg-accent",
    text: "text-accent",
    ring: "border-accent/20",
  },
  calm: {
    label: "Calm",
    dot: "bg-ink-500",
    text: "text-ink-400",
    ring: "border-white/[0.06]",
  },
};

const CONF: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };

// "What to watch next" — forward-looking signals, directly beneath the Cycle
// Summary. Answers "what should I pay attention to next?" with live data.
export function WhatToWatch() {
  const s = cycleSummary();

  return (
    <section>
      <div className="mb-6">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
          What to watch next
        </div>
        <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-tight">
          What should you pay attention to next?
        </h2>
        <p className="mt-2.5 text-[14px] text-ink-300 max-w-2xl leading-relaxed">
          The signals most likely to change the cycle read from here — each derived from live data.
          Historical context, not advice.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {s.watchSignals.map((w) => {
          const lvl = LEVEL[w.level];
          const inner = (
            <>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[14px] font-medium text-ink-100 leading-snug group-hover:text-accent transition-colors">
                  {w.signal}
                </h3>
                <span
                  className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${lvl.ring} text-[9.5px] font-medium uppercase tracking-wide ${lvl.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${lvl.dot}`} />
                  {lvl.label}
                </span>
              </div>

              {/* Current status — the headline reading */}
              <div className="mt-3 text-[13px] text-ink-100 leading-relaxed">{w.status}</div>

              {/* Why it matters */}
              <p className="mt-2.5 text-[12px] text-ink-400 leading-relaxed">{w.why}</p>

              <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[10.5px] text-ink-500">
                  Confidence: <span className="text-ink-300">{CONF[w.confidence]}</span>
                </span>
                {w.href && (
                  <span className="inline-flex items-center gap-0.5 text-accent text-[11px] group-hover:gap-1.5 transition-all">
                    Go deeper <ArrowUpRight size={11} />
                  </span>
                )}
              </div>
            </>
          );
          return w.href ? (
            <Link key={w.signal} href={w.href} className="card card-interactive p-5 block group hover:border-accent/25">
              {inner}
            </Link>
          ) : (
            <div key={w.signal} className="card p-5 group">{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
