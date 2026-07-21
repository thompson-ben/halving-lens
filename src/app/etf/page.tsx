import Link from "next/link";
import type { Metadata } from "next";
import { TrendingUp, Layers, CalendarClock, LineChart, ArrowUpRight, Lock } from "lucide-react";
import { format } from "date-fns";
import { DataBadge } from "@/components/DataBadge";
import { WhatsChanged } from "@/components/WhatsChanged";
import { metricChange } from "@/lib/metricChange";
import { EtfTrendChart } from "@/components/EtfTrendChart";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { BriefSignup } from "@/components/BriefSignup";
import { RelatedResearch } from "@/components/RelatedResearch";
import { ETF } from "@/lib/etf";
import { etfFlowsRead, etfFlowsInterpretation } from "@/lib/etfFlows";
import { fmtUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bitcoin ETF Flows",
  description:
    "The institutional demand hub: daily US spot Bitcoin ETF net flows, 7/30/90-day trends, cumulative total, streaks and historical context. Educational context — not a prediction, not financial advice.",
  alternates: { canonical: "/etf" },
};

const PLANNED = [
  { icon: TrendingUp, name: "Daily net flow", detail: "How much money moved into or out of all US spot Bitcoin ETFs each day." },
  { icon: LineChart, name: "Cumulative flow", detail: "The running total — the size of the structural demand sink." },
  { icon: CalendarClock, name: "Biggest inflow & outflow days", detail: "The standout days, and what was happening to price around them." },
  { icon: Layers, name: "Flow vs. price", detail: "Whether ETF demand is leading, lagging, or diverging from BTC price." },
];

export default function EtfPage() {
  return (
    <div className="space-y-12 lg:space-y-14">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">ETF flows</span>
          <DataBadge status={ETF.connected ? "live" : "coming-soon"} source={ETF.source ?? undefined} />
        </div>
        <h1 className="font-display text-[34px] sm:text-[40px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          What are institutions doing?
        </h1>
        <p className="mt-5 text-[15px] lg:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          US spot Bitcoin ETFs launched in 2024 — for the first time, large, regulated buyers can hold
          Bitcoin through a normal brokerage. This is the structural demand that didn&apos;t exist in
          2012, 2016 or 2020. Here is what it&apos;s doing, day by day.
        </p>
      </header>

      {ETF.connected && <WhatsChanged metric={metricChange("etf_flow")} />}

      {ETF.connected ? <LiveEtf /> : <ComingSoonEtf />}

      <FeedbackWidget section="etf_flows" contentType="page" label="Was the ETF flows page useful?" />
    </div>
  );
}

