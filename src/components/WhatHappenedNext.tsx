import { cycleDivergence, forwardOutcomes } from "@/lib/cycleIntel";
import { TODAY_DAY_IN_CYCLE } from "@/lib/btcData";
import { fmtPct } from "@/lib/format";

export function WhatHappenedNext() {
  const { horizons, daysToPeak, avgDaysToPeak } = forwardOutcomes();
  const divergence = cycleDivergence();

  return (
    <section>
      <div className="mb-6">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
          What happened next
        </div>
        <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-tight">
          In previous cycles, what came after this point?
        </h2>
        <p className="mt-2.5 text-[14px] text-ink-300 max-w-2xl leading-relaxed">
          From the same day after the halving ({TODAY_DAY_IN_CYCLE} days), here is how Bitcoin&apos;s
          price moved over the following months in each completed cycle. This is history, not a
          forecast — past cycles don&apos;t guarantee future returns.
        </p>
      </div>

      {/* Carefully-worded divergence read */}
      <div className="card-glow p-6 lg:p-7 mb-5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/[0.06] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[12px] font-medium text-accent">{divergence.chip}</span>
          </div>
          <p className="font-display text-[19px] lg:text-[22px] font-medium tracking-tight-2 text-ink-100 leading-snug max-w-3xl">
            {divergence.keyInsight}
          </p>
          <p className="mt-3.5 text-[14px] text-ink-300 max-w-3xl leading-relaxed">
            {divergence.summary}
          </p>
        </div>
        <div className="watermark">halving.lens · cycle divergence</div>
      </div>

      <div className="card divide-y divide-white/[0.04]">
        {horizons.map((h) => (
          <div key={h.label} className="flex items-center justify-between gap-4 px-5 sm:px-7 py-5">
            <div>
              <div className="text-[13.5px] text-ink-100">{h.label}</div>
              <div className="mt-0.5 text-[11px] text-ink-400">
                Average across {h.perCycle.length} prior cycle{h.perCycle.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Per-cycle dots */}
              <div className="hidden sm:flex items-center gap-3">
                {h.perCycle.map((p) => (
                  <div key={p.cycleId} className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: p.color }}
                      />
                      <span className="text-[10px] text-ink-400 font-mono">{p.short}</span>
                    </div>
                    <div
                      className={`text-[12.5px] font-mono tabular-nums ${
                        p.pct >= 0 ? "text-signal-green/80" : "text-signal-red/80"
                      }`}
                    >
                      {fmtPct(p.pct, 0)}
                    </div>
                  </div>
                ))}
              </div>
              <div
                className={`font-display text-[26px] sm:text-[30px] font-medium tracking-tight-2 tabular-nums leading-none min-w-[88px] text-right ${
                  h.avg >= 0 ? "text-signal-green" : "text-signal-red"
                }`}
              >
                {fmtPct(h.avg, 0)}
              </div>
            </div>
          </div>
        ))}

        {avgDaysToPeak !== null && (
          <div className="flex items-center justify-between gap-4 px-5 sm:px-7 py-5">
            <div>
              <div className="text-[13.5px] text-ink-100">Time from here to the cycle peak</div>
              <div className="mt-0.5 text-[11px] text-ink-400">
                {daysToPeak.map((d) => `${d.short} ${d.days}d`).join(" · ")}
              </div>
            </div>
            <div className="font-display text-[26px] sm:text-[30px] font-medium tracking-tight-2 tabular-nums leading-none text-ink-100 min-w-[88px] text-right">
              ~{avgDaysToPeak}d
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
