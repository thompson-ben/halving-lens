import { cycleScorecard } from "@/lib/cycleSummary";

// Score → tone (condition reading, NOT a buy/sell signal).
function tone(score: number): { text: string; bar: string } {
  if (score >= 70) return { text: "text-signal-green", bar: "bg-signal-green" };
  if (score >= 45) return { text: "text-accent", bar: "bg-accent" };
  if (score >= 30) return { text: "text-signal-amber", bar: "bg-signal-amber" };
  return { text: "text-signal-red", bar: "bg-signal-red" };
}

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
          {/* Overall */}
          <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-1">
                Cycle environment score
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`font-display text-[48px] lg:text-[56px] font-medium tracking-tightest tabular-nums leading-none ${overallTone.text}`}>
                  {sc.overall}
                </span>
                <span className="text-[16px] text-ink-400">/ 100</span>
              </div>
            </div>
            <p className="text-[12px] text-ink-500 max-w-xs leading-relaxed">
              A condition reading across the factors below — higher means calmer / earlier-cycle
              historically, not a recommendation.
            </p>
          </div>

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
        <div className="watermark">halving.lens · cycle scorecard</div>
      </div>
    </section>
  );
}