function LiveEtf() {
  const r = etfFlowsRead();
  const net = r.base.latest?.netFlow ?? 0;
  const netColor = net >= 0 ? "#3ddc97" : "#ff5d5d";
  const streakLabel =
    r.streak.length >= 1 ? `${r.streak.length} day${r.streak.length === 1 ? "" : "s"} of net ${r.streak.direction}s` : "Mixed";

  return (
    <>
      {/* Hero — today's net flow */}
      <section className="card-glow p-6 sm:p-8">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-center">
          <div className="text-center lg:text-left">
            <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400 mb-2">Today&apos;s net flow</div>
            <div className="font-display font-medium tracking-tightest leading-none" style={{ color: netColor }}>
              <span className="text-[64px] sm:text-[84px]">{net >= 0 ? "+" : "−"}{fmtUsd(Math.abs(net), { compact: true })}</span>
            </div>
            <div className="mt-2 text-[13px] text-ink-400">
              {r.base.latest ? format(new Date(r.base.latest.date), "d MMM yyyy") : "—"} · all US spot BTC ETFs
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-[14.5px] text-ink-200 leading-relaxed">{etfFlowsInterpretation(r)}</p>
            <div className="grid grid-cols-3 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
              <Fact label="7-day net" value={signedCompact(r.windows.d7.net)} tone={r.windows.d7.net} />
              <Fact label="30-day net" value={signedCompact(r.windows.d30.net)} tone={r.windows.d30.net} />
              <Fact label="Cumulative" value={fmtUsd(r.base.cumulative, { compact: true })} tone={r.base.cumulative} />
            </div>
            <p className="text-[11.5px] text-ink-500 leading-relaxed">
              Historical context — not financial advice, not a prediction.
            </p>
          </div>
        </div>
      </section>

      {/* Section 1 — Today's breakdown */}
      <section>
        <div className="mb-4">
          <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">Today&apos;s breakdown</h2>
          <p className="text-[12.5px] text-ink-400 mt-1.5 max-w-2xl">Where today sits, and the standout days on record.</p>
        </div>
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
          <Fact label="Net flow today" value={signedCompact(net)} tone={net} sub={r.base.latest ? format(new Date(r.base.latest.date), "d MMM") : undefined} />
          <Fact label="Current streak" value={streakLabel} tone={r.streak.direction === "inflow" ? 1 : r.streak.direction === "outflow" ? -1 : null} />
          <Fact label="Biggest inflow day" value={r.base.biggestInflow ? fmtUsd(r.base.biggestInflow.netFlow, { compact: true }) : "—"} tone={1} sub={r.base.biggestInflow ? format(new Date(r.base.biggestInflow.date), "d MMM yyyy") : undefined} />
          <Fact label="Biggest outflow day" value={r.base.biggestOutflow ? fmtUsd(r.base.biggestOutflow.netFlow, { compact: true }) : "—"} tone={-1} sub={r.base.biggestOutflow ? format(new Date(r.base.biggestOutflow.date), "d MMM yyyy") : undefined} />
        </section>

        {/* Per-ETF table — honestly gated until a per-issuer source is connected */}
        <div className="mt-3 card p-5 flex items-start gap-3">
          <span className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] text-ink-400 shrink-0">
            <Lock size={15} strokeWidth={1.8} />
          </span>
          <div>
            <div className="text-[13.5px] font-medium text-ink-100">Per-ETF breakdown &amp; largest buyer / seller — coming soon</div>
            <p className="mt-1 text-[12.5px] text-ink-400 leading-relaxed max-w-2xl">
              Our current source reports the <span className="text-ink-200">aggregate</span> net flow across all US spot
              Bitcoin ETFs. A fund-by-fund table (IBIT, FBTC, GBTC …) with the day&apos;s largest buyer and seller switches
              on once a per-issuer source is connected — we won&apos;t estimate it in the meantime.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 — Trend */}
      <section className="card p-4 sm:p-7 relative">
        <div className="mb-5">
          <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100">The trend</h2>
          <p className="text-[12px] text-ink-400 mt-1">Daily net flow (green in / red out) with the cumulative total. Switch the window.</p>
        </div>
        <EtfTrendChart points={r.points} height={400} />
        <div className="watermark">halvinglens.com · etf flows</div>
      </section>

      {/* Section 3 — Historical context */}
      <section>
        <div className="mb-4">
          <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">Historical context</h2>
          <p className="text-[12.5px] text-ink-400 mt-1.5 max-w-2xl">How unusual is today, across the {r.totalDays} days on record?</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
          <Fact label="Today's flow percentile" value={r.todayPercentile != null ? `${r.todayPercentile}th` : "—"} tone={r.todayPercentile != null && r.todayPercentile >= 50 ? 1 : -1} />
          <Fact label="Average day" value={signedCompact(r.avgDaily)} tone={r.avgDaily} />
          <Fact label="90-day average / day" value={signedCompact(r.windows.d90.avgPerDay)} tone={r.windows.d90.avgPerDay} />
          <Fact label="Current streak" value={streakLabel} tone={r.streak.direction === "inflow" ? 1 : r.streak.direction === "outflow" ? -1 : null} />
        </div>
        <p className="mt-3 text-[12px] text-ink-400 leading-relaxed max-w-2xl">
          {r.todayPercentile != null && (
            <>Today&apos;s net flow ranks in the <span className="text-ink-100">{r.todayPercentile}th percentile</span> of days on
            record — {r.todayPercentile >= 80 ? "an unusually strong inflow day" : r.todayPercentile <= 20 ? "an unusually heavy outflow day" : "a fairly ordinary day"}. </>
          )}
          Averages are over the days in our series, not since the 2024 launch.
        </p>
      </section>

      {/* Section 5 — Historical timeline (key events) */}
      <section>
        <div className="mb-4">
          <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">Timeline</h2>
          <p className="text-[12.5px] text-ink-400 mt-1.5 max-w-2xl">The milestones in this series so far.</p>
        </div>
        <div className="card divide-y divide-white/[0.06]">
          <TimelineRow date="Jan 2024" label="US spot Bitcoin ETFs launch" detail="The structural demand source that didn't exist in prior cycles." />
          {r.seriesStart && <TimelineRow date={format(new Date(r.seriesStart), "d MMM yyyy")} label="Our flow series begins" detail="Cumulative totals on this page are measured from here." />}
          {r.base.biggestInflow && <TimelineRow date={format(new Date(r.base.biggestInflow.date), "d MMM yyyy")} label="Largest inflow day on record" detail={`${fmtUsd(r.base.biggestInflow.netFlow, { compact: true })} in a single day.`} tone={1} />}
          {r.base.biggestOutflow && <TimelineRow date={format(new Date(r.base.biggestOutflow.date), "d MMM yyyy")} label="Largest outflow day on record" detail={`${fmtUsd(r.base.biggestOutflow.netFlow, { compact: true })} in a single day.`} tone={-1} />}
        </div>
      </section>

      {/* Section 6 — What changed today */}
      {r.dayDelta != null && r.prev && (
        <section>
          <div className="mb-4">
            <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">What changed today?</h2>
            <p className="text-[12.5px] text-ink-400 mt-1.5 max-w-2xl">Yesterday versus today.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
            <Fact label={`Yesterday (${format(new Date(r.prev.date), "d MMM")})`} value={signedCompact(r.prev.netFlow)} tone={r.prev.netFlow} />
            <Fact label="Today" value={signedCompact(net)} tone={net} />
            <Fact label="Day-over-day change" value={signedCompact(r.dayDelta)} tone={r.dayDelta} />
          </div>
        </section>
      )}

      <p className="text-[11.5px] text-ink-500 leading-relaxed max-w-2xl">
        Source: {ETF.source}
        {ETF.fetchedAt ? ` · updated ${format(new Date(ETF.fetchedAt), "d MMM yyyy")}` : ""}. Aggregate net flow across all
        US spot BTC ETFs. Historical context, not financial advice.
      </p>

      {/* Email conversion */}
      <BriefSignup
        heading="Get the ETF flow read by email"
        blurb="Join the free Daily Bitcoin Cycle Brief — daily net flows, what changed overnight, and where today sits in the cycle. No hype, no predictions."
      />

      {/* Section 7 — Related content */}
      <RelatedResearch topics={["ETF"]} heading="Related research" limit={3} />

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CrossLink href="/market-health" title="Market Health" sub="How healthy the market looks versus history." />
        <CrossLink href="/price" title="Bitcoin price" sub="Price, ranges and cycle context." />
        <CrossLink href="/cycles" title="Cycle comparison" sub="This cycle against 2016 and 2020." />
      </section>
    </>
  );
}

