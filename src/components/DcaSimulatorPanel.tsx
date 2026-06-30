"use client";

import { useMemo, useState } from "react";
import { ACCUMULATION_BANDS, accumulationRead, type AccumulationBandKey } from "@/lib/accumulation";
import { simulateDca, simulateThreeWay, DISTRIBUTION_PRESETS } from "@/lib/accumulationDca";
import { fmtUsd } from "@/lib/format";
import { track } from "@/lib/track";
import { SegmentedControl } from "./SegmentedControl";

// Interactive Accumulation-Index backtests over Bitcoin's full weekly history.
// Two rules, switchable:
//   • Accumulate — a flat weekly buy vs one that scales by the historical band.
//   • Accumulate & Distribute — a three-way race (DCA vs Dynamic DCA vs Dynamic
//     DCA + Distribution) that trims in overheated conditions, pays tax on the
//     gain, banks the cash and redeploys it into cheaper buys — then names the
//     best rule for long-term growth.
// Recomputed client-side from the cached score series. Descriptive history only —
// not advice, not a forecast.

// Contribution multiplier per band, relative to the chosen base (more when
// historically cheap, less when historically overheated). Three illustrative
// intensities — these are sensible defaults, NOT an optimised backtest output.
const PRESETS: Record<string, Record<AccumulationBandKey, number>> = {
  conservative: { deep_value: 1.5, attractive: 1.25, neutral: 1, elevated: 0.85, overheated: 0.7 },
  balanced: { deep_value: 2, attractive: 1.5, neutral: 1, elevated: 0.75, overheated: 0.5 },
  aggressive: { deep_value: 3, attractive: 2, neutral: 1, elevated: 0.5, overheated: 0.25 },
};

// Accumulate & Distribute presets are shared with the published HL-R001 evidence
// table (see accumulationDca.ts) so the cited figures never drift from the tool.
const DIST_PRESETS = DISTRIBUTION_PRESETS;

const PRESET_OPTS = [
  { key: "conservative", label: "Conservative" },
  { key: "balanced", label: "Balanced" },
  { key: "aggressive", label: "Aggressive" },
] as const;

const MODE_OPTS = [
  { key: "accumulate", label: "Accumulate" },
  { key: "distribute", label: "Accumulate & Distribute" },
] as const;

function adjustLabel(mult: number): string {
  if (mult === 1) return "Buy 1× (base)";
  if (mult === 2) return "Buy 2× (double)";
  if (mult === 0.5) return "Buy 0.5× (half)";
  return `Buy ${mult}×`;
}

const BASES = [
  { key: "25", label: "$25" },
  { key: "50", label: "$50" },
  { key: "100", label: "$100" },
  { key: "200", label: "$200" },
] as const;

export function DcaSimulatorPanel() {
  const [mode, setMode] = useState<string>("accumulate");
  const [base, setBase] = useState<string>("100");
  const [preset, setPreset] = useState<string>("balanced");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[11px] uppercase tracking-[0.16em] text-accent">Strategy</div>
        <SegmentedControl
          aria-label="Strategy"
          options={MODE_OPTS.map((m) => ({ key: m.key, label: m.label }))}
          value={mode}
          onChange={(k) => {
            setMode(k);
            track("dca_change", { mode: k });
          }}
        />
      </div>

      {mode === "distribute" ? (
        <DistributeView base={base} setBase={setBase} preset={preset} setPreset={setPreset} />
      ) : (
        <AccumulateView base={base} setBase={setBase} preset={preset} setPreset={setPreset} />
      )}
    </div>
  );
}

interface ViewProps {
  base: string;
  setBase: (k: string) => void;
  preset: string;
  setPreset: (k: string) => void;
}

function BaseControl({ base, setBase, from, to, weeks }: { base: string; setBase: (k: string) => void; from: string; to: string; weeks: number }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="text-[12.5px] text-ink-400">
        Weekly contribution <span className="text-ink-500">· {from} → {to} · {weeks} weeks</span>
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
  );
}

