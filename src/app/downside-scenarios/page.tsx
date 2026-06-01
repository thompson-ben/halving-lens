import Link from "next/link";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { DownsideLadder } from "@/components/DownsideLadder";
import { DownsideChart } from "@/components/DownsideChart";
import { DataBadge } from "@/components/DataBadge";
import { LastUpdated } from "@/components/LastUpdated";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { downsideScenarios } from "@/lib/downside";
import { fmtUsd, fmtPct } from "@/lib/format";

export const metadata = {
  title: "Downside scenarios — halvinglens.com",
  description:
    "Historical downside scenario map for Bitcoin — where prior cyclical bear-market drawdowns and long-term support levels would imply. Context, not a forecast.",
};

const DISCLAIMER =
  "Historical drawdowns are not forecasts. This analysis shows scenario ranges based on prior Bitcoin cycles and long-term support levels. It is educational context, not financial advice.";

export default function DownsideScenariosPage() {
  const d = downsideScenarios();

  return (
    <div className="space-y-10">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">
            Cycle low scenario map
          </span>
          <DataBadge status="live-derived" source="derived from price history" />
        </div>
        <h1 className="font-display text-[34px] sm:text-[44px] font-medium tracking-tightest text-ink-50 leading-[1.05]">
          Bitcoin downside scenarios
        </h1>
        <p className="mt-4 text-[14.5px] text-ink-300 leading-relaxed max-w-2xl">
          If Bitcoin fell from here, where could it reasonably find support based on history? This
          map compares long-term support levels with the drawdowns of prior Bitcoin cyclical bear
          markets. It is historical context — <span className="text-ink-100">not a prediction, not a price target</span>, and not advice.
        </p>
        <div className="mt-3">
          <LastUpdated prefix="As of" />
        </div>
      </header>

      {/* The scenario map */}
      <DownsideLadder />

      {/* Chart — recent price with the levels overlaid */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-accent mb-1.5">
          Levels vs recent price
        </h2>
        <p className="text-[12.5px] text-ink-400 mb-4 max-w-2xl">
          Recent Bitcoin price with each scenario level drawn in. The dashed lines mark where prior
          history would imply support — context, not targets.
        </p>
        <div className="card p-4 sm:p-7 relative">
          <DownsideChart height={440} />
          <div className="watermark">halvinglens.com · downside scenarios</div>
        </div>
      </section>

      {/* How to read it */}
      <section className="rounded-xl border border-accent/15 bg-accent/[0.04] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert size={18} className="text-accent mt-0.5 shrink-0" strokeWidth={1.8} />
          <div className="text-[13px] text-ink-300 leading-relaxed space-y-2">
            <p className="text-ink-100 font-medium text-[13.5px]">How to read this</p>
            <p>
              Bitcoin can fall significantly even inside a long-term bull structure — every prior
              cycle saw a deep drawdown from its high. These levels show where prior history{" "}
              <span className="text-ink-100">would imply</span> support, so several reference points
              can be compared at once. None is a floor, and the cycle high to date may not be the
              final high.
            </p>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-accent mb-4">Methodology</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MethodCard
            title="Historical cyclical-bear drawdowns"
            quality="live-derived"
            body={
              d.derivedFromData
                ? `Derived from Bitcoin's prior cyclical bear markets: ${d.historicalBears
                    .map((b) => `${b.label} ${fmtPct(b.drawdownPct, 0)}`)
                    .join(", ")}. The mild, average and severe tiers apply the mildest, average and deepest of these to this cycle's high.`
                : "Based on the documented depths of Bitcoin's prior cyclical bear markets, applied to this cycle's high."
            }
          />
          <MethodCard
            title="200-week moving average"
            quality="live-derived"
            body={
              d.movingAverage200w != null
                ? `The average of the last ${d.ma200wSamples} weekly closes (${fmtUsd(d.movingAverage200w, { compact: true })}). A long-term trend line that price has historically approached near major lows.`
                : "A long-term trend line that price has historically approached near major lows."
            }
          />
          <MethodCard
            title="Realized price (cost basis)"
            quality={d.realizedQuality}
            body={
              d.realizedPrice != null
                ? `The network's aggregate on-chain cost basis (${fmtUsd(d.realizedPrice, { compact: true })}). Sustained trading below it has marked deep-value, late-bear conditions.`
                : "Aggregate on-chain cost basis. Hidden until a live source is connected — we don't show estimated levels as if they were real."
            }
          />
          <MethodCard
            title="Prior cycle high"
            quality="live"
            body={
              d.priorCycleHigh != null
                ? `The previous cycle's high (${fmtUsd(d.priorCycleHigh, { compact: true })}) has historically acted as a psychological reference level.`
                : "The previous cycle's high has historically acted as a psychological reference level."
            }
          />
          <MethodCard
            title="Long-term trend regression"
            quality="live-derived"
            body={
              d.trendSupport != null
                ? `A least-squares log-log regression of price against time across ${d.trendSamples} weekly closes. Fair-value today sits near ${fmtUsd(d.trendCentral!, { compact: true })}; the lower band (${fmtUsd(d.trendSupport, { compact: true })}) marks the trend-based support prior cycle lows have approached.`
                : "A long-term logarithmic regression of price against time; its lower band marks trend-based support."
            }
          />
        </div>
        <p className="mt-4 text-[11px] text-ink-500">Methodology version {d.methodologyVersion}.</p>
      </section>

      {/* Cross-links */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/cycles"
          className="card card-interactive p-5 flex items-center justify-between gap-4 group hover:border-accent/30"
        >
          <div>
            <div className="text-[13.5px] font-medium text-ink-100">Compare every cycle</div>
            <div className="text-[12px] text-ink-400 mt-0.5">
              See how prior cycles drew down from their highs.
            </div>
          </div>
          <ArrowUpRight size={16} className="text-accent shrink-0" />
        </Link>
        <Link
          href="/brief"
          className="card card-interactive p-5 flex items-center justify-between gap-4 group hover:border-accent/30"
        >
          <div>
            <div className="text-[13.5px] font-medium text-ink-100">Today&apos;s cycle brief</div>
            <div className="text-[12px] text-ink-400 mt-0.5">
              The daily read on where the cycle stands.
            </div>
          </div>
          <ArrowUpRight size={16} className="text-accent shrink-0" />
        </Link>
      </section>

      <p className="text-[11.5px] text-ink-500 leading-relaxed max-w-2xl border-t border-white/[0.06] pt-5">
        {DISCLAIMER}
      </p>

      <FeedbackWidget />
    </div>
  );
}

function MethodCard({
  title,
  body,
  quality,
}: {
  title: string;
  body: string;
  quality: "live" | "live-derived" | "coming-soon";
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-[13.5px] font-medium text-ink-100">{title}</h3>
        <DataBadge status={quality} size="sm" showDot={false} />
      </div>
      <p className="text-[12.5px] text-ink-300 leading-relaxed">{body}</p>
    </div>
  );
}
