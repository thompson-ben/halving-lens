"use client";

import { useMemo, useState } from "react";
import { ACCUMULATION_BANDS, accumulationRead, type AccumulationBandKey } from "@/lib/accumulation";
import { simulateDca } from "@/lib/accumulationDca";
import { fmtUsd } from "@/lib/format";
import { track } from "@/lib/track";
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

const ADJUST_LABEL: Record<AccumulationBandKey, string> = {
  deep_value: "Buy 2× (double)",
  attractive: "Buy 1.5×",
  neutral: "Buy 1× (base)",
  elevated: "Buy 0.75×",
  overheated: "Buy 0.5× (half)",
};

export function DcaSimulatorPanel() {
  const [base, setBase] = useState<string>("100");
  const today = accumulationRead();

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
          onChange={(k) => {
            setBase(k);
            track("dca_change", { weekly: Number(k) });
          }}
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

      {/* How the rule works — the ladder */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-accent">How the dynamic plan works</div>
        <p className="mt-1.5 text-[12.5px] text-ink-400 leading-relaxed max-w-2xl">
          The only input is today&apos;s Accumulation Index band. Your weekly buy scales mechanically —
          more when Bitcoin is historically cheap, less when it&apos;s historically overheated. The score
          never says &ldquo;buy&rdquo; or &ldquo;sell&rdquo;; it just sizes a recurring buy. Historical context, not advice.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[12.5px] min-w-[480px]">
            <thead>
              <tr className="text-ink-500 text-[10.5px] uppercase tracking-[0.12em]">
                <th className="text-left font-normal pb-2">Environment</th>
                <th className="text-left font-normal pb-2">Score</th>
                <th className="text-left font-normal pb-2">Adjustment</th>
                <th className="text-right font-normal pb-2">Weekly buy</th>
              </tr>
            </thead>
            <tbody>
              {ACCUMULATION_BANDS.map((b) => {
                const isToday = b.key === today.band.key;
                return (
                  <tr key={b.key} className={`border-t border-white/[0.06] ${isToday ? "bg-accent/[0.06]" : ""}`}>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: b.color }} />
                        <span className={isToday ? "text-ink-50 font-medium" : "text-ink-200"}>{b.label.replace("Historically ", "")}</span>
                        {isToday && <span className="text-[10px] uppercase tracking-wide text-accent">· Today</span>}
                      </span>
                    </td>
                    <td className="py-2.5 text-ink-400 font-mono">{b.range[0]}–{b.range[1]}</td>
                    <td className="py-2.5 text-ink-300">{ADJUST_LABEL[b.key]}</td>
                    <td className="py-2.5 text-right font-mono text-ink-100">{fmtUsd(Math.round(Number(base) * LADDER[b.key]))}/wk</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[12.5px] text-ink-300 leading-relaxed">
          Right now: <span className="text-ink-50 font-medium">Accumulation Index {today.score}/100 — {today.band.label.replace("Historically ", "")}</span>,
          so this rule would size your buy at{" "}
          <span className="text-accent font-medium">{LADDER[today.band.key]}× ({fmtUsd(Math.round(Number(base) * LADDER[today.band.key]))}/wk)</span>.
          A change only happens when the score crosses into a new band.
        </p>
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
