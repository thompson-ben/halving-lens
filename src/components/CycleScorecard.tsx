import { cycleScorecard } from "@/lib/cycleSummary";
import { scoreBand, SCORE_BANDS } from "@/lib/scoreBand";

// Score → tone via the canonical mapping — the same thresholds that produce
// the label, so colour and label can never disagree.
function tone(score: number): { text: string; bar: string } {
  const b = scoreBand(score);
  return { text: b.toneText, bar: b.toneBar };
}

// The bands ascending (Euphoric → Cool), each with its true width on the
// 0–100 scale, so the score marker at `score%` sits inside the band the
// label actually assigns it to.
const ZONES = [...SCORE_BANDS]
  .sort((a, b) => a.min - b.min)
  .map((band, i, all) => ({ band, width: (all[i + 1]?.min ?? 100) - band.min }));

const CONF: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };

// Cycle Scorecard — a digestible, multi-factor read of the cycle environment.
// Explicitly a "condition" score, never a buy/sell or investment score.
export function CycleScorecard() {
  const sc = cycleScorecard();
  const overallTone = tone(sc.overall);

  return (
    <section>
      <div className="mb-6">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
          Cycle scorecard
        </div>
        <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-tight">
          The cycle environment, at a glance
        </h2>
        <p className="mt-2.5 text-[14px] text-ink-300 max-w-2xl leading-relaxed">
          A multi-factor read of cycle conditions today. This summarises historical cycle
          conditions — it is not a buy or sell signal.
        </p>
      </div>

      <div className="card-glow p-6 lg:p-8 relative overflow-hidden">
        <div className="relative z-10">
          {/* Overall — number + big label + interpretation, never left alone */}
          <div className="flex items-center gap-5 flex-wrap mb-5">
            <div className="flex items-baseline gap-2">
              <span className={`font-display text-[48px] lg:text-[60px] font-medium tracking-tightest tabular-nums leading-none ${overallTone.text}`}>
                {sc.overall}
              </span>
              <span className="text-[16px] text-ink-400">/ 100</span>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-0.5">
                Cycle environment
              </div>
              <div className={`font-display text-[26px] lg:text-[30px] font-medium tracking-tight-2 leading-none ${overallTone.text}`}>
                {sc.overallLabel}
              </div>
            </div>
          </div>

          {/* Colour-zoned scale with the score marked. Segment widths come
              from the canonical band thresholds, so the marker at score%
              always sits inside the band the label assigns it to. */}
          <div className="mb-3 max-w-2xl">
            <div className="relative h-2.5 rounded-full overflow-hidden flex">
              {ZONES.map(({ band, width }) => (
                <div key={band.key} style={{ width: `${width}%`, background: `${band.color}b3` }} />
              ))}
              <div className="absolute -top-1 -translate-x-1/2" style={{ left: `${sc.overall}%` }}>
                <div className="w-4 h-4 rounded-full bg-ink-50 ring-2 ring-ink-950" style={{ boxShadow: "0 0 12px rgba(255,255,255,0.5)" }} />
              </div>
            </div>
            <div className="mt-2 flex text-[10px] font-mono text-ink-500">
              {ZONES.map(({ band, width }) => (
                <span key={band.key} className="text-center" style={{ width: `${width}%` }}>
                  {band.label}
                </span>
              ))}
            </div>
          </div>

          <p className="text-[13.5px] text-ink-200 max-w-2xl leading-relaxed mb-6">{sc.interpretation}</p>

          {/* Factors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {sc.factors.map((f) => {
              const t = tone(f.score);
              return (
                <div key={f.factor} className="border-l-2 border-white/[0.06] pl-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-medium text-ink-100">{f.factor}</span>
                    <span className={`text-[12px] font-medium ${t.text}`}>{f.status}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${f.score}%` }} />
                  </div>
                  <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">{f.explanation}</p>
                  <div className="mt-1.5 text-[10px] text-ink-500">
                    Confidence: <span className="text-ink-400">{CONF[f.confidence]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-[11.5px] text-ink-500 max-w-2xl leading-relaxed">
            This score summarises historical cycle conditions. It is not financial advice, and not a
            prediction of price.
          </p>
        </div>
        <div className="watermark">halvinglens.com · cycle scorecard</div>
      </div>
    </section>
  );
}
