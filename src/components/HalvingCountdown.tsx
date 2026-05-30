"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { halvingStats, NEXT_HALVING_YEAR } from "@/lib/halvingStats";

function parts(ms: number) {
  const clamp = Math.max(0, ms);
  const d = Math.floor(clamp / 86_400_000);
  const h = Math.floor((clamp % 86_400_000) / 3_600_000);
  const m = Math.floor((clamp % 3_600_000) / 60_000);
  const s = Math.floor((clamp % 60_000) / 1000);
  return { d, h, m, s };
}

const fmtBtc = (n: number) =>
  n >= 1000 ? `${Math.round(n).toLocaleString()}` : n.toFixed(n < 10 ? 3 : 0);

export function HalvingCountdown() {
  const stats = halvingStats();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Until mounted, fall back to the day estimate (avoids hydration mismatch).
  const remaining = now != null ? stats.estimatedTargetMs - now : stats.daysToHalving * 86_400_000;
  const { d, h, m, s } = parts(remaining);

  return (
    <section className="card-glow p-6 sm:p-8 lg:p-10 relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
              Countdown · next halving ~{NEXT_HALVING_YEAR}
            </div>
            <h2 className="font-display text-[26px] sm:text-[32px] font-medium tracking-tight-2 text-ink-50 leading-tight">
              Block rewards halve again in…
            </h2>
          </div>
          <div className="text-right">
            <div className="font-mono text-[15px] text-ink-100 tabular-nums">
              ~{stats.blocksToHalving.toLocaleString()} blocks
            </div>
            <div className="text-[11px] text-ink-400">
              est. {format(new Date(stats.estimatedDate), "d MMM yyyy")}
            </div>
          </div>
        </div>

        {/* The clock */}
        <div className="flex gap-3 sm:gap-4">
          <TimeCell value={d} label="days" />
          <Colon />
          <TimeCell value={h} label="hrs" pad />
          <Colon />
          <TimeCell value={m} label="min" pad />
          <Colon />
          <TimeCell value={s} label="sec" pad dim />
        </div>

        {/* Progress through the current epoch */}
        <div className="mt-7 max-w-xl">
          <div className="flex justify-between text-[10.5px] font-mono text-ink-400 mb-2">
            <span>2024 halving</span>
            <span className="text-accent">{stats.progressPct.toFixed(1)}% mined this epoch</span>
            <span>~{NEXT_HALVING_YEAR}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent"
              style={{ width: `${Math.min(100, stats.progressPct)}%` }}
            />
          </div>
        </div>

        {/* Interesting stats */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
          <Fact
            label="Block reward"
            value={`${stats.currentReward} → ${stats.nextReward}`}
            unit="BTC"
            sub="halves at the next halving"
          />
          <Fact
            label="New BTC / day"
            value={`${fmtBtc(stats.dailyIssuance)} → ${fmtBtc(stats.dailyIssuanceNext)}`}
            sub="daily issuance drops by half"
          />
          <Fact
            label="Mined so far"
            value={`${stats.pctMined.toFixed(2)}%`}
            sub={`${(stats.minedSupply / 1e6).toFixed(2)}M of 21M BTC`}
          />
          <Fact
            label="Annual inflation"
            value={`${stats.annualInflationPct.toFixed(2)}%`}
            sub="new supply vs circulating"
          />
          <Fact
            label="Issued since 2024 halving"
            value={`${Math.round(stats.issuedSinceHalving).toLocaleString()}`}
            unit="BTC"
          />
          <Fact
            label="Left until next halving"
            value={`${Math.round(stats.issuedUntilHalving).toLocaleString()}`}
            unit="BTC"
          />
          <Fact
            label={stats.blockBased ? "Block height" : "Block height (est.)"}
            value={stats.blockHeight.toLocaleString()}
            sub={`halving at block 1,050,000`}
          />
          <Fact
            label="Network hashrate"
            value={stats.hashrateEHs != null ? stats.hashrateEHs.toFixed(0) : "—"}
            unit={stats.hashrateEHs != null ? "EH/s" : undefined}
            sub={stats.hashrateEHs != null ? "24h average" : "syncing"}
          />
        </div>

        <p className="mt-4 text-[11px] text-ink-500 leading-relaxed">
          The halving happens on a block, not a clock — the date and timer are estimates based on
          ~10-minute blocks and {stats.blocksToHalving.toLocaleString()} blocks remaining.
        </p>
      </div>
      <div className="watermark">halving.lens · countdown</div>
    </section>
  );
}

function TimeCell({ value, label, pad, dim }: { value: number; label: string; pad?: boolean; dim?: boolean }) {
  const text = pad ? String(value).padStart(2, "0") : String(value);
  return (
    <div className="flex-1 max-w-[120px] rounded-xl border border-white/[0.06] bg-white/[0.02] py-4 text-center">
      <div
        className={`font-display font-medium tracking-tightest tabular-nums leading-none text-[34px] sm:text-[44px] ${dim ? "text-accent" : "text-ink-50"}`}
      >
        {text}
      </div>
      <div className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-400">{label}</div>
    </div>
  );
}

function Colon() {
  return (
    <div className="flex items-center font-display text-[28px] sm:text-[38px] text-ink-500 leading-none">
      :
    </div>
  );
}

function Fact({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className="mt-1.5 font-mono text-[15px] text-ink-100 tabular-nums leading-tight">
        {value}
        {unit && <span className="text-[11px] text-ink-400 ml-1">{unit}</span>}
      </div>
      {sub && <div className="text-[10.5px] text-ink-500 mt-1 leading-snug">{sub}</div>}
    </div>
  );
}
