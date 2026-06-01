import { ArrowDown } from "lucide-react";
import { downsideScenarios, type DownsideLevel } from "@/lib/downside";
import { DataBadge } from "@/components/DataBadge";
import { fmtUsd, fmtPct } from "@/lib/format";

// The "Bitcoin Downside Scenario Map" — a vertical ladder from the current price
// down through historical support levels and prior cyclical-bear drawdown
// scenarios. Historical context, never a prediction or target.

// Per-rung accent: support levels read calm; drawdown tiers escalate.
function toneFor(level: DownsideLevel): { dot: string; bar: string; price: string } {
  if (level.category === "support")
    return { dot: "bg-accent", bar: "bg-accent/40", price: "text-ink-50" };
  if (level.key === "severe")
    return { dot: "bg-signal-red", bar: "bg-signal-red/40", price: "text-signal-red" };
  if (level.key === "average")
    return { dot: "bg-signal-amber", bar: "bg-signal-amber/40", price: "text-signal-amber" };
  return { dot: "bg-signal-amber/80", bar: "bg-signal-amber/30", price: "text-ink-50" };
}

export function DownsideLadder() {
  const d = downsideScenarios();

  if (!d.available) {
    return (
      <div className="card p-6">
        <p className="text-[13.5px] text-ink-400">
          Downside scenario levels need the live price history to be connected. They&apos;ll appear
          here once the data sync has run.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-7 relative">
      {/* Current price — pinned at the top of the ladder */}
      <div className="flex items-end justify-between gap-4 flex-wrap pb-5 border-b border-white/[0.06]">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-1.5">
            Current price
          </div>
          <div className="font-display text-[34px] sm:text-[40px] font-medium tracking-tightest text-ink-50 tabular-nums leading-none">
            {fmtUsd(d.currentPrice)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-1.5">
            Cycle high to date
          </div>
          <div className="font-mono text-[16px] text-ink-200 tabular-nums">
            {fmtUsd(d.cycleHigh, { compact: true })}
            <span className="text-ink-500 ml-2 text-[13px]">
              ({fmtPct(d.fromCycleHighPct, 0)} from high)
            </span>
          </div>
        </div>
      </div>

      {/* The ladder */}
      <ol className="mt-1">
        {d.levels.map((level, i) => {
          const tone = toneFor(level);
          return (
            <li key={level.key} className="relative pl-7 sm:pl-8 pt-5">
              {/* connector line + dot */}
              <span
                className={`absolute left-[5px] sm:left-[7px] top-0 bottom-0 w-px ${tone.bar} ${
                  i === d.levels.length - 1 ? "h-7" : ""
                }`}
                aria-hidden
              />
              <span
                className={`absolute left-0 sm:left-0.5 top-[26px] w-2.5 h-2.5 rounded-full ${tone.dot} ring-4 ring-[#0b0f15]`}
                aria-hidden
              />
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`text-[9.5px] uppercase tracking-[0.16em] px-1.5 py-0.5 rounded ${
                      level.category === "support"
                        ? "text-accent bg-accent/[0.08]"
                        : "text-signal-amber bg-signal-amber/[0.08]"
                    }`}
                  >
                    {level.category === "support" ? "Support level" : "Drawdown scenario"}
                  </span>
                  <span className="text-[14px] font-medium text-ink-100">{level.label}</span>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className={`font-display text-[22px] sm:text-[26px] font-medium tabular-nums leading-none ${tone.price}`}>
                    {fmtUsd(level.price)}
                  </span>
                  <span className="font-mono text-[12.5px] text-ink-400 tabular-nums">
                    {fmtPct(level.dropPctFromCurrent, 0)}
                  </span>
                </div>
              </div>
              <p className="mt-1.5 text-[12.5px] text-ink-300 leading-relaxed max-w-2xl">
                {level.explanation}
              </p>
              <div className="mt-2 flex items-center gap-2.5 flex-wrap">
                <DataBadge status={level.dataQuality} size="sm" />
                <span className="text-[11px] text-ink-500">{level.methodology}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="watermark">halvinglens.com · downside scenarios</div>
    </div>
  );
}

// Compact three-tier preview used on the homepage and (optionally) elsewhere.
export function DownsideTiers() {
  const d = downsideScenarios();
  const tiers = d.levels.filter((l) => l.category === "drawdown");
  if (!tiers.length) return null;
  return (
    <div className="grid grid-cols-3 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
      {tiers.map((t) => (
        <div key={t.key} className="bg-[#0b0f15] px-3 py-3.5">
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-400">
            {t.key === "mild" ? "Mild" : t.key === "average" ? "Average" : "Severe"}
          </div>
          <div className="mt-1 font-display text-[18px] sm:text-[20px] text-ink-50 tabular-nums leading-none">
            {fmtUsd(t.price, { compact: true })}
          </div>
          <div className="mt-1 font-mono text-[11px] text-ink-500 tabular-nums">
            {fmtPct(t.dropPctFromCurrent, 0)}
          </div>
        </div>
      ))}
    </div>
  );
}

export { ArrowDown };