// ── Accumulate (buy-only dynamic DCA) ────────────────────────────────────────
function AccumulateView({ base, setBase, preset, setPreset }: ViewProps) {
  const today = accumulationRead();
  const ladder = PRESETS[preset] ?? PRESETS.balanced;

  const sim = useMemo(() => {
    const weekly = Number(base);
    const l = PRESETS[preset] ?? PRESETS.balanced;
    const dynamicByBand = Object.fromEntries(
      ACCUMULATION_BANDS.map((b) => [b.key, Math.round(weekly * l[b.key])]),
    ) as Record<AccumulationBandKey, number>;
    return simulateDca({ standardWeekly: weekly, dynamicByBand });
  }, [base, preset]);

  return (
    <div className="space-y-6">
      <BaseControl base={base} setBase={setBase} from={sim.from} to={sim.to} weeks={sim.weeks} />

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
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[11px] uppercase tracking-[0.16em] text-accent">How the dynamic plan works</div>
          <SegmentedControl
            aria-label="Scaling intensity"
            options={PRESET_OPTS.map((p) => ({ key: p.key, label: p.label }))}
            value={preset}
            onChange={(k) => {
              setPreset(k);
              track("dca_change", { preset: k });
            }}
          />
        </div>
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
                    <td className="py-2.5 text-ink-300">{adjustLabel(ladder[b.key])}</td>
                    <td className="py-2.5 text-right font-mono text-ink-100">{fmtUsd(Math.round(Number(base) * ladder[b.key]))}/wk</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[12.5px] text-ink-300 leading-relaxed">
          Right now: <span className="text-ink-50 font-medium">Accumulation Index {today.score}/100 — {today.band.label.replace("Historically ", "")}</span>,
          so the <span className="text-ink-100">{preset}</span> rule would size your buy at{" "}
          <span className="text-accent font-medium">{ladder[today.band.key]}× ({fmtUsd(Math.round(Number(base) * ladder[today.band.key]))}/wk)</span>.
          A change only happens when the score crosses into a new band.
        </p>
        <p className="mt-2 text-[11px] text-ink-500 leading-relaxed max-w-2xl">
          The multipliers are a sensible illustrative default, not an optimised output of the backtest.
          Switch between Conservative, Balanced and Aggressive above to see how scaling intensity would
          have changed the result.
        </p>
      </div>
    </div>
  );
}

// ── Accumulate & Distribute — DCA vs Dynamic DCA vs Dynamic DCA + Distribution ─
const SCENARIO_LABEL = {
  standard: "Standard DCA",
  dynamic: "Dynamic DCA",
  distribute: "Dynamic DCA + Distribution",
} as const;