function ComingSoonEtf() {
  return (
    <>
      <section className="card-glow p-6 lg:p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <h2 className="font-display text-[20px] lg:text-[24px] font-medium tracking-tight-2 text-ink-100 leading-snug">
            Why ETF flows matter to the cycle
          </h2>
          <p className="mt-3.5 text-[14px] text-ink-300 leading-relaxed">
            Unlike previous Bitcoin cycles, the current cycle includes spot Bitcoin ETF demand — a
            structural source of buying that did not exist in 2012, 2016 or 2020. It&apos;s a leading
            candidate to explain why this cycle has so far been flatter and cooler than the classic
            four-year pattern — though it&apos;s still early, and this is context, not a forecast.
          </p>
        </div>
        <div className="watermark">halvinglens.com · etf flows</div>
      </section>

      <section>
        <div className="mb-6">
          <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">What you&apos;ll see here</h2>
          <p className="text-[12.5px] text-ink-400 mt-1.5 max-w-xl">
            We won&apos;t show estimated ETF numbers. These panels switch on with real data once the
            source is connected.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLANNED.map((f) => (
            <div key={f.name} className="card p-6">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] text-accent shrink-0">
                  <f.icon size={15} strokeWidth={1.8} />
                </span>
                <div>
                  <div className="text-[13.5px] font-medium text-ink-100">{f.name}</div>
                  <p className="mt-1.5 text-[12.5px] text-ink-300 leading-relaxed">{f.detail}</p>
                </div>
              </div>
              <div className="mt-5 h-20 rounded-lg border border-dashed border-white/[0.07] bg-white/[0.01] flex items-center justify-center">
                <span className="text-[11px] text-ink-500">Live data coming soon</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function signedCompact(n: number): string {
  return `${n >= 0 ? "+" : "−"}${fmtUsd(Math.abs(n), { compact: true })}`;
}

function Fact({ label, value, tone, sub }: { label: string; value: string; tone?: number | null; sub?: string }) {
  const color = tone == null ? "text-ink-100" : tone >= 0 ? "text-signal-green" : "text-signal-red";
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className={`mt-1.5 font-mono text-[15px] tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10.5px] text-ink-500 mt-1">{sub}</div>}
    </div>
  );
}

function TimelineRow({ date, label, detail, tone }: { date: string; label: string; detail: string; tone?: number }) {
  const dot = tone == null ? "#5eead4" : tone >= 0 ? "#3ddc97" : "#ff5d5d";
  return (
    <div className="flex items-start gap-3 p-4">
      <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
      <div className="flex-1">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[13px] font-medium text-ink-100">{label}</span>
          <span className="font-mono text-[11px] text-ink-500">{date}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-ink-400 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
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
