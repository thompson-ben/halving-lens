import Link from "next/link";
import type { ChartOfWeekPick } from "@/lib/chartOfWeek";
import { ETF } from "@/lib/etf";
import { marketHealthRead } from "@/lib/marketHealth";
import { pricedSentimentSeries, SENTIMENT_AVAILABLE } from "@/lib/sentiment";
import { accumulationSeries } from "@/lib/accumulation";
import { EtfTrendChart } from "@/components/EtfTrendChart";
import { MarketHealthTimelineChart } from "@/components/MarketHealthTimelineChart";
import { PriceSentimentChart } from "@/components/PriceSentimentChart";
import { AccumulationTimelineChart } from "@/components/AccumulationTimelineChart";
import { CycleDrawdownChart } from "@/components/CycleDrawdownChart";
import { CycleOverlayChart } from "@/components/CycleOverlayChart";

// Section 4 — The Week's Lead Chart. Renders the ACTUAL chart inline (not a
// link), chosen by the same Editorial Story Engine that already powers Chart of
// the Week, so the visual matches the week's lead story. Each branch reuses the
// existing metric chart component with its existing data accessor — no chart
// maths are rebuilt here. Deep links stay as a secondary action beneath.

function ChartFor({ pick }: { pick: ChartOfWeekPick }) {
  const H = 340;
  switch (pick.key) {
    case "etf_demand":
      return ETF.connected ? <EtfTrendChart points={ETF.points} height={H} /> : <Fallback height={H} />;
    case "market_health":
      return <MarketHealthTimelineChart data={marketHealthRead().timeline} height={H} />;
    case "sentiment":
      return SENTIMENT_AVAILABLE ? <PriceSentimentChart data={pricedSentimentSeries()} height={H} /> : <Fallback height={H} />;
    case "valuation":
      return (
        <AccumulationTimelineChart
          data={accumulationSeries().map((p) => ({ ts: p.ts, price: p.price, score: p.score, bandKey: p.bandKey }))}
          height={H}
        />
      );
    case "volatility":
      return <CycleDrawdownChart height={H} />;
    case "cycle_position":
    case "similarity":
    default:
      return <CycleOverlayChart mode="normalized" height={H} />;
  }
}

function Fallback({ height }: { height: number }) {
  // The story picked a chart whose live source isn't connected — show the
  // always-available signature cycle overlay rather than an empty box.
  return <CycleOverlayChart mode="normalized" height={height} />;
}

export function LeadChart({ pick }: { pick: ChartOfWeekPick }) {
  return (
    <div className="card-glow p-4 sm:p-7 relative overflow-hidden">
      <div className="text-[10.5px] uppercase tracking-[0.2em] text-accent mb-2">The week&rsquo;s lead chart</div>
      <h3 className="font-display text-[22px] sm:text-[28px] font-medium tracking-tight-2 text-ink-50 leading-snug max-w-3xl">
        {pick.title}
      </h3>

      <div className="mt-5 rounded-xl border border-white/[0.05] bg-white/[0.015] p-2 sm:p-3">
        <ChartFor pick={pick} />
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.18em] text-ink-500 mb-1">What it shows</div>
          <p className="text-[13px] text-ink-200 leading-relaxed">{pick.why[0] ?? pick.context}</p>
        </div>
        {(pick.why[1] || pick.context) && (
          <div>
            <div className="text-[9.5px] uppercase tracking-[0.18em] text-ink-500 mb-1">Why it matters</div>
            <p className="text-[13px] text-ink-200 leading-relaxed">{pick.why[1] ?? pick.context}</p>
          </div>
        )}
      </div>

      <p className="mt-5 pt-4 border-t border-white/[0.06] text-[13.5px] text-ink-100 leading-relaxed max-w-3xl">
        {pick.takeaway}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[11px] text-ink-600">Historical context, not a forecast.</span>
        <Link href={pick.link} className="text-[12px] text-accent hover:text-accent-soft">Open the live chart →</Link>
      </div>
    </div>
  );
}
