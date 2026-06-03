import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CycleContextChart } from "./CycleContextChart";
import { heroInsight } from "@/lib/cycleZones";

// Demonstrates HalvingLens in ~5 seconds: the strongest live cycle insight
// (dynamically chosen), a mini cycle-context chart with the YOU ARE HERE
// marker, and a clear path deeper. Historical context, not a forecast.
export function HomeHero() {
  const insight = heroInsight();

  return (
    <section className="card-glow p-6 sm:p-8 lg:p-10 relative overflow-hidden">
      <div className="relative z-10">
        <div className="text-[10.5px] uppercase tracking-[0.24em] text-accent mb-5">Bitcoin cycle read</div>

        <h1 className="font-display text-[32px] sm:text-[44px] lg:text-[54px] font-medium tracking-tightest text-ink-50 leading-[1.04] max-w-3xl">
          The clearest view of the Bitcoin cycle.
        </h1>
        <p className="mt-4 text-[15px] sm:text-[16px] text-ink-300 max-w-2xl leading-relaxed">
          Historical context for where Bitcoin sits today. No predictions, no hype, no financial
          advice.
        </p>

        {/* Live insight card — answer first */}
        <div className="mt-7 rounded-2xl border border-accent/20 bg-accent/[0.05] p-5 sm:p-6 max-w-2xl">
          <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-2.5">{insight.metric}</div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-display text-[38px] sm:text-[48px] font-medium tracking-tightest text-ink-50 tabular-nums leading-none">
              {insight.value}
            </span>
            <p className="font-display text-[17px] sm:text-[20px] font-medium tracking-tight-2 text-ink-100 leading-snug max-w-xl">
              {insight.headline}
            </p>
          </div>
          {insight.href && insight.cta && (
            <Link
              href={insight.href}
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-soft"
            >
              {insight.cta} <ArrowUpRight size={14} />
            </Link>
          )}
        </div>

        {/* Mini cycle-context chart — the concept, immediately */}
        <div className="mt-7 max-w-3xl rounded-xl border border-white/[0.06] bg-[#0b0f15] p-4 sm:p-5">
          <CycleContextChart height={250} compact />
        </div>

        {/* Paths deeper */}
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <Link
            href="/price"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-accent text-ink-950 text-[14px] font-medium hover:bg-accent-soft transition-colors"
          >
            Explore full cycle analysis <ArrowUpRight size={16} />
          </Link>
          <Link
            href="/similar-moments"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-300 hover:text-ink-100"
          >
            Have we seen this before? <ArrowUpRight size={13} />
          </Link>
        </div>

        <p className="mt-6 text-[11.5px] text-ink-500 max-w-2xl leading-relaxed">
          Updated daily from live Bitcoin price, ETF flow, sentiment and cycle data. This is
          historical cycle analysis, not financial advice — historical behaviour is not a forecast.
        </p>
      </div>
      <div className="watermark">halvinglens.com · cycle read</div>
    </section>
  );
}
