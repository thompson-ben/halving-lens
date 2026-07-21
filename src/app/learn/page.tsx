import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DataBadge, STATUS_EXPLAIN } from "@/components/DataBadge";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { METRICS } from "@/lib/metrics";
import { metricStatus, type DataStatus } from "@/lib/cycleIntel";

export const metadata = {
  title: "Learn",
};

const CYCLE_BASICS: { term: string; def: string }[] = [
  {
    term: "Halving",
    def: "Roughly every four years (every 210,000 blocks), the reward miners earn per block is cut in half. It paces Bitcoin's new supply and, historically, its price cycles.",
  },
  {
    term: "Halving cycle",
    def: "The ~4-year window from one halving to the next. We number them — cycle 5 began at the April 2024 halving.",
  },
  {
    term: "Day in cycle",
    def: "How many days it has been since the last halving. It's the yardstick we use to line cycles up and compare them fairly.",
  },
  {
    term: "Cycle top (bull peak)",
    def: "The highest price during a cycle's bull market. In the last three cycles it landed roughly 12–18 months after the halving.",
  },
  {
    term: "Cycle bottom (bear low)",
    def: "The lowest price after the top — the bear-market floor. Historically about 2–2.5 years after the halving.",
  },
  {
    term: "Drawdown",
    def: "How far price has fallen from its peak, as a percentage. A −80% drawdown means price sits 80% below its high.",
  },
  {
    term: "Diminishing returns",
    def: "Each cycle's percentage gain has so far been smaller than the one before. It's an observed pattern, not a law.",
  },
];

const SENTIMENT_STRUCTURE: { term: string; def: string }[] = [
  {
    term: "Fear & Greed Index",
    def: "A 0–100 gauge of market mood built from volatility, momentum, volume and social signals. Low = fear, high = greed. Most useful at the extremes.",
  },
  {
    term: "Spot Bitcoin ETF",
    def: "A fund that holds real Bitcoin, letting regulated investors get exposure through a normal brokerage. US spot ETFs launched in 2024 — a source of demand that didn't exist in earlier cycles.",
  },
  {
    term: "ETF flows",
    def: "The net money moving into or out of those ETFs each day — a read on institutional demand.",
  },
  {
    term: "Realised price",
    def: "The average price at which all coins last moved — an aggregate 'cost basis' for the whole market.",
  },
  {
    term: "Issuance & inflation",
    def: "New BTC minted per block. Each halving cuts the rate in half, so Bitcoin's annual inflation keeps falling toward zero (capped at 21M coins).",
  },
];

export default function LearnPage() {
  const statuses: DataStatus[] = ["live", "live-derived", "coming-soon"];

  return (
    <div className="space-y-14">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-4">Learn</div>
        <h1 className="font-display text-[36px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Bitcoin cycles, in plain English.
        </h1>
        <p className="mt-5 text-[15px] lg:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          Every term we use across the site, defined for a normal person — no trading jargon, no
          hype. If something on a chart isn&apos;t clear, it should be here.
        </p>
      </header>

      {/* How to read the site — data status legend */}
      <section>
        <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100 mb-2">
          How to read halvinglens.com
        </h2>
        <p className="text-[13px] text-ink-300 max-w-2xl leading-relaxed mb-6">
          We only show numbers we can stand behind, and we label exactly how fresh each one is.
          You&apos;ll see one of these badges next to the data:
        </p>
        <div className="space-y-3 max-w-3xl">
          {statuses.map((s) => (
            <div key={s} className="card p-5 flex items-start gap-4">
              <div className="shrink-0 pt-0.5">
                <DataBadge status={s} />
              </div>
              <p className="text-[13px] text-ink-300 leading-relaxed">{STATUS_EXPLAIN[s]}</p>
            </div>
          ))}
        </div>
      </section>

      <Glossary title="Cycle basics" terms={CYCLE_BASICS} />

      {/* Metrics — pulled from the live metric library so it never drifts */}
      <section>
        <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100 mb-2">
          The metrics
        </h2>
        <p className="text-[13px] text-ink-400 max-w-2xl leading-relaxed mb-6">
          The signals behind the cycle. Tap any to open its full page.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {METRICS.map((m) => (
            <Link
              key={m.slug}
              href={`/metrics/${m.slug}`}
              className="card card-interactive p-5 block group hover:border-accent/25"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="font-display text-[15px] font-medium tracking-tight-2 text-ink-100 group-hover:text-accent transition-colors">
                  {m.name}
                </span>
                <ArrowUpRight size={13} className="text-ink-500 group-hover:text-accent shrink-0" />
              </div>
              <DataBadge status={metricStatus(m.slug)} size="sm" />
              <p className="mt-3 text-[12.5px] text-ink-300 leading-relaxed">{m.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <Glossary title="Sentiment & structure" terms={SENTIMENT_STRUCTURE} />

      <section className="card-glow p-6 lg:p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100">
            One honest caveat
          </h2>
          <p className="mt-3 text-[13.5px] text-ink-300 leading-relaxed">
            Everything here is historical context and education — not financial advice, and not a
            forecast. Bitcoin has only had a handful of cycles, the sample is tiny, and the ETF era
            may well break the old patterns. We show you the rhythm of the past so you can think
            clearly about the present.
          </p>
        </div>
        <div className="watermark">halvinglens.com · learn</div>
      </section>

      <FeedbackWidget section="learn" contentType="education" label="Was this useful?" />
    </div>
  );
}

function Glossary({ title, terms }: { title: string; terms: { term: string; def: string }[] }) {
  return (
    <section>
      <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100 mb-6">
        {title}
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
        {terms.map((t) => (
          <div key={t.term} className="border-l-2 border-accent/30 pl-4">
            <dt className="text-[14px] font-medium text-ink-100">{t.term}</dt>
            <dd className="mt-1.5 text-[12.5px] text-ink-300 leading-relaxed">{t.def}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
