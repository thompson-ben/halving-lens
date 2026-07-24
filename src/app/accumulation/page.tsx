import Link from "next/link";
import { ArrowUpRight, Info, ShieldAlert } from "lucide-react";
import { AccumulationGauge } from "@/components/AccumulationGauge";
import { AccumulationTimelineChart } from "@/components/AccumulationTimelineChart";
import { DcaSimulatorPanel } from "@/components/DcaSimulatorPanel";
import { DataBadge } from "@/components/DataBadge";
import { WhatsChanged } from "@/components/WhatsChanged";
import { metricChange } from "@/lib/metricChange";
import { LastUpdated } from "@/components/LastUpdated";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { BriefSignup } from "@/components/BriefSignup";
import { AccumulationShare } from "@/components/AccumulationShare";
import { FlagshipShare } from "@/components/FlagshipShare";
import { FlagshipJourney } from "@/components/FlagshipJourney";
import { PresenterMode } from "@/components/PresenterMode";
import { RecordModeButton } from "@/components/RecordModeButton";
import { PresenterTalkingPoints, type TalkingPoint } from "@/components/PresenterTalkingPoints";
import { accumulationRead, accumulationSeries, ACCUMULATION_BANDS, type AccumulationBandKey } from "@/lib/accumulation";
import { runAccumulationBacktest } from "@/lib/accumulationBacktest";
import { accumulationContentPack } from "@/lib/contentCards";
import { SITE_HOST } from "@/lib/site";
import { fmtUsd } from "@/lib/format";

export const metadata = {
  title: "Bitcoin Accumulation Index",
  description:
    "A price-only, historically-backtested gauge of how attractive Bitcoin's accumulation environment looks versus its own history. Educational context — not a prediction, not financial advice.",
  alternates: { canonical: "/accumulation" },
};

const DISCLAIMER =
  "The Accumulation Index is educational historical context only. It is not financial advice, not a prediction, and not a buy or sell signal. Every reading describes how conditions compare with Bitcoin's own history — past behaviour is never a guarantee of future results.";

