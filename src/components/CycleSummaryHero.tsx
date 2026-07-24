import { cycleSummary, HEAT_LABEL, HEAT_TONE } from "@/lib/cycleSummary";
import { fmtPct, fmtUsd } from "@/lib/format";
import { LastUpdated } from "./LastUpdated";
import { ShareCardButton } from "./ShareCardButton";
import { CyclePositionBar } from "./CyclePositionBar";

const TONE_TEXT: Record<string, string> = {
  blue: "text-signal-blue",
  green: "text-signal-green",
  teal: "text-accent",
  amber: "text-signal-amber",
  red: "text-signal-red",
};
const CONF_LABEL: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };

// Visual-first hero: the answer (phase, progress, risk, confidence, history)
// lands in ~3 seconds via large type + the cycle thermometer, BEFORE any
// explanatory prose.
export function CycleSummaryHero() {
  const s = cycleSummary();
  const tone = HEAT_TONE[s.heat];
  const historyLabel = s.summary.includes("cooler")
    ? "Cooler than previous cycles"
    : s.summary.includes("hotter")
      ? "Hotter than previous cycles"
      : "Broadly tracking previous cycles";

  return (
    <section className="card-glow p-6 sm:p-8 lg:p-10 relative overflow-hidden">
      <div className="relative z-10">
        <div className="text-[10.5px] uppercase tracking-[0.24em] text-accent mb-5">
          Bitcoin cycle read
        </div>

        {/* The big answer — progress + phase */}
        <div className="flex items-end gap-3 flex-wrap">
          <span className="font-display text-[56px] sm:text-[72px] lg:text-[84px] font-medium tracking-tightest text-ink-50 leading-[0.9] tabular-nums">
            {s.progressPct}%
          </span>
          <span className="text-[15px] text-ink-300 mb-2.5">through Cycle 5 · day {s.cycleDay}</span>
        </div>
        <h2 className="mt-3 font-display text-[26px] sm:text-[32px] lg:text-[38px] font-medium tracking-tight-2 text-ink-50 leading-[1.08] max-w-3xl">
          {s.phaseLabel}
        </h2>

        {/* The cycle thermometer — the signature visual */}
        <div className="mt-7 max-w-xl">
          <CyclePositionBar heat={s.heat} percentile={s.heatPercentile} />
        </div>

        {/* The three read-outs, big and scannable */}
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden max-w-3xl">
          <ReadOut label="Risk level" value={HEAT_LABEL[s.heat]} valueClass={TONE_TEXT[tone]} />
          <ReadOut label="Confidence" value={CONF_LABEL[s.confidence]} valueClass="text-accent" />
          <ReadOut label="Compared with history" value={historyLabel} valueClass="text-ink-50" small />
        </div>

        {/* Only now: the explanation */}
        <p className="mt-7 text-[15px] sm:text-[15.5px] text-ink-200 max-w-2xl leading-relaxed">
          {s.summary}
        </p>
        <p className="mt-3 text-[13.5px] text-ink-400 max-w-2xl leading-relaxed">{s.support}</p>

        {/* Live numbers strip */}
        <dl className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden max-w-2xl">
          <Stat label="BTC price" value={fmtUsd(s.price)} />
          {s.change24h != null && (
            <Stat label={`${s.changeLabel} change`} value={fmtPct(s.change24h, 1)} tone={s.change24h} />
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
      <div className="watermark">halvinglens.com · cycle read</div>
    </section>
  );
}

function ReadOut({
  label,
  value,
  valueClass,
  small,
}: {
  label: string;
  value: string;
  valueClass: string;
  small?: boolean;
}) {
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className={`mt-1.5 font-display font-medium tracking-tight-2 leading-tight ${small ? "text-[17px]" : "text-[22px]"} ${valueClass}`}>
        {value}
      </div>
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
