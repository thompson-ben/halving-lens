import { SimilarMomentsExplorer } from "@/components/SimilarMomentsExplorer";
import { SimilarityChange } from "@/components/SimilarityChange";
import { JourneyNext } from "@/components/JourneyNext";
import { similarMoments, similarityTrend } from "@/lib/similarity";

export const metadata = {
  title: "Similar Moments — have we seen this before?",
  description:
    "Find the most similar moments in Bitcoin history based on current market conditions. Historical context, not prediction.",
  alternates: { canonical: "/similar-moments" },
};

export default function SimilarMomentsPage() {
  const top = similarMoments(1)[0];

  return (
    <div className="space-y-10">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-4">Similar moments</div>
        <h1 className="font-display text-[34px] sm:text-[40px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Have we seen this before?
        </h1>
        <p className="mt-5 text-[15px] lg:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          The most similar moments in Bitcoin history, ranked by today&apos;s market conditions —
          cycle position, drawdown and price heat. Historical context, not prediction.
        </p>
      </header>

      <SimilarityChange trend={similarityTrend()} />

      {top && (
        <section className="card-glow p-6 lg:p-8 relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-2.5">
              Conditions most resemble
            </div>
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="font-display text-[44px] sm:text-[56px] font-medium tracking-tightest text-ink-50 leading-none">
                {top.dateLabel}
              </span>
              <span className="font-mono text-[22px] tabular-nums text-accent">{top.similarity}% similar</span>
            </div>
            <p className="mt-3.5 text-[14px] text-ink-300 max-w-3xl leading-relaxed">
              Today&apos;s market state most closely resembles {top.dateLabel} ({top.year} cycle).
              Expand any moment below to see the market then, and what followed over the next 30, 60
              and 90 days.
            </p>
          </div>
          <div className="watermark">halvinglens.com · similar moments</div>
        </section>
      )}

      <SimilarMomentsExplorer limit={5} />

      <div className="card-glow p-5 relative">
        <div className="text-[10px] uppercase tracking-[0.18em] text-accent mb-2">Required context</div>
        <p className="text-[13px] text-ink-200 leading-relaxed">
          Historical outcomes are not predictive. Past performance does not predict future results.
          The 2024 cycle has a structural difference — US spot ETF demand — that did not exist in
          prior cycles. This is historical pattern context, not financial advice.
        </p>
      </div>

      <JourneyNext from="/similar-moments" />
    </div>
  );
}