export default function AccumulationPage({ searchParams }: { searchParams: { presenter?: string } }) {
  const presenter = searchParams?.presenter === "true";
  const read = accumulationRead();
  const timeline = accumulationSeries().map((p) => ({
    ts: p.ts,
    price: p.price,
    score: p.score,
    bandKey: p.bandKey,
  }));
  const bt = runAccumulationBacktest();
  const cheaperThan = 100 - read.historicalPercentile;

  // Deterministic presenter running order, straight from the live reading.
  const btBand = bt.bands.find((b) => b.key === read.band.key);
  const med = (y: number) => btBand?.horizons.find((h) => h.years === y)?.median ?? null;
  const h1 = med(1);
  const h4 = med(4);
  const sign = (n: number) => `${n >= 0 ? "+" : ""}${n}%`;
  const talkingPoints: TalkingPoint[] = presenter
    ? [
        { label: "Reading", text: `${read.score} out of 100 — ${read.band.label.toLowerCase()}.` },
        {
          label: "How rare",
          text: `Only ${read.historicalPercentile}% of Bitcoin's history has been cheaper by this price-only methodology — today is more attractive than ${cheaperThan}% of all weeks since 2012.`,
        },
        { label: "Why", text: read.reasoning },
        ...(h1 != null || h4 != null
          ? [
              {
                label: "What followed historically",
                text: `From comparable readings, Bitcoin's median change was ${h1 != null ? `${sign(h1)} a year later` : "—"}${h4 != null ? `, ${sign(h4)} after four years` : ""}. Evidence from prior cycles, not a forecast.`,
              },
            ]
          : []),
        { label: "Guardrail", text: "Educational historical context — not financial advice, not a prediction, not a buy or sell signal." },
      ]
    : [];

  // Share copy — short, paste-anywhere summary + per-channel versions.
  const pack = accumulationContentPack();
  const shareSummary = [
    "Bitcoin Accumulation Index",
    `${read.score} / 100 — ${read.band.label}`,
    "",
    "Historically, conditions similar to today have produced stronger long-term outcomes than average.",
    "",
    "Historical context only. Not financial advice.",
    `https://${SITE_HOST}/accumulation`,
  ].join("\n");

  return (
    <div className={presenter ? "presenter-stage space-y-10 max-w-5xl mx-auto" : "space-y-12"}>
      {presenter && <PresenterMode page="Accumulation Index" />}
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">
            {presenter ? "Accumulation Index — Presenter Mode" : "Accumulation intelligence"}
          </span>
          <DataBadge status="live-derived" source="derived from price history" />
          {!presenter && <RecordModeButton page="/accumulation" />}
        </div>
        <h1 className={`font-display font-medium tracking-tightest text-ink-50 leading-[1.05] ${presenter ? "text-[44px] sm:text-[60px]" : "text-[34px] sm:text-[44px]"}`}>
          Bitcoin Accumulation Index
        </h1>
        <p className={`mt-3 font-display text-ink-100 leading-snug max-w-2xl ${presenter ? "text-[23px]" : "text-[17px] sm:text-[19px]"}`}>
          See how attractive today&rsquo;s market has been, historically.
        </p>
        <p className={`mt-2.5 text-ink-400 leading-relaxed max-w-2xl ${presenter ? "text-[16px]" : "text-[14px]"}`}>
          Historically, how attractive was it to accumulate Bitcoin when conditions looked like
          today? This index scores the environment from{" "}
          <span className="text-ink-100">deep value to overheated</span> using only real,
          price-based history — then shows what accumulating in similar conditions actually did
          next. It is historical context, <span className="text-ink-100">not a prediction or advice</span>.
        </p>
        <div className="mt-3">
          <LastUpdated prefix="As of" />
        </div>
      </header>

      <WhatsChanged metric={metricChange("accumulation")} />

      {presenter && <PresenterTalkingPoints title="Accumulation Index" points={talkingPoints} />}

      {/* Hero — today's reading */}
      <section className="card-glow p-6 sm:p-8">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-10">
          <AccumulationGauge
            score={read.score}
            bandLabel={read.band.label}
            bandColor={read.band.color}
            percentile={read.historicalPercentile}
          />
          <div className="space-y-4">
            <p className="text-[14px] text-ink-200 leading-relaxed">{read.reasoning}</p>
            <div className="flex flex-wrap gap-2">
              {read.factors.map((f) => (
                <span
                  key={f.factor}
                  className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 text-[11.5px] text-ink-300"
                >
                  <span className="text-ink-500">{f.factor}:</span>
                  <span className="text-ink-100">{f.reading}</span>
                </span>
              ))}
            </div>
            <p className="text-[11.5px] text-ink-500 leading-relaxed">
              Historical context — not financial advice, not a prediction, and not a buy or sell signal.
            </p>
          </div>
        </div>
      </section>

      {/* How rare is today? — the headline explanatory statistic */}
      <section className="card-glow p-6 sm:p-8 text-center">
        <div className="text-[11px] uppercase tracking-[0.2em] text-accent mb-3">How rare is today?</div>
        <div className="font-display text-[44px] sm:text-[60px] font-medium tracking-tightest leading-none" style={{ color: read.band.color }}>
          {read.historicalPercentile}<span className="text-[26px] sm:text-[32px] text-ink-500">th percentile</span>
        </div>
        <p className="mt-4 text-[15px] sm:text-[16px] text-ink-200 leading-relaxed max-w-2xl mx-auto">
          Only <span className="text-ink-50 font-medium">{read.historicalPercentile}% of Bitcoin&apos;s history</span> has been
          cheaper than today by this price-only methodology. Put another way, today&apos;s conditions are
          more attractive than <span className="text-ink-50 font-medium">{cheaperThan}%</span> of all weeks since 2012.
        </p>
        <p className="mt-3 text-[11.5px] text-ink-500">Historical context — not a prediction or advice.</p>
      </section>

      {/* Flagship timeline */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-accent mb-1.5">The index through history</h2>
        <p className="text-[12.5px] text-ink-400 mb-4 max-w-2xl">
          Every week since 2012, coloured by its accumulation environment, behind Bitcoin&apos;s price.
          Deep-value conditions have clustered near cycle lows; overheated conditions near the tops.
        </p>
        <div className="card p-4 sm:p-7 relative">
          <AccumulationTimelineChart data={timeline} height={460} />
          <div className="watermark">halvinglens.com · accumulation index</div>
        </div>
      </section>

      {/* Historical outcomes */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-accent mb-1.5">
          What happened when conditions looked like this
        </h2>
        <p className="text-[12.5px] text-ink-400 mb-4 max-w-2xl">
          For every week in history, bucketed by its score band, the{" "}
          <span className="text-ink-100">median</span> change in Bitcoin&apos;s price 1, 2 and 4 years
          later. Evidence from prior cycles — not a forecast.
        </p>
        <div className="card p-4 sm:p-6 overflow-x-auto">
          <table className="w-full text-[12.5px] min-w-[520px]">
            <thead>
              <tr className="text-ink-500 text-[11px] uppercase tracking-[0.12em]">
                <th className="text-left font-normal pb-3">Environment</th>
                <th className="text-right font-normal pb-3">1 year later</th>
                <th className="text-right font-normal pb-3">2 years later</th>
                <th className="text-right font-normal pb-3">4 years later</th>
              </tr>
            </thead>
            <tbody>
              {bt.bands.map((b) => (
                <tr key={b.key} className="border-t border-white/[0.06]">
                  <td className="py-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: ACC_COLOR(b.key) }} />
                      <span className="text-ink-100">{b.label.replace("Historically ", "")}</span>
                    </span>
                  </td>
                  {b.horizons.map((h) => (
                    <td key={h.years} className="text-right py-3 font-mono">
                      {h.median == null ? (
                        <span className="text-ink-600">—</span>
                      ) : (
                        <>
                          <span className={h.median >= 0 ? "text-signal-green" : "text-signal-red"}>
                            {h.median >= 0 ? "+" : ""}
                            {h.median.toLocaleString()}%
                          </span>
                          <span className="text-ink-600 text-[10.5px] ml-1.5">n={h.n}</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-ink-500 mt-3">
            {bt.totalObservations.toLocaleString()} weekly observations, {bt.dateRange.from} → {bt.dateRange.to}.
            Median forward return; <span className="font-mono">n</span> = observations with a full forward window.
          </p>
        </div>

        {/* Honesty callout */}
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-amber-400 mt-0.5 shrink-0" strokeWidth={1.8} />
            <div className="text-[13px] text-ink-300 leading-relaxed space-y-2">
              <p className="text-ink-100 font-medium text-[13.5px]">How to read this honestly</p>
              <p>
                The 1- and 2-year columns are the most reliable: lower (more attractive) scores have
                historically been followed by higher returns. The{" "}
                <span className="text-ink-100">4-year column rests on only ~2–3 independent cycles</span>{" "}
                and is best read as indicative, not robust. Weekly observations overlap and are not
                independent, and the score is reconstructed point-in-time so no future data leaks into
                a past reading. None of this predicts the future.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic DCA */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-accent mb-1.5">Dynamic DCA — a historical comparison</h2>
        <p className="text-[12.5px] text-ink-400 mb-4 max-w-2xl">
          What if, instead of buying a flat amount each week, an accumulator had leaned into
          historically cheaper conditions and eased off in overheated ones — or gone a step further and{" "}
          <span className="text-ink-100">trimmed</span> the position in overheated stretches, banked the profit
          (after tax) and redeployed it on the next dip? Switch to{" "}
          <span className="text-ink-100">Accumulate &amp; Distribute</span> for a three-way race — DCA vs Dynamic DCA
          vs Dynamic DCA + Distribution — and see which rule did most for{" "}
          <span className="text-ink-100">long-term growth</span> on Bitcoin&apos;s full history.
        </p>
        <div className="card p-4 sm:p-7 relative">
          <DcaSimulatorPanel />
          <div className="watermark">halvinglens.com · dynamic DCA</div>
        </div>
        <Link
          href="/research/findings/hl-r001"
          className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft"
        >
          Read the full research note — HL-R001: Does Taking Profits Beat Dynamic DCA?
          <ArrowUpRight size={13} />
        </Link>
      </section>

      {/* Share this read */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-accent mb-1.5">Share this read</h2>
        <p className="text-[12.5px] text-ink-400 mb-4 max-w-2xl">
          Copy a ready-to-post summary, or grab the version for each channel. Every figure is the live
          reading — historical context, not advice.
        </p>
        <div className="space-y-4">
          <FlagshipShare page="/accumulation" label="Bitcoin Accumulation Index" blurb="How attractive today's Bitcoin market has been, versus its own history." />
          <div className="card p-4 sm:p-6">
            <AccumulationShare
              summary={shareSummary}
              x={pack.xThread.join("\n\n")}
              linkedin={pack.linkedin}
              instagram={pack.instagram}
              email={`Subject: ${pack.emailSubject}\n\n${pack.emailBody}`}
            />
          </div>
        </div>
      </section>

      {/* Email conversion — accumulation framing */}
      <BriefSignup
        heading="Get tomorrow's Accumulation Index by email"
        blurb="Join the free Daily Bitcoin Cycle Brief — it includes the Accumulation Index, where today sits in history, and what to watch. No hype, no predictions."
      />

      {/* Methodology */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-accent mb-4">How the score is built</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MethodCard title="Mayer Multiple (price / 200-day average)" body="How stretched price is above or below its 200-day moving average — a classic, price-only heat gauge. Real and available across every cycle." />
          <MethodCard title="200-week MA multiple" body="Price relative to its 200-week moving average. Cycle lows have historically clustered near 1×; tops 3–5×. Available once ~2 years of history exists." />
          <MethodCard title="Drawdown from the running high" body="How far below its running all-time high price sits. Deep drawdowns push the score toward deep value; sitting at the high pushes it toward overheated." />
          <MethodCard
            title="What we deliberately exclude"
            body="MVRV, NUPL, ETF flows and Fear & Greed are NOT in the score: they're modelled for past cycles or didn't exist before 2018/2024, so backtesting against them would be misleading. They appear elsewhere on the site as present-day context only."
          />
        </div>
        <p className="mt-4 text-[11px] text-ink-500 leading-relaxed max-w-2xl">
          The score (0 = deep value, 100 = overheated) is a weighted blend of the three price-only
          factors above, computed point-in-time — every historical reading uses only the data
          available on that date, which is what makes the backtest legitimate. Methodology v1.
        </p>
      </section>

      {/* Cross-links */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/downside-scenarios" className="card card-interactive p-5 flex items-center justify-between gap-4 group hover:border-accent/30">
          <div>
            <div className="text-[13.5px] font-medium text-ink-100">Downside scenarios</div>
            <div className="text-[12px] text-ink-400 mt-0.5">Where history would imply support if price fell.</div>
          </div>
          <ArrowUpRight size={16} className="text-accent shrink-0" />
        </Link>
        <Link href="/similar-moments" className="card card-interactive p-5 flex items-center justify-between gap-4 group hover:border-accent/30">
          <div>
            <div className="text-[13.5px] font-medium text-ink-100">Similar moments</div>
            <div className="text-[12px] text-ink-400 mt-0.5">The historical moments today most resembles.</div>
          </div>
          <ArrowUpRight size={16} className="text-accent shrink-0" />
        </Link>
      </section>

      {!presenter && <FlagshipJourney current="accumulation" />}

      <div className="rounded-xl border border-accent/15 bg-accent/[0.04] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert size={18} className="text-accent mt-0.5 shrink-0" strokeWidth={1.8} />
          <p className="text-[12px] text-ink-300 leading-relaxed">{DISCLAIMER}</p>
        </div>
      </div>

      <FeedbackWidget />
    </div>
  );
}

function MethodCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-5">
      <h3 className="text-[13.5px] font-medium text-ink-100 mb-2">{title}</h3>
      <p className="text-[12.5px] text-ink-300 leading-relaxed">{body}</p>
    </div>
  );
}

// Band colour lookup for the outcomes table.
function ACC_COLOR(key: AccumulationBandKey): string {
  return ACCUMULATION_BANDS.find((b) => b.key === key)?.color ?? "#888";
}