function DistributeView({ base, setBase, preset, setPreset }: ViewProps) {
  const today = accumulationRead();
  const cfg = DIST_PRESETS[preset as keyof typeof DIST_PRESETS] ?? DIST_PRESETS.balanced;

  const sim = useMemo(() => {
    const weekly = Number(base);
    const c = DIST_PRESETS[preset as keyof typeof DIST_PRESETS] ?? DIST_PRESETS.balanced;
    return simulateThreeWay({ standardWeekly: weekly, buyByBand: c.buy, targetSellPct: c.sell });
  }, [base, preset]);

  const weeklySell = sim.weeklySellPct;
  const avgWeeks = sim.avgOverheatedWeeks;
  const byKey = { standard: sim.standard, dynamic: sim.dynamic, distribute: sim.distribute };
  const winner = byKey[sim.bestKey];

  return (
    <div className="space-y-6">
      <BaseControl base={base} setBase={setBase} from={sim.from} to={sim.to} weeks={sim.weeks} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ScenarioCard
          result={sim.standard}
          subtitle="Flat weekly buy · never sells"
          winner={sim.bestKey === "standard"}
        />
        <ScenarioCard
          result={sim.dynamic}
          subtitle="Scaled by band · never sells"
          winner={sim.bestKey === "dynamic"}
        />
        <ScenarioCard
          result={sim.distribute}
          subtitle="Trims, taxes, banks & reinvests"
          winner={sim.bestKey === "distribute"}
          footnote={`incl. ${fmtUsd(sim.distribute.reinvested, { compact: true })} reinvested · ${fmtUsd(sim.distribute.taxPaid, { compact: true })} tax`}
        />
      </div>

      {/* The verdict — the answer to "which is best for long-term growth?" */}
      <div className="rounded-xl border border-accent/25 bg-accent/[0.05] p-4 sm:p-5">
        <div className="text-[11px] uppercase tracking-[0.16em] text-accent">Best for long-term growth · this window</div>
        <div className="mt-1.5 text-[19px] font-display font-medium text-ink-50">
          {SCENARIO_LABEL[sim.bestKey]} —{" "}
          <span className="text-accent">{fmtUsd(Math.round(winner.valuePerThousand))} per $1,000 invested</span>
        </div>
        <p className="mt-2 text-[13px] text-ink-300 leading-relaxed">
          Measured per $1,000 of your <span className="text-ink-100">own money</span> (so recycled profit doesn&apos;t
          flatter distribution), <span className="text-ink-50 font-medium">{SCENARIO_LABEL[sim.bestKey]}</span> came out
          ahead: {fmtUsd(Math.round(sim.standard.valuePerThousand))} (DCA) ·{" "}
          {fmtUsd(Math.round(sim.dynamic.valuePerThousand))} (Dynamic) ·{" "}
          {fmtUsd(Math.round(sim.distribute.valuePerThousand))} (Distribution).{" "}
          {sim.bestKey === "dynamic" ? (
            <>
              Trimming raised <span className="text-ink-100">{fmtUsd(sim.distribute.proceedsGross, { compact: true })}</span> in
              gains and reinvesting won most of the Bitcoin back ({sim.distribute.btcRetainedPct}% of the buy-only
              stack), but the {sim.taxRatePct}% tax plus selling coins that kept rising in a long uptrend still left
              distribution a step behind simply accumulating.
            </>
          ) : (
            <>Distribution&apos;s realised profit and reinvestment carried it ahead over this particular window.</>
          )}{" "}
          The takeaway: distribution is about <span className="text-ink-100">realising profit and smoothing the ride</span>,
          not maximising the final stack. This is how each rule would have behaved on past data — not advice.
        </p>
      </div>

      {/* How the rule works — the ladder */}
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[11px] uppercase tracking-[0.16em] text-accent">How the distribution plan works</div>
          <SegmentedControl
            aria-label="Scaling intensity"
            options={PRESET_OPTS.map((p) => ({ key: p.key, label: p.label }))}
            value={preset}
            onChange={(k) => {
              setPreset(k);
              track("dca_change", { preset: k });
            }}
          />
        </div>
        <p className="mt-1.5 text-[12.5px] text-ink-400 leading-relaxed max-w-2xl">
          The only input is today&apos;s Accumulation Index band. You buy more when Bitcoin is historically cheap,
          ease off when it&apos;s elevated, and in the overheated band the rule stops buying and trims a small,
          fixed slice of the holding — banking the proceeds to redeploy on the next dip. The score never says
          &ldquo;buy&rdquo; or &ldquo;sell&rdquo;; this just sizes the rule. Historical context, not advice.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[12.5px] min-w-[520px]">
            <thead>
              <tr className="text-ink-500 text-[10.5px] uppercase tracking-[0.12em]">
                <th className="text-left font-normal pb-2">Environment</th>
                <th className="text-left font-normal pb-2">Score</th>
                <th className="text-left font-normal pb-2">Action</th>
                <th className="text-right font-normal pb-2">Weekly</th>
              </tr>
            </thead>
            <tbody>
              {ACCUMULATION_BANDS.map((b) => {
                const isToday = b.key === today.band.key;
                const isSell = b.key === "overheated";
                const isCheap = b.key === "deep_value" || b.key === "attractive";
                const mult = cfg.buy[b.key];
                const action = isSell
                  ? `Trim ${weeklySell.toFixed(1)}%/wk`
                  : b.key === "elevated"
                  ? `Buy ${mult}× (reduce)`
                  : isCheap
                  ? `${adjustLabel(mult)} + redeploy`
                  : adjustLabel(mult);
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
                    <td className={`py-2.5 ${isSell ? "text-rose-300" : isCheap ? "text-emerald-300" : "text-ink-300"}`}>{action}</td>
                    <td className={`py-2.5 text-right font-mono ${isSell ? "text-rose-300" : "text-ink-100"}`}>
                      {isSell ? `−${weeklySell.toFixed(1)}%/wk` : `${fmtUsd(Math.round(Number(base) * mult))}/wk`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* The sell-sizing logic */}
        <div className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[0.04] p-4 sm:p-5">
          <div className="text-[11px] uppercase tracking-[0.16em] text-rose-300/90">How much to sell, and why</div>
          <p className="mt-2 text-[13px] text-ink-300 leading-relaxed">
            Rather than trying to call the exact top, the rule spreads a target trim across a typical overheated
            stretch. Historically, Bitcoin has spent an average of{" "}
            <span className="text-ink-50 font-medium">{avgWeeks.toFixed(1)} weeks</span> in the overheated band per
            stretch — across <span className="text-ink-100">{sim.overheatedRunCount} stretches</span>
            {sim.overheatedFirstYear ? ` since ${sim.overheatedFirstYear}` : ""}. To trim a target{" "}
            <span className="text-ink-50 font-medium">{sim.targetSellPct}%</span> of the holding over a typical
            stretch, it sells{" "}
            <span className="text-rose-200 font-medium">{weeklySell.toFixed(1)}% of the remaining position each
            overheated week</span> ({sim.targetSellPct}% ÷ {avgWeeks.toFixed(1)} weeks ≈ {weeklySell.toFixed(1)}%).
            A long-term core is intentionally kept — this is a trim, not a full exit.
          </p>
        </div>

        {/* The reinvestment + tax logic */}
        <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4 sm:p-5">
          <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-300/90">What happens to the cash</div>
          <p className="mt-2 text-[13px] text-ink-300 leading-relaxed">
            Every trim realises a profit, so the rule sets aside a flat{" "}
            <span className="text-ink-50 font-medium">{sim.taxRatePct}% for capital gains</span> and banks the rest as a
            cash war chest — <span className="text-emerald-200 font-medium">{fmtUsd(sim.distribute.reinvested, { compact: true })}</span>{" "}
            over this window. That cash is then redeployed into extra Bitcoin when the index falls back to
            attractive-or-cheaper, spread across a typical cheap stretch (~{sim.avgCheapWeeks.toFixed(0)} weeks,
            about {sim.weeklyRedeployPct.toFixed(1)}% of the reserve per week). Recycling the profit is why
            distribution still keeps <span className="text-ink-100">{sim.distribute.btcRetainedPct}%</span> of the
            buy-only Bitcoin stack instead of bleeding it away.
          </p>
        </div>

        <p className="mt-3 text-[12.5px] text-ink-300 leading-relaxed">
          Right now: <span className="text-ink-50 font-medium">Accumulation Index {today.score}/100 — {today.band.label.replace("Historically ", "")}</span>,
          so the <span className="text-ink-100">{preset}</span> rule would{" "}
          {today.band.key === "overheated" ? (
            <span className="text-rose-200 font-medium">trim {weeklySell.toFixed(1)}% of the holding this week</span>
          ) : (
            <span className="text-accent font-medium">
              buy {cfg.buy[today.band.key]}× ({fmtUsd(Math.round(Number(base) * cfg.buy[today.band.key]))}/wk)
              {(today.band.key === "deep_value" || today.band.key === "attractive") ? " and redeploy the war chest" : ""}
            </span>
          )}
          . The action only changes when the score crosses into a new band.
        </p>
        <p className="mt-2 text-[11px] text-ink-500 leading-relaxed max-w-2xl">
          The multipliers, target trim and {sim.taxRatePct}% tax rate are sensible illustrative defaults, not an
          optimised output of the backtest. The {sim.taxRatePct}% figure is an illustrative calculation only — tax
          treatment varies by jurisdiction and individual circumstances, and nothing here constitutes tax or financial
          advice. End value counts Bitcoin held plus any uninvested cash. Switch presets above to compare.
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

function ScenarioCard({
  result,
  subtitle,
  winner,
  footnote,
}: {
  result: { label: string; investedNew: number; btc: number; endValue: number; roiPct: number; valuePerThousand: number };
  subtitle: string;
  winner?: boolean;
  footnote?: string;
}) {
  return (
    <div className={`card p-5 relative ${winner ? "border-accent/50" : ""}`}>
      {winner && (
        <span className="absolute -top-2 right-3 text-[9.5px] uppercase tracking-[0.14em] bg-accent text-[#15120a] font-semibold px-2 py-0.5 rounded">
          Best growth
        </span>
      )}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <div className="text-[14px] font-medium text-ink-50">{result.label}</div>
          <div className="text-[11.5px] text-ink-400">{subtitle}</div>
        </div>
        <div className={`text-[19px] font-display font-medium ${winner ? "text-accent" : "text-ink-100"}`}>
          {result.roiPct >= 0 ? "+" : ""}
          {result.roiPct.toLocaleString()}%
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
        <Stat label="Your money" value={fmtUsd(result.investedNew, { compact: true })} />
        <Stat label="Bitcoin" value={`${result.btc.toFixed(2)} BTC`} />
        <Stat label="End value" value={fmtUsd(result.endValue, { compact: true })} />
        <Stat label="Per $1k" value={fmtUsd(Math.round(result.valuePerThousand), { compact: true })} />
      </dl>
      {footnote && <div className="mt-2.5 text-[10.5px] text-ink-500 leading-snug">{footnote}</div>}
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
