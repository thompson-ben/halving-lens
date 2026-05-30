import { format } from "date-fns";
import { PriceSentimentChart } from "@/components/PriceSentimentChart";
import { DataBadge } from "@/components/DataBadge";
import { SENTIMENT } from "@/lib/btcData";
import {
  FORWARD_HORIZON_DAYS,
  forwardReturnByBand,
  pricedSentimentSeries,
  SENTIMENT_AVAILABLE,
  sentimentRead,
} from "@/lib/sentiment";

const TONE_TEXT: Record<string, string> = {
  red: "text-signal-red",
  amber: "text-signal-amber",
  muted: "text-ink-300",
  green: "text-signal-green",
  teal: "text-accent",
};

export default function SentimentPage() {
  const read = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  const overlay = SENTIMENT_AVAILABLE ? pricedSentimentSeries() : [];
  const returns = SENTIMENT_AVAILABLE ? forwardReturnByBand(FORWARD_HORIZON_DAYS) : [];

  return (
    <div className="space-y-12 lg:space-y-14">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">Sentiment</span>
          <DataBadge
            status={read ? "live" : "coming-soon"}
            source={read ? "alternative.me Fear & Greed" : undefined}
          />
        </div>
        <h1 className="font-display text-[34px] sm:text-[40px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          How does the market feel right now?
        </h1>
        <p className="mt-5 text-[15px] lg:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          The Crypto Fear &amp; Greed Index condenses volatility, momentum, volume and social
          signals into a single 0–100 score. Low means fear; high means greed.
        </p>
      </header>

      {read ? (
        <>
          {/* Current reading */}
          <section className="card-glow p-6 sm:p-8 lg:p-10 relative overflow-hidden">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 lg:gap-10 items-center">
              <div className="text-center lg:text-left">
                <div className="text-[10.5px] uppercase tracking-[0.18em] text-ink-400 mb-2">
                  Today
                </div>
                <div className="flex items-baseline gap-2 justify-center lg:justify-start">
                  <span className="font-display text-[72px] font-medium tracking-tightest text-ink-50 tabular-nums leading-none">
                    {read.value.toFixed(0)}
                  </span>
                  <span className="text-[14px] text-ink-400">/ 100</span>
                </div>
                <div className={`mt-3 text-[18px] font-medium ${TONE_TEXT[read.band.tone]}`}>
                  {read.band.label}
                </div>

                {/* 0–100 scale with marker (standard: fear red → greed green) */}
                <div className="mt-6">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-signal-red via-signal-amber to-signal-green opacity-75" />
                  <div className="relative h-0">
                    <div
                      className="absolute w-3 h-3 -mt-[22px] rounded-full bg-ink-50 ring-2 ring-ink-950"
                      style={{ left: `calc(${read.value}% - 6px)`, boxShadow: "0 0 12px rgba(255,255,255,0.45)" }}
                    />
                  </div>
                  <div className="mt-3 flex justify-between text-[10px] text-ink-400 font-mono tracking-wider">
                    <span>0 · FEAR</span>
                    <span>100 · GREED</span>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="font-display text-[20px] lg:text-[24px] font-medium tracking-tight-2 text-ink-100 leading-snug">
                  What it&apos;s telling us
                </h2>
                <p className="mt-3.5 text-[14px] text-ink-300 leading-relaxed">{read.summary}</p>
              </div>
            </div>
            <div className="watermark">halving.lens · sentiment</div>
          </section>

          {/* Fear & Greed vs price — does sentiment line up with tops/bottoms? */}
          <section>
            <div className="mb-5">
              <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">
                Fear &amp; Greed vs Bitcoin price
              </h2>
              <p className="text-[12.5px] text-ink-400 mt-1.5 max-w-2xl">
                The Bitcoin price (log scale), with every marker coloured by that day&apos;s Fear
                &amp; Greed reading — red (fear) → green (greed). Use the range buttons to zoom in,
                and watch how red markers tend to cluster near lows and green near tops.
              </p>
            </div>
            <div className="card p-4 sm:p-7 relative">
              <PriceSentimentChart data={overlay} height={360} />
              <div className="watermark">halving.lens · fear &amp; greed</div>
            </div>
          </section>

          {/* Did buying fear pay off? — forward returns by band */}
          {returns.length > 0 && (
            <section>
              <div className="mb-5">
                <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">
                  Did buying fear pay off?
                </h2>
                <p className="text-[12.5px] text-ink-400 mt-1.5 max-w-2xl">
                  Average BTC return over the {FORWARD_HORIZON_DAYS} days following every historical
                  day, grouped by the sentiment that day. This is what happened in the past — a
                  description, not a strategy or a forecast.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {returns.map((r) => (
                  <div key={r.band} className="card p-5">
                    <div className={`text-[12px] font-medium ${TONE_TEXT[r.tone]}`}>{r.label}</div>
                    <div
                      className={`mt-2 font-display text-[26px] font-medium tracking-tight-2 tabular-nums ${
                        r.avgReturn >= 0 ? "text-signal-green" : "text-signal-red"
                      }`}
                    >
                      {r.avgReturn >= 0 ? "+" : ""}
                      {r.avgReturn.toFixed(0)}%
                    </div>
                    <div className="mt-1 text-[10.5px] text-ink-500 font-mono">
                      {r.count.toLocaleString()} days
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11.5px] text-ink-500 leading-relaxed max-w-2xl">
                Past performance says nothing about the future, sample sizes for the extreme bands
                are small, and these windows overlap. Treat it as a feel for the historical pattern,
                not a signal.
              </p>
            </section>
          )}

          {/* What/why + transparency */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-7">
              <h3 className="text-[12.5px] font-medium text-ink-100 mb-2 uppercase tracking-[0.16em]">
                Why it matters
              </h3>
              <p className="text-[13.5px] text-ink-300 leading-relaxed">
                Sentiment is a contrarian tool more than a timing one. Extremes are the signal:
                widespread fear has often appeared near lows, and euphoria near tops. It&apos;s most
                useful read alongside price and the cycle position — not on its own.
              </p>
            </div>
            <div className="card p-7">
              <h3 className="text-[12.5px] font-medium text-ink-100 mb-4 uppercase tracking-[0.16em]">
                Data transparency
              </h3>
              <dl className="space-y-3 text-[12.5px]">
                <Row label="Source" value={SENTIMENT!.source} />
                <Row label="Status" value="Live" />
                <Row
                  label="Updated"
                  value={format(new Date(SENTIMENT!.fetchedAt), "MMM d, yyyy")}
                />
              </dl>
            </div>
          </section>
        </>
      ) : (
        <section className="card p-7 lg:p-8 max-w-2xl">
          <p className="text-[14px] text-ink-300 leading-relaxed">
            Live sentiment data will appear here automatically after the next daily data sync. The
            Fear &amp; Greed source is free and keyless — no setup required. Until the data lands, we
            show no figures rather than estimated ones.
          </p>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-400 uppercase tracking-[0.16em] text-[10px]">{label}</dt>
      <dd className="text-ink-200 text-right">{value}</dd>
    </div>
  );
}
