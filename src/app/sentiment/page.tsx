import { format } from "date-fns";
import { SentimentChart } from "@/components/SentimentChart";
import { SENTIMENT } from "@/lib/btcData";
import { SENTIMENT_AVAILABLE, sentimentRead } from "@/lib/sentiment";

const TONE_TEXT: Record<string, string> = {
  red: "text-signal-red",
  amber: "text-signal-amber",
  muted: "text-ink-300",
  green: "text-signal-green",
  teal: "text-accent",
};

export default function SentimentPage() {
  const read = SENTIMENT_AVAILABLE ? sentimentRead() : null;

  return (
    <div className="space-y-12 lg:space-y-14">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">Sentiment</span>
          {read ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-signal-green/25 bg-signal-green/[0.08] text-signal-green text-[10px] font-medium tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-green live-dot" /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-signal-amber/25 bg-signal-amber/[0.07] text-signal-amber text-[10px] font-medium tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-amber" /> Connecting live data
            </span>
          )}
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

                {/* 0–100 scale with marker */}
                <div className="mt-6">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-accent via-signal-amber to-signal-red opacity-70" />
                  <div className="relative h-0">
                    <div
                      className="absolute w-3 h-3 -mt-[22px] rounded-full bg-ink-50 ring-2 ring-ink-950"
                      style={{ left: `calc(${read.value}% - 6px)`, boxShadow: "0 0 12px rgba(94,234,212,0.5)" }}
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

          {/* History */}
          <section>
            <div className="mb-5">
              <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">
                Sentiment over the current cycle
              </h2>
              <p className="text-[12.5px] text-ink-400 mt-1.5 max-w-xl">
                The dashed lines mark the fear / neutral / greed boundaries.
              </p>
            </div>
            <div className="card p-4 sm:p-7 relative">
              <SentimentChart points={SENTIMENT!.points} height={300} />
              <div className="watermark">halving.lens · fear &amp; greed</div>
            </div>
          </section>

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
