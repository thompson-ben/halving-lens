import { cycleSummary, HEAT_LABEL, HEAT_TONE } from "@/lib/cycleSummary";
import { DAYS_TO_NEXT_HALVING } from "@/lib/btcData";
import { fmtPct, fmtUsd } from "@/lib/format";
import { LastUpdated } from "./LastUpdated";
import { ShareCardButton } from "./ShareCardButton";

const TONE_TEXT: Record<string, string> = {
  blue: "text-signal-blue",
  green: "text-signal-green",
  teal: "text-accent",
  amber: "text-signal-amber",
  red: "text-signal-red",
};
const TONE_RING: Record<string, string> = {
  blue: "border-signal-blue/30 bg-signal-blue/[0.07]",
  green: "border-signal-green/25 bg-signal-green/[0.07]",
  teal: "border-accent/30 bg-accent/[0.06]",
  amber: "border-signal-amber/30 bg-signal-amber/[0.07]",
  red: "border-signal-red/30 bg-signal-red/[0.07]",
};
const CONF_LABEL = { low: "Low", medium: "Medium", high: "High" };

export function CycleSummaryHero() {
  const s = cycleSummary();
  const tone = HEAT_TONE[s.heat];

  return (
    <section className="card-glow p-6 sm:p-8 lg:p-10 relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center gap-3 flex-wrap mb-5">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">
            Bitcoin Cycle Summary
          </span>
          <span className="text-[11px] text-ink-400 font-mono">
            Day {s.cycleDay} · {s.progressPct}% through cycle 5
          </span>
        </div>

        {/* Phase + the simple answer */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${TONE_RING[tone]} mb-5`}>
          <span className={`w-1.5 h-1.5 rounded-full ${TONE_TEXT[tone].replace("text-", "bg-")}`} />
          <span className={`text-[12.5px] font-medium ${TONE_TEXT[tone]}`}>{s.phaseLabel}</span>
        </div>

        <h1 className="font-display text-[28px] sm:text-[36px] lg:text-[44px] font-medium tracking-tightest text-ink-50 leading-[1.1] max-w-3xl">
          {s.summary}
        </h1>

        <p className="mt-5 text-[15px] sm:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          {s.support}
        </p>

        {/* Read chips: heat + confidence */}
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <Chip label="Risk / heat" value={HEAT_LABEL[s.heat]} tone={tone} />
          <Chip label="Confidence" value={CONF_LABEL[s.confidence]} tone="teal" />
          {s.heatPercentile != null && (
            <Chip label="Vs history" value={`${s.heatPercentile}th pctile`} tone="teal" />
          )}
        </div>

        {/* Live numbers */}
        <dl className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden max-w-2xl">
          <Stat label="BTC price" value={fmtUsd(s.price)} />
          {s.change24h != null ? (
            <Stat label={`${s.changeLabel} change`} value={fmtPct(s.change24h, 1)} tone={s.change24h} />
          ) : (
            <Stat label="Days to halving" value={`${DAYS_TO_NEXT_HALVING}`} />
          )}
          <Stat label="Since halving" value={fmtPct(s.gainFromHalving, 0)} tone={s.gainFromHalving} />
          <Stat label="From ATH" value={fmtPct(s.drawdownFromAth, 0)} tone={s.drawdownFromAth} />
        </dl>

        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <LastUpdated prefix="As of" />
          <ShareCardButton />
        </div>

        <p className="mt-5 text-[12px] text-ink-400 max-w-2xl leading-relaxed">
          Updated daily using live Bitcoin price, ETF flow, sentiment and cycle data.
        </p>
        <p className="mt-1.5 text-[11.5px] text-ink-500 max-w-2xl leading-relaxed">
          This is historical cycle analysis, not financial advice. Historical cycle behaviour is not
          a forecast.
        </p>
      </div>
      <div className="watermark">halving.lens · cycle summary</div>
    </section>
  );
}

function Chip({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${TONE_RING[tone]}`}>
      <span className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</span>
      <span className={`text-[12.5px] font-medium ${TONE_TEXT[tone]}`}>{value}</span>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: number }) {
  const color = tone == null ? "text-ink-50" : tone >= 0 ? "text-signal-green" : "text-signal-red";
  return (
    <div className="bg-[#0b0f15] px-4 py-3.5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className={`mt-1 font-mono text-[17px] tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
