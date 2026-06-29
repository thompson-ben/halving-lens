import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { accumulationRead } from "@/lib/accumulation";

// Compact homepage teaser for the Accumulation Index — built for curiosity and
// click-through, not a full explanation. Historical context framing only.
export function AccumulationIndexModule() {
  const r = accumulationRead();
  const cheaperThan = 100 - r.historicalPercentile;

  return (
    <Link
      href="/accumulation"
      className="card card-interactive p-6 sm:p-8 block group hover:border-accent/30 relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-6">
          <div className="flex items-baseline gap-1.5 shrink-0">
            <span className="font-display text-[56px] sm:text-[64px] leading-none font-medium tracking-tightest" style={{ color: r.band.color }}>
              {r.score}
            </span>
            <span className="text-[16px] text-ink-500 font-display">/100</span>
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-1.5">
              Bitcoin Accumulation Index
            </div>
            <div className="text-[19px] sm:text-[22px] font-medium text-ink-50 leading-tight" style={{ color: r.band.color }}>
              {r.band.label}
            </div>
            <div className="text-[12px] text-ink-400 mt-1">
              {r.historicalPercentile}th percentile of Bitcoin history · cheaper than {cheaperThan}% of all weeks
            </div>
          </div>
        </div>
        <div className="hidden sm:inline-flex items-center gap-1.5 text-accent text-[12.5px] group-hover:gap-2.5 transition-all whitespace-nowrap pt-1">
          View full analysis <ArrowUpRight size={14} />
        </div>
      </div>
      <p className="mt-4 text-[13.5px] text-ink-300 leading-relaxed max-w-2xl">
        Historically, conditions similar to today have produced stronger long-term outcomes than
        average. <span className="text-ink-500">Historical context — not a prediction or advice.</span>
      </p>
      <div className="sm:hidden mt-3 inline-flex items-center gap-1.5 text-accent text-[12.5px]">
        View full analysis <ArrowUpRight size={14} />
      </div>
      <div className="watermark">halvinglens.com · accumulation index</div>
    </Link>
  );
}
