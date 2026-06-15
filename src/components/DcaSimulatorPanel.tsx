"use client";

import { useMemo, useState } from "react";
import { ACCUMULATION_BANDS, type AccumulationBandKey } from "@/lib/accumulation";
import { simulateDca } from "@/lib/accumulationDca";
import { fmtUsd } from "@/lib/format";
import { SegmentedControl } from "./SegmentedControl";

// Interactive Dynamic DCA backtest: a flat weekly contribution vs one that scales
// with the historical accumulation environment, over Bitcoin's full weekly
// history. Recomputed client-side from the cached score series. Descriptive
// history only — not advice, not a forecast.

// Contribution multiplier per band, relative to the chosen base (more when
// historically cheap, less when historically overheated).
const LADDER: Record<AccumulationBandKey, number> = {
  deep_value: 2,
  attractive: 1.5,
  neutral: 1,
  elevated: 0.75,
  overheated: 0.5,
};

const BASES = [
  { key: "25", label: "$25" },
  { key: "50", label: "$50" },
  { key: "100", label: "$100" },
  { key: "200", label: "$200" },
] as const;

export function DcaSimulatorPanel() {
  const [base, setBase] = useState<string>("100");

  const sim = useMemo(() => {
    const weekly = Number(base);
    const dynamicByBand = Object.fromEntries(
      ACCUMULATION_BANDS.map((b) => [b.key, Math.round(weekly * LADDER[b.key])]),
    ) as Record<AccumulationBandKey, number>;
    return simulateDca({ standardWeekly: weekly, dynamicByBand });
  }, [base]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[12.5px] text-ink-400">
          Weekly contribution{" "}
          <span className="text-ink-500">· {sim.from} → {sim.to} · {sim.weeks} weeks</span>
        </div>
        <SegmentedControl
          aria-label="Weekly amount"
          options={BASES.map((b) => ({ key: b.key, label: b.label }))}
          value={base}
          onChange={setBase}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PlanCard
          title="Standard DCA"
          subtitle={`${fmtUsd(sim.standardWeekly)} every week`}
          invested={sim.standard.invested}
          btc={sim.standard.btc}
          avgCost={sim.standard.avgCost}
          endValue={sim.standard.endValue}
          roiPct={sim.standard.roiPct}
        />
        <PlanCard
          title="Dynamic DCA"
          subtitle="Scaled by historical environment"
          invested={sim.dynamic.invested}
          btc={sim.dynamic.btc}
          avgCost={sim.dynamic.avgCost}
          endValue={sim.dynamic.endValue}
          roiPct={sim.dynamic.roiPct}
          accent
        />
      </div>

      <div className="rounded-xl border border-accent/15 bg-accent/[0.04] p-4 sm:p-5 text-[13px] text-ink-300 leading-relaxed">
        Over this window, the dynamic plan accumulated{" "}
        <span className="text-ink-50 font-medium">{sim.extraBtcPctPer1k >= 0 ? "+" : ""}{sim.extraBtcPctPer1k}% more Bitcoin per dollar invested</span>{" "}
        than the flat plan ({sim.btcPerThousandDynamic.toFixed(4)} vs {sim.btcPerThousandStandard.toFixed(4)} BTC per $1,000) by
        leaning into historically cheaper conditions. This is how the rule{" "}
        <span className="text-ink-100">would have behaved on past data</span> — not a strategy, a guarantee, or advice.
      </div>

      {/* Ladder legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-ink-400">
        <span className="text-ink-500 uppercase tracking-[0.14em] text-[10px]">The ladder</span>
        {ACCUMULATION_BANDS.map((b) => (
          <span key={b.key} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: b.color }} />
            {b.label.replace("Historically ", "")}: {fmtUsd(Math.round(Number(base) * LADDER[b.key]))}/wk
          </span>
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  title,
  subtitle,
  invested,
  btc,
  avgCost,
  endValue,
  roiPct,
  accent,
}: {
  title: string;
  subtitle: string;
  invested: number;
  btc: number;
  avgCost: number;
  endValue: number;
  roiPct: number;
  accent?: boolean;
}) {
  return (
    <div className={`card p-5 ${accent ? "border-accent/30" : ""}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <div className="text-[14px] font-medium text-ink-50">{title}</div>
          <div className="text-[11.5px] text-ink-400">{subtitle}</div>
        </div>
        <div className={`text-[20px] font-display font-medium ${accent ? "text-accent" : "text-ink-100"}`}>
          {roiPct >= 0 ? "+" : ""}
          {roiPct.toLocaleString()}%
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
        <Stat label="Invested" value={fmtUsd(invested, { compact: true })} />
        <Stat label="Bitcoin" value={`${btc.toFixed(3)} BTC`} />
        <Stat label="Avg cost" value={fmtUsd(avgCost, { compact: true })} />
        <Stat label="End value" value={fmtUsd(endValue, { compact: true })} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-white/[0.05] pb-1.5">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-ink-100 font-mono text-[12px]">{value}</dd>
    </div>
  );
}
