import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { WeeklyReport as WR } from "@/lib/weekly";
import { absoluteUrl } from "@/lib/site";
import { fmtUsd } from "@/lib/format";

const GOLD = "#d9b96a";

// Renders a frozen weekly report. liveChart embeds the current Chart of the Week
// only for the latest edition (archived weeks stay text-accurate).
export function WeeklyReport({ w, liveChart = false }: { w: WR; liveChart?: boolean }) {
  return (
    <article className="space-y-12">
      <header className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap text-[11px]">
          <span className="font-mono" style={{ color: GOLD }}>Weekly #{w.edition}</span>
          <span className="text-ink-500">·</span>
          <span className="text-ink-400">{w.weekLabel}</span>
        </div>
        <h1 className="font-display text-[30px] sm:text-[42px] font-medium tracking-tightest text-ink-50 leading-[1.08] max-w-3xl">
          {w.biggestStory.title}
        </h1>
      </header>

      {/* Executive summary */}
      <Card glow>
        <Eyebrow>The week in 30 seconds</Eyebrow>
        <ul className="mt-3 space-y-2.5">
          {w.executiveSummary.map((b, i) => (
            <li key={i} className="flex gap-3 text-[15px] text-ink-200 leading-relaxed">
              <span style={{ color: GOLD }}>—</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Biggest story */}
      <section>
        <Eyebrow>The week&apos;s biggest story</Eyebrow>
        <p className="mt-3 text-[16px] text-ink-200 leading-relaxed max-w-3xl">{w.biggestStory.body}</p>
      </section>

      {/* Chart of the week (live only for the latest edition) */}
      {liveChart && (
        <section>
          <Eyebrow>Chart of the week</Eyebrow>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={absoluteUrl("/email/chart")}
            alt="HalvingLens — chart of the week"
            className="mt-3 w-full rounded-xl border border-white/[0.08]"
          />
        </section>
      )}

      {/* What changed this week */}
      <section>
        <Eyebrow>What changed this week</Eyebrow>
        <div className="mt-3 divide-y divide-white/[0.06]">
          {w.whatChanged.map((c) => (
            <div key={c.label} className="flex items-center justify-between py-3">
              <span className="text-[14px] text-ink-400">{c.label}</span>
              <span className="flex items-center gap-2 text-[14px]">
                {c.from && <span className="text-ink-500">{c.from} →</span>}
                <span className="text-ink-100 font-medium">{c.to}</span>
                {c.dir === "up" ? <ArrowUp size={13} className="text-signal-green" /> : c.dir === "down" ? <ArrowDown size={13} className="text-signal-red" /> : <Minus size={13} className="text-ink-500" />}
              </span>
            </div>
          ))}
        </div>
        {!w.whatChanged[0]?.from && (
          <p className="mt-3 text-[12px] text-ink-500">Week-over-week comparison begins once a second weekly is archived.</p>
        )}
      </section>

      {/* Weekly market health */}
      <section>
        <Eyebrow>Weekly market health</Eyebrow>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          {w.marketHealth.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-3 border-b border-white/[0.06]">
              <span className="text-[14px] text-ink-400">{r.label}</span>
              <span className="flex items-center gap-3">
                <span className="text-[15px] font-medium" style={{ color: r.color }}>{r.value}</span>
                {r.metric ? (
                  <span className="text-[13px] font-medium text-ink-500 tabular-nums">{r.metric}</span>
                ) : (
                  <span className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <span key={i} className="w-4 h-[5px] rounded-full" style={{ background: i <= r.strength ? r.color : "rgba(255,255,255,0.08)" }} />
                    ))}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Similar moments */}
      {w.similar && (
        <section>
          <Eyebrow>Similar moments</Eyebrow>
          <div className="mt-2 font-display text-[20px] text-ink-50">
            {w.similar.match} <span style={{ color: GOLD }}>· {w.similar.similarity}% similar</span>
          </div>
          <p className="mt-3 text-[15px] text-ink-300 leading-relaxed max-w-3xl">{w.similar.body}</p>
        </section>
      )}

      {/* Research desk */}
      <Card glow>
        <Eyebrow>Research Desk</Eyebrow>
        <p className="mt-3 text-[16px] text-ink-200 leading-relaxed">{w.researchDesk}</p>
        <p className="mt-4 text-[11px] tracking-[0.1em]" style={{ color: GOLD }}>— HalvingLens Research</p>
      </Card>

      {/* Week ahead */}
      <section>
        <Eyebrow>The week ahead — what we&apos;re watching</Eyebrow>
        <div className="mt-3 space-y-2.5">
          {w.weekAhead.map((x, i) => (
            <div key={i} className="flex gap-3 text-[14px] text-ink-300 leading-relaxed">
              <span className="font-display text-[14px]" style={{ color: GOLD }}>0{i + 1}</span>
              <span>{x}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-500">What we&apos;ll be watching — not predictions.</p>
      </section>

      {/* Long view */}
      <section>
        <Eyebrow>The long view</Eyebrow>
        <p className="mt-3 text-[16px] text-ink-200 leading-relaxed max-w-3xl">{w.longView}</p>
      </section>

      {/* Education */}
      <section className="rounded-xl border border-dashed border-white/[0.1] p-5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 mb-1.5">Did you know?</div>
        <p className="font-display text-[15px] text-ink-200 leading-relaxed">{w.education}</p>
      </section>

      {/* Frozen metrics */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Metric label="BTC price" value={fmtUsd(w.metrics.price)} />
        <Metric label="Context Score" value={`${w.metrics.contextScore}`} />
        <Metric label="Accumulation" value={`${w.metrics.accumulationScore}/100`} />
        <Metric label="Fear & Greed" value={w.metrics.fearGreed != null ? `${w.metrics.fearGreed}` : "—"} />
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
