import type { Edition } from "@/lib/research";
import { fmtUsd } from "@/lib/format";

const GOLD = "#d9b96a";

// Renders a frozen edition exactly as published — the permanent web record of a
// Daily Research Brief. Pure render of stored data; no live values.
export function ResearchEdition({ e }: { e: Edition }) {
  const cs = e.contextScore;
  return (
    <article className="space-y-10">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap text-[11px]">
          <span className="font-mono" style={{ color: GOLD }}>Edition #{e.edition}</span>
          <span className="text-ink-500">·</span>
          <span className="text-ink-400">{e.dateLabel}</span>
          <span className="text-ink-500">·</span>
          <span className="text-ink-400">{e.readMin} min read</span>
          <span className="px-2 py-0.5 rounded-full border border-white/[0.08] text-ink-300">{e.feature.day} · {e.feature.title}</span>
        </div>
        <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>Today&apos;s Take</div>
        <h1 className="font-display text-[28px] sm:text-[38px] font-medium tracking-tightest text-ink-50 leading-[1.15] max-w-3xl">
          {e.take}
        </h1>
      </header>

      {/* Frozen metrics — as published that morning */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Metric label="BTC price" value={fmtUsd(e.metrics.price)} />
        <Metric label="Context Score" value={`${cs.score}`} />
        <Metric label="Accumulation" value={`${e.metrics.accumulationScore}/100`} />
        <Metric label="Fear & Greed" value={e.metrics.fearGreed != null ? `${e.metrics.fearGreed}` : "—"} />
        <Metric label="Cycle day" value={`${e.metrics.cycleDay}`} />
        <Metric label="ETF demand" value={e.metrics.etf} />
      </section>

      {/* Context Score */}
      <Card>
        <Eyebrow>HalvingLens Context Score</Eyebrow>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-display text-[48px] leading-none text-ink-50">{cs.score}</span>
          <span className="text-[18px] text-ink-500">/100</span>
        </div>
        <div className="mt-2 text-[18px] tracking-[3px]">
          <span style={{ color: GOLD }}>{"★".repeat(cs.stars)}</span>
          <span className="text-white/15">{"★".repeat(5 - cs.stars)}</span>
        </div>
        <div className="mt-2 text-[14px] font-medium" style={{ color: GOLD }}>{cs.label}</div>
        <p className="mt-3 text-[13px] text-ink-300 leading-relaxed max-w-2xl">
          Higher scores mean this morning&apos;s market closely resembled historically significant environments.
        </p>
      </Card>

      {/* If you only read one thing */}
      <Card glow>
        <Eyebrow>If you only read one thing</Eyebrow>
        <p className="mt-3 font-display text-[19px] sm:text-[22px] text-ink-50 leading-relaxed">{e.oneThing}</p>
        <p className="mt-3 text-[10.5px] uppercase tracking-[0.16em] text-ink-500">Historical context · not prediction</p>
      </Card>

      {/* Confidence */}
      <section>
        <Eyebrow>Today&apos;s Confidence</Eyebrow>
        <div className="mt-2 font-display text-[32px] text-ink-50">{e.confidence.level}</div>
        <p className="mt-2 text-[14px] text-ink-300 leading-relaxed max-w-2xl">
          {e.confidence.blurb} <span className="text-ink-500">{e.confidence.detail}</span>
        </p>
      </section>

      {/* Market Health */}
      <section>
        <Eyebrow>Market Health</Eyebrow>
        <div className="mt-3 divide-y divide-white/[0.06]">
          {e.marketHealth.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-3">
              <span className="text-[14px] text-ink-400">{r.label}</span>
              <span className="flex items-center gap-3">
                <span className="text-[15px] font-medium" style={{ color: r.color }}>{r.value}</span>
                <span className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <span key={i} className="w-4 h-[5px] rounded-full" style={{ background: i <= r.strength ? r.color : "rgba(255,255,255,0.08)" }} />
                  ))}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Historical Context */}
      {e.historicalContext && (
        <section>
          <Eyebrow>Today&apos;s Historical Context</Eyebrow>
          <div className="mt-2 font-display text-[20px] text-ink-50">
            Closest match: {e.historicalContext.match} <span style={{ color: GOLD }}>· {e.historicalContext.similarity}% similar</span>
          </div>
          <p className="mt-3 text-[14px] text-ink-300 leading-relaxed max-w-2xl">{e.historicalContext.body}</p>
          <p className="mt-4 pl-4 border-l-2 text-[15px] text-ink-100 leading-relaxed max-w-2xl" style={{ borderColor: GOLD }}>{e.whyToday}</p>
        </section>
      )}

      {/* The Research Desk */}
      <Card glow>
        <Eyebrow>The Research Desk</Eyebrow>
        <p className="mt-3 font-display italic text-[20px] sm:text-[24px] text-ink-50 leading-snug">“{e.analyst.quote}”</p>
        <p className="mt-4 text-[14px] text-ink-300 leading-relaxed max-w-2xl">{e.analyst.body}</p>
        <p className="mt-4 text-[11px] tracking-[0.1em]" style={{ color: GOLD }}>— HalvingLens Research</p>
      </Card>

      {/* What we're watching */}
      {e.watching.length > 0 && (
        <section>
          <Eyebrow>What we&apos;re watching</Eyebrow>
          <div className="mt-3 space-y-3">
            {e.watching.map((w, i) => (
              <div key={i} className="flex gap-3">
                <span className="font-display text-[15px] shrink-0" style={{ color: GOLD }}>0{i + 1}</span>
                <div>
                  <div className="text-[14px] font-medium text-ink-100">{w.signal}</div>
                  <div className="text-[13px] text-ink-400">{w.status}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Did you know */}
      <section className="rounded-xl border border-dashed border-white/[0.1] p-5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-1.5">Did you know?</div>
        <p className="font-display text-[15px] text-ink-200 leading-relaxed">{e.memory}</p>
      </section>
    </article>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>{children}</div>;
}
function Card({ children, glow }: { children: React.ReactNode; glow?: boolean }) {
  return <div className={`${glow ? "card-glow" : "card"} p-6 sm:p-7`}>{children}</div>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className="mt-1.5 font-mono text-[15px] tabular-nums text-ink-50">{value}</div>
    </div>
  );
}
