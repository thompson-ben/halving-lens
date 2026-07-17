import Link from "next/link";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { DownsideLadder } from "@/components/DownsideLadder";
import { DownsideChart } from "@/components/DownsideChart";
import { HistoricalRange } from "@/components/HistoricalRange";
import { DataBadge } from "@/components/DataBadge";
import { WhatsChanged } from "@/components/WhatsChanged";
import { metricChange } from "@/lib/metricChange";
import { LastUpdated } from "@/components/LastUpdated";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { downsideScenarios } from "@/lib/downside";
import { upsideScenarios } from "@/lib/upside";
import { fmtUsd, fmtPct } from "@/lib/format";

export const metadata = {
  title: "Historical Price Paths — how far Bitcoin has gone from here | HalvingLens",
  description:
    "The full historical range of Bitcoin outcomes from today's point in the cycle — both upside continuations and downside corrections — drawn only from how previous halving cycles behaved. Historical paths, not forecasts.",
  alternates: { canonical: "https://halvinglens.com/historical-price-paths" },
  openGraph: {
    title: "Historical Price Paths | HalvingLens",
    description: "The historical range of paths Bitcoin has taken from comparable points in previous halving cycles — upside and downside. Not forecasts.",
    url: "https://halvinglens.com/historical-price-paths",
    type: "website",
  },
};

const DISCLAIMER =
  "These are not forecasts. This analysis shows the range of paths Bitcoin has taken from comparable points in previous halving cycles. History never repeats exactly — it is educational context, not financial advice.";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Historical Price Paths",
  description:
    "The full historical range of Bitcoin outcomes from today's point in the cycle — upside continuations and downside corrections — drawn only from how previous halving cycles behaved.",
  url: "https://halvinglens.com/historical-price-paths",
  isPartOf: { "@type": "WebSite", name: "HalvingLens", url: "https://halvinglens.com" },
};

export default function HistoricalPricePathsPage() {
  const d = downsideScenarios();
  const up = upsideScenarios();

  return (
    <div className="space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">
            The historical range of outcomes
          </span>
          <DataBadge status="live-derived" source="derived from price history" />
        </div>
        <h1 className="font-display text-[34px] sm:text-[44px] font-medium tracking-tightest text-ink-50 leading-[1.05]">
          Historical Price Paths
        </h1>
        <p className="mt-4 text-[14.5px] text-ink-300 leading-relaxed max-w-2xl">
          From today&rsquo;s point in the cycle, how far have previous Bitcoin halving cycles gone — both up and down?
          This maps the full historical range of outcomes, drawn only from how prior cycles behaved. It is historical
          context — <span className="text-ink-100">not a prediction, not a price target</span>, and not advice.
        </p>
        <div className="mt-3">
          <LastUpdated prefix="As of" />
        </div>
      </header>

      {/* The unified range — the centrepiece */}
      {up.available && <HistoricalRange up={up} down={d} />}

      {/* Historical Upside Range */}
      {up.available && <UpsideSection up={up} />}

      <div className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">Historical Downside Range</div>
        <p className="text-[13.5px] text-ink-300 leading-relaxed max-w-2xl">
          The other half of the range: if Bitcoin fell from here, where has history found support? Long-term support levels
          alongside the drawdowns of prior Bitcoin cyclical bear markets.
        </p>
      </div>

      <WhatsChanged metric={metricChange("drawdown")} />

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

function UpsideSection({ up }: { up: ReturnType<typeof upsideScenarios> }) {
  return (
    <section>
      <div className="mb-4 max-w-2xl">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">Historical Upside Range</div>
        <p className="text-[13.5px] text-ink-300 leading-relaxed">
          If Bitcoin continued like each previous cycle from this same point after the halving, here is how far it went to
          that cycle&rsquo;s peak. These are historical continuations — not forecasts.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {up.perCycle.map((c) => (
          <div key={c.cycleId} className="card p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
              <span className="text-[12.5px] font-medium text-ink-100">{c.label}</span>
            </div>
            {c.alreadyPeaked ? (
              <>
                <div className="font-display text-[26px] text-ink-300 tabular-nums leading-none">Past peak</div>
                <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">
                  This cycle had already reached its high by this point, so it offered no further upside from here.
                </p>
              </>
            ) : (
              <>
                <div className="font-display text-[30px] text-accent tabular-nums leading-none">+{Math.round(c.remainingUpsidePct)}%</div>
                <div className="mt-1.5 text-[13px] text-ink-200 tabular-nums">≈ {fmtUsd(c.equivalentPrice, { compact: true })}</div>
                <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">
                  From here it rose {c.multiple.toFixed(1)}× to its {c.year} cycle peak.
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <RangeStat label="Historical average" value={up.averagePrice != null ? fmtUsd(up.averagePrice, { compact: true }) : "—"} sub={up.averageMult != null ? `${up.averageMult.toFixed(1)}× from here` : undefined} />
        <RangeStat label="Historical median" value={up.medianPrice != null ? fmtUsd(up.medianPrice, { compact: true }) : "—"} sub={up.medianMult != null ? `${up.medianMult.toFixed(1)}× from here` : undefined} />
        <RangeStat
          label="Historical range"
          value={up.conservativePrice != null && up.strongPrice != null ? `${fmtUsd(up.conservativePrice, { compact: true })}–${fmtUsd(up.strongPrice, { compact: true })}` : "—"}
        />
      </div>

      <p className="mt-3 text-[11.5px] text-ink-500 leading-relaxed max-w-3xl">
        These are not forecasts. They simply illustrate how previous Bitcoin halving cycles behaved from comparable points
        in history. History never repeats exactly, but the historical range of outcomes provides valuable context.
      </p>
    </section>
  );
}

function RangeStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-ink-950/40 p-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink-500">{label}</div>
      <div className="mt-1 text-[18px] font-display text-ink-50 tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-[10.5px] text-ink-500 leading-tight">{sub}</div>}
    </div>
  );
}
