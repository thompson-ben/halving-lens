import { format } from "date-fns";
import {
  currentGainFromHalving,
  priorCyclesAtSameDay,
  relativeHeat,
} from "@/lib/cycleIntel";
import { CURRENT_CYCLE, TODAY, TODAY_DAY_IN_CYCLE } from "@/lib/btcData";
import { fmtPct, fmtUsd } from "@/lib/format";

export function TodayVsPriorCycles() {
  const priors = priorCyclesAtSameDay();
  const current = {
    cycle: CURRENT_CYCLE,
    sample: TODAY,
    gainFromHalving: currentGainFromHalving(),
  };
  const heat = relativeHeat();

  // Current cycle first, then priors newest → oldest.
  const rows = [current, ...priors].sort((a, b) => b.cycle.id - a.cycle.id);

  return (
    <section>
      <div className="mb-6">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
          Today vs prior cycles
        </div>
        <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-tight">
          Where are we, compared with previous cycles?
        </h2>
        <p className="mt-2.5 text-[14px] text-ink-300 max-w-2xl leading-relaxed">
          Price change since the halving, measured at the same day after the halving
          ({TODAY_DAY_IN_CYCLE} days) in each cycle. Today&apos;s cycle is{" "}
          <span className="text-ink-100">{heat.detail}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {rows.map(({ cycle, sample, gainFromHalving }) => {
          const isCurrent = cycle.id === 5;
          return (
            <div
              key={cycle.id}
              className={`relative rounded-xl p-5 ${
                isCurrent
                  ? "border border-accent/30 bg-accent/[0.04]"
                  : "border border-white/[0.04] bg-white/[0.012]"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: cycle.color }}
                  />
                  <span className="text-[12.5px] font-medium text-ink-100">{cycle.short}</span>
                  <span className="text-[10.5px] text-ink-400 font-mono">
                    {format(new Date(cycle.halvingDate), "yyyy")}
                  </span>
                </div>
                {isCurrent && (
                  <span className="text-[9.5px] uppercase tracking-[0.18em] text-accent">Now</span>
                )}
              </div>

              <div className="text-[10px] uppercase tracking-[0.16em] text-ink-400">
                Price change since halving
              </div>
              <div
                className={`mt-1 font-display text-[30px] font-medium tracking-tight-2 tabular-nums leading-none ${
                  gainFromHalving >= 0 ? "text-signal-green" : "text-signal-red"
                }`}
              >
                {fmtPct(gainFromHalving, 0)}
              </div>
              <div className="mt-3 pt-3 border-t border-white/[0.04] text-[11px] text-ink-400">
                Price then{" "}
                <span className="text-ink-200 font-mono">
                  {fmtUsd(sample.price, { compact: true })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
