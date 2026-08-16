import Link from "next/link";
import { ArrowUpRight, ShieldAlert, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Metadata } from "next";
import { DataBadge } from "@/components/DataBadge";
import { LastUpdated } from "@/components/LastUpdated";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { BriefSignup } from "@/components/BriefSignup";
import { RelatedResearch } from "@/components/RelatedResearch";
import { MarketHealthTimelineChart } from "@/components/MarketHealthTimelineChart";
import { marketHealthRead, healthColor } from "@/lib/marketHealth";
import type { Dir } from "@/lib/dailyChange";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bitcoin Market Health",
  description:
    "How healthy does today's Bitcoin market look versus its own history? A composite 0–100 health score built from cycle timing, price structure, ETF demand, sentiment and miner health. Educational context — not a prediction, not financial advice.",
  alternates: { canonical: "/market-health" },
};

const DISCLAIMER =
  "The Market Health score is educational historical context only. It is not financial advice, not a prediction, and not a buy or sell signal. Every reading describes how today's conditions compare with Bitcoin's own history — past behaviour is never a guarantee of future results.";

const CONF_LABEL: Record<string, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

export default function MarketHealthPage() {
  const h = marketHealthRead();

  return (
    <div className="space-y-12">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">Market health</span>
          <DataBadge status="live-derived" source="derived from live cycle data" />
        </div>
        <h1 className="font-display text-[34px] sm:text-[44px] font-medium tracking-tightest text-ink-50 leading-[1.05]">
          How healthy is Bitcoin&apos;s market today?
        </h1>
        <p className="mt-4 text-[14.5px] text-ink-300 leading-relaxed max-w-2xl">
          A single, honest read on the <span className="text-ink-100">condition</span> of the Bitcoin
          market versus its own history — blending cycle timing, price structure, ETF demand, sentiment
          and miner health into one 0–100 score. Higher means{" "}
          <span className="text-ink-100">calmer and lower-risk</span>; lower means hotter and more
          stretched. It is context, <span className="text-ink-100">never a prediction</span>.
        </p>
        <div className="mt-3">
          <LastUpdated prefix="As of" />
        </div>
      </header>

      {/* Hero — today's score */}
      <section className="card-glow p-6 sm:p-8">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-10 items-center">
          <div className="text-center lg:text-left">
            <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400 mb-2">Market Health score</div>
            <div className="font-display font-medium tracking-tightest leading-none" style={{ color: h.color }}>
              <span className="text-[92px] sm:text-[120px]">{h.score}</span>
              <span className="text-[30px] sm:text-[38px] text-ink-500"> / 100</span>
            </div>
            <div className="mt-3 inline-flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: h.color }} />
              <span className="text-[18px] sm:text-[20px] font-medium text-ink-50">{h.label}</span>
              <span className="text-[13px] text-ink-400">· {h.tag}</span>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-[14.5px] text-ink-200 leading-relaxed">{h.interpretation}</p>
            {/* Score scale */}
            <div>
              <div className="relative h-2.5 rounded-full overflow-hidden flex">
                {["#ff5d5d", "#f97316", "#f5b942", "#5eead4", "#3ddc97"].map((c) => (
                  <span key={c} className="flex-1" style={{ background: c, opacity: 0.8 }} />
                ))}
                <span
                  className="absolute -top-1 w-4.5 h-4.5"
                  style={{ left: `${Math.min(100, Math.max(0, h.score))}%`, marginLeft: -9, width: 18, height: 18, borderRadius: 9, background: "#fff", border: "4px solid #070a0f" }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] uppercase tracking-[0.14em] text-ink-500">
                <span>Overheated</span>
                <span>Balanced</span>
                <span>Calm</span>
              </div>
            </div>
            <p className="text-[11.5px] text-ink-500 leading-relaxed">
              Historical context — not financial advice, not a prediction, and not a buy or sell signal.
            </p>
          </div>
        </div>
      </section>

      {/* Section 1 — What drives the score */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-accent mb-1.5">What drives the score?</h2>
        <p className="text-[12.5px] text-ink-400 mb-4 max-w-2xl">
          The health score is the average of the factors below — each a 0–100 condition reading (higher =
          calmer). Factors are weighted equally and drop out cleanly when their data isn&apos;t available,
          so the number never leans on a metric it doesn&apos;t have.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {h.factors.map((f) => (
            <div key={f.factor} className="card p-5">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[13.5px] font-medium text-ink-100">{f.factor}</span>
                <span className="text-[12px] text-ink-300">{f.status}</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, f.score))}%`, background: healthColor(f.score) }} />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="font-mono text-[11px] text-ink-500">{f.score}/100</span>
                <span className="text-[10px] uppercase tracking-[0.12em] text-ink-500">{CONF_LABEL[f.confidence] ?? f.confidence}</span>
              </div>
              <p className="mt-2.5 text-[12px] text-ink-300 leading-relaxed">{f.explanation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2 — Historical value backdrop (real long-history percentile) */}
      <section className="card-glow p-6 sm:p-8 text-center">
        <div className="text-[11px] uppercase tracking-[0.2em] text-accent mb-3">How unusual is today?</div>
        <div className="font-display text-[40px] sm:text-[56px] font-medium tracking-tightest leading-none" style={{ color: h.value.bandColor }}>
          {h.value.cheaperThan}<span className="text-[24px] sm:text-[30px] text-ink-500">th percentile</span>
        </div>
        <p className="mt-4 text-[14.5px] sm:text-[15.5px] text-ink-200 leading-relaxed max-w-2xl mx-auto">
          By the price-only <Link href="/accumulation" className="text-accent hover:text-accent-soft">Accumulation Index</Link>, today&apos;s
          conditions are more attractive than <span className="text-ink-50 font-medium">{h.value.cheaperThan}%</span> of all weeks
          since 2012 — a <span className="text-ink-50 font-medium">{h.value.bandLabel.replace("Historically ", "").toLowerCase()}</span> value
          backdrop. This is the one lens with a full multi-cycle history behind it.
        </p>
        <p className="mt-3 text-[11.5px] text-ink-500">Historical context — not a prediction or advice.</p>
      </section>

      {/* Section 3 — Historical timeline */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-accent mb-1.5">The health score through time</h2>
        <p className="text-[12.5px] text-ink-400 mb-4 max-w-2xl">
          The composite score each day since we began publishing the daily brief
          {h.trackedDays ? <> — <span className="text-ink-200">{h.trackedDays} days</span> so far</> : null}. A short
          record by design; it grows by one point every morning. For deep, multi-cycle history see the{" "}
          <Link href="/accumulation" className="text-accent hover:text-accent-soft">Accumulation Index</Link>.
        </p>
        <div className="card p-4 sm:p-7 relative">
          <MarketHealthTimelineChart data={h.timeline} height={380} />
          <div className="watermark">halvinglens.com · market health</div>
        </div>
      </section>

      {/* Section 4 — Interpretation */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-accent mb-1.5">What this means</h2>
        <div className="card p-5 sm:p-6">
          <p className="text-[14.5px] text-ink-100 leading-relaxed">{h.interpretation}</p>
          <p className="mt-3 text-[13px] text-ink-300 leading-relaxed">{h.value.reasoning}</p>
          <p className="mt-3 text-[11.5px] text-ink-500 leading-relaxed">
            Read the score as a description of where conditions sit versus history — not as a forecast of
            what happens next. Every factor is a present-day observation, and none of them predicts price.
          </p>
        </div>
      </section>

      {/* Section 5 — What changed */}
      {h.change.available && (
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-accent mb-1.5">What changed?</h2>
          <p className="text-[12.5px] text-ink-400 mb-4 max-w-2xl">
            Day-over-day, versus the last daily brief{h.change.sinceLabel ? <> ({h.change.sinceLabel})</> : null}. What
            improved, what weakened.
          </p>
          <div className="card divide-y divide-white/[0.06]">
            {(h.change.changed.length ? h.change.changed : h.change.deltas).map((d) => (
              <div key={d.key} className="flex items-start gap-3 p-4">
                <DirIcon dir={d.dir} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-[13px] text-ink-100">{d.label}: <span className="text-ink-300">{d.display}</span></span>
                    {d.changeLabel && <span className={`font-mono text-[11.5px] ${d.dir === "up" ? "text-signal-green" : d.dir === "down" ? "text-signal-red" : "text-ink-500"}`}>{d.changeLabel}</span>}
                  </div>
                  <p className="mt-1 text-[12px] text-ink-400 leading-relaxed">{d.why}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Email conversion */}
      <BriefSignup
        heading="Get the Market Health read by email"
        blurb="Join the free Daily Bitcoin Cycle Brief — the readings behind this page, checked each morning against their own history, and one verdict on whether anything moved. No hype, no predictions."
      />

      {/* Section 6 — Related content */}
      <RelatedResearch topics={["Drawdowns", "Sentiment", "ETF"]} heading="Related research" limit={3} />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CrossLink href="/accumulation" title="Accumulation Index" sub="The price-only value score, 2012→ today." />
        <CrossLink href="/etf" title="ETF Flows" sub="What institutions are doing, day by day." />
        <CrossLink href="/similar-moments" title="Similar moments" sub="The historical moments today most resembles." />
      </section>

      <div className="rounded-xl border border-accent/15 bg-accent/[0.04] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert size={18} className="text-accent mt-0.5 shrink-0" strokeWidth={1.8} />
          <p className="text-[12px] text-ink-300 leading-relaxed">{DISCLAIMER}</p>
        </div>
      </div>

      <FeedbackWidget section="market_health" contentType="page" label="Was the Market Health page useful?" />
    </div>
  );
}

function DirIcon({ dir }: { dir: Dir }) {
  if (dir === "up") return <TrendingUp size={16} className="text-signal-green mt-0.5 shrink-0" strokeWidth={1.8} />;
  if (dir === "down") return <TrendingDown size={16} className="text-signal-red mt-0.5 shrink-0" strokeWidth={1.8} />;
  return <Minus size={16} className="text-ink-500 mt-0.5 shrink-0" strokeWidth={1.8} />;
}

function CrossLink({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link href={href} className="card card-interactive p-5 flex items-center justify-between gap-4 group hover:border-accent/30">
      <div>
        <div className="text-[13.5px] font-medium text-ink-100">{title}</div>
        <div className="text-[12px] text-ink-400 mt-0.5">{sub}</div>
      </div>
      <ArrowUpRight size={16} className="text-accent shrink-0" />
    </Link>
  );
}
