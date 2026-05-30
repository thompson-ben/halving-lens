import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { CycleClock } from "./CycleClock";
import { LastUpdated } from "./LastUpdated";
import {
  CYCLE_PROGRESS_PCT,
  DAYS_TO_NEXT_HALVING,
  NEXT_HALVING_DATE,
  TODAY,
  TODAY_DAY_IN_CYCLE,
} from "@/lib/btcData";
import { cyclePhase, recentChange, relativeHeat } from "@/lib/cycleIntel";
import { fmtPct, fmtUsd } from "@/lib/format";

const PHASE_TONE: Record<string, { text: string; dot: string; ring: string }> = {
  blue: { text: "text-signal-blue", dot: "bg-signal-blue", ring: "border-signal-blue/30 bg-signal-blue/[0.07]" },
  green: { text: "text-signal-green", dot: "bg-signal-green", ring: "border-signal-green/25 bg-signal-green/[0.07]" },
  teal: { text: "text-accent", dot: "bg-accent", ring: "border-accent/30 bg-accent/[0.06]" },
  amber: { text: "text-signal-amber", dot: "bg-signal-amber", ring: "border-signal-amber/30 bg-signal-amber/[0.07]" },
  red: { text: "text-signal-red", dot: "bg-signal-red", ring: "border-signal-red/30 bg-signal-red/[0.07]" },
};

export function CyclePositionHero() {
  const phase = cyclePhase();
  const tone = PHASE_TONE[phase.tone];
  const change = recentChange();
  const heat = relativeHeat();
  const progressPct = Math.round(CYCLE_PROGRESS_PCT * 100);
  const nextHalving = format(new Date(NEXT_HALVING_DATE), "MMM yyyy");

  return (
    <section className="card-glow p-6 sm:p-8 lg:p-10 relative overflow-hidden">
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 lg:gap-10 items-center">
        {/* Left: the plain-English read */}
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-4">
            Cycle 5 · day {TODAY_DAY_IN_CYCLE} of 1458
          </div>

          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${tone.ring} mb-5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
            <span className={`text-[12.5px] font-medium ${tone.text}`}>{phase.label}</span>
          </div>

          <h1 className="font-display text-[30px] sm:text-[38px] lg:text-[46px] font-medium tracking-tightest text-ink-50 leading-[1.08] max-w-2xl">
            Bitcoin is about{" "}
            <span className="text-gradient-soft">{progressPct}% through</span> the current halving
            cycle.
          </h1>

          <p className="mt-5 text-[15px] sm:text-[16px] text-ink-300 max-w-2xl leading-relaxed">
            {phase.blurb} Compared with previous cycles at the same point, it&apos;s currently{" "}
            <span className="text-ink-100">{heat.label}</span>.
          </p>

          {/* Progress bar — visualises the headline */}
          <div className="mt-7 max-w-xl">
            <div className="flex items-center justify-between text-[10.5px] font-mono text-ink-400 mb-2">
              <span>2024 halving</span>
              <span>{nextHalving} halving</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent/60 to-accent"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Stat strip — BTC price leads, halving distances support */}
          <dl className="mt-7 grid grid-cols-1 sm:grid-cols-3 rounded-xl border border-white/[0.06] bg-white/[0.015] overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06] max-w-xl">
            <Stat label="BTC price" value={fmtUsd(TODAY.price)} change={change} primary />
            <Stat label="Days since halving" value={`${TODAY_DAY_IN_CYCLE}`} />
            <Stat
              label="Days to next halving"
              value={`${DAYS_TO_NEXT_HALVING}`}
              hint={nextHalving}
            />
          </dl>

          <LastUpdated prefix="Prices as of" className="mt-3" />
        </div>

        {/* Right: the clock visual */}
        <div className="flex items-center justify-center">
          <CycleClock size={252} />
        </div>
      </div>
      <div className="watermark">halving.lens</div>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  change,
  primary,
}: {
  label: string;
  value: string;
  hint?: string;
  change?: { pct: number; days: number } | null;
  primary?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
        <span
          className={`font-mono tabular-nums text-ink-50 ${primary ? "text-[22px]" : "text-[16px]"}`}
        >
          {value}
        </span>
        {change && (
          <span
            className={`inline-flex items-center gap-0.5 font-mono text-[12px] tabular-nums ${
              change.pct >= 0 ? "text-signal-green" : "text-signal-red"
            }`}
          >
            {change.pct >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {fmtPct(change.pct, 1)}
            <span className="text-ink-400 ml-0.5">{change.days}d</span>
          </span>
        )}
      </div>
      {hint && <div className="text-[10.5px] text-ink-400 mt-0.5">{hint}</div>}
    </div>
  );
}
