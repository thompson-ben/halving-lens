import { DataBadge } from "@/components/DataBadge";
import { LastUpdated, dailyCloseSource } from "@/components/LastUpdated";
import { ReferenceAltimeter } from "@/components/ReferenceAltimeter";
import { JourneyNext } from "@/components/JourneyNext";
import { BriefSignup } from "@/components/BriefSignup";
import { TrackedLink } from "@/components/TrackedLink";
import { ConfigurationRibbon } from "@/components/frp/ConfigurationRibbon";
import { GapChart, type GapPoint } from "@/components/frp/GapChart";
import { WhatHappenedAfter } from "@/components/frp/WhatHappenedAfter";
import {
  frameworkToday,
  lastSimilarWeek,
  matchingWeekPaths,
  tierStats,
  weeklyConfigurationTable,
} from "@/lib/fourReferencePrices";
import { priceContext } from "@/lib/priceContext";
import { referencePrices } from "@/lib/productionCost";
import { fmtPct, fmtUsd } from "@/lib/format";

// Bitcoin's Four Reference Prices — the framework page (Phase B). The
// configuration is the product: the hero leads with Today's Configuration,
// the four prices are the evidence beneath it, education explains why these
// four, and the journey hands off to the wider read. Historical section
// (ribbon, gap chart, what-happened-after) arrives in Phase C.

const DESC =
  "Where Bitcoin trades against the market's four most important reference points — the market, the trend, the holders and the miners. Historical context, not prediction.";

export const metadata = {
  title: "Bitcoin's Four Reference Prices",
  description: DESC,
  alternates: { canonical: "/four-reference-prices" },
  openGraph: { title: "Bitcoin's Four Reference Prices", description: DESC, url: "/four-reference-prices", type: "website" },
};

export default function FourReferencePricesPage() {
  const today = frameworkToday();
  const ctx = priceContext();
  const r = referencePrices({ ma200: ctx.ma200 });
  const price = today.price;
  const miningAvailable = r.productionAvailable && r.productionCost != null;

  const levels = [
    ctx.ma200 != null && { key: "trend" as const, label: "200-day average", value: ctx.ma200 },
    r.realisedPrice != null && { key: "holders" as const, label: "Realised Price", value: r.realisedPrice },
    miningAvailable && { key: "miners" as const, label: "Est. Mining Cost", value: r.productionCost!, estimated: true },
  ].filter((l): l is Exclude<typeof l, false> => Boolean(l));

  return (
    <div className="space-y-12">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">Four Reference Prices</span>
          <DataBadge status="live-derived" source={dailyCloseSource()} />
        </div>
        <h1 className="font-display text-[34px] sm:text-[42px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Bitcoin&rsquo;s Four Reference Prices
        </h1>
        <p className="mt-3 text-[15px] sm:text-[17px] text-ink-200 leading-relaxed max-w-2xl">
          One picture of where Bitcoin trades against the market&rsquo;s four most important reference
          points — what traders pay, where the trend sits, what holders paid, and what new supply
          costs to produce.
        </p>
        <div className="mt-3">
          <LastUpdated prefix="As of" />
        </div>
      </header>

      {/* ── Today's Configuration — the primary takeaway ── */}
      <section>
        <h2 className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-3">Today&rsquo;s Configuration</h2>
        {today.configuration && (
          <p className="font-display text-[24px] sm:text-[30px] font-medium tracking-tight-2 text-ink-50 leading-tight max-w-3xl">
            {today.configuration}
          </p>
        )}
        {today.paragraph && (
          <p className="mt-3 text-[13.5px] text-ink-200 leading-relaxed max-w-2xl">{today.paragraph}</p>
        )}
        {price != null && levels.length > 0 && (
          <div className="card p-5 sm:p-7 mt-6 relative">
            <ReferenceAltimeter price={price} levels={levels} />
            <div className="watermark">halvinglens.com · four reference prices</div>
          </div>
        )}
        <p className="mt-3 text-[11.5px] text-ink-500 leading-relaxed max-w-2xl">
          Generated from today&rsquo;s data — the same sentence for every reader, every figure traceable
          to the live sync. Estimated Mining Cost is a modelled estimate and is omitted entirely when
          its data is unavailable or stale.
        </p>
      </section>

      {/* ── The four prices ── */}
      <section>
        <h2 className="font-display text-[20px] sm:text-[24px] font-medium tracking-tight-2 text-ink-100 mb-1">
          The four prices
        </h2>
        <p className="text-[12px] text-ink-400 mb-5 max-w-2xl">
          Each answers a different question, from a different constituency. Together they place the
          market price in context no single metric can.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PriceCard
            eyebrow="The market"
            name="Market Price"
            question="What are traders paying today?"
            value={price}
            note="The price itself — the anchor every reference below is measured against."
          />
          <PriceCard
            eyebrow="The trend"
            name="200-Day Moving Average"
            question="Where does the long-term average sit?"
            value={ctx.ma200}
            gapPct={ctx.vsMa200Pct}
            note={
              ctx.vsMa200Pct == null
                ? undefined
                : `Price is ${Math.abs(ctx.vsMa200Pct).toFixed(0)}% ${ctx.vsMa200Pct >= 0 ? "above" : "below"} its long-term trend.`
            }
            href="/price"
          />
          <PriceCard
            eyebrow="The holders"
            name="Realised Price"
            question="What did the average coin cost its owner?"
            value={r.realisedPrice}
            gapPct={r.vsRealisedPct}
            note={
              r.vsRealisedPct == null
                ? undefined
                : `The network's aggregate cost basis — the average holder is ${r.vsRealisedPct >= 0 ? "in profit" : "under water"}.`
            }
            href="/metrics/realized-price"
          />
          <PriceCard
            eyebrow="The miners"
            name="Estimated Mining Cost"
            question="What does a new coin cost to produce?"
            value={miningAvailable ? r.productionCost : null}
            gapPct={miningAvailable ? r.vsProductionPct : null}
            estimated
            note={
              miningAvailable
                ? "A modelled electricity estimate — not an exact break-even or a guaranteed support level."
                : "Temporarily unavailable — the estimate is withheld rather than shown stale."
            }
            href="/metrics/estimated-mining-cost"
          />
        </div>
      </section>

      {/* ── Historical context (Phase C) ── */}
      <HistoricalSection />

      {/* ── Education — why these four ── */}
      <section>
        <h2 className="font-display text-[20px] sm:text-[24px] font-medium tracking-tight-2 text-ink-100 mb-1">
          Why these four prices?
        </h2>
        <p className="text-[12px] text-ink-400 mb-5 max-w-2xl">
          Three of the four are observed; one is clearly labelled as an estimate. None of them is a
          prediction.
        </p>
        <div className="space-y-5 max-w-2xl">
          <Edu title="They answer different questions.">
            The trend says where price has been heading; Realised Price says what the average holder
            actually paid; the mining estimate says roughly what new supply costs to produce. When
            one is stretched, the others show whether the stretch is broad or narrow.
          </Edu>
          <Edu title="When they agree, context is strong.">
            Bitcoin trading above all three references has historically accompanied established
            uptrends; below all three has been rare and historically clustered near cycle lows.
            Neither state predicts what comes next — the record simply shows where such weeks sat in
            past cycles.
          </Edu>
          <Edu title="When they disagree, read the gaps.">
            In late 2015 and late 2018, price sat below the modelled mining cost while holders were
            under water — periods the record now marks as late-bear. In late 2021, price stood far
            above every reference at once. Disagreement is information about how stretched the
            market is, in either direction.
          </Edu>
          <Edu title="What this is not.">
            No reference price is a floor, a ceiling, or a target. Price has spent extended periods
            below every one of them. The Estimated Mining Cost is a modelled electricity estimate
            with documented assumptions — see the{" "}
            <TrackedLink href="/metrics/estimated-mining-cost" event="mining_cost_related_metric_clicked" className="text-accent">
              methodology
            </TrackedLink>
            . Historical context, not prediction, not financial advice.
          </Edu>
        </div>
      </section>

      <div id="subscribe" className="scroll-mt-24">
        <BriefSignup
          heading="Get the Four Reference Prices in the daily brief"
          blurb="One clear daily read on where Bitcoin sits against the trend, the holders and the miners — free, no hype, no predictions."
        />
      </div>

      <JourneyNext from="/four-reference-prices" />
    </div>
  );
}

// The historical section (Phase C): how unusual today is, whether the gaps
// are widening or narrowing, and what actually followed similar weeks.
// Everything derives from the tested engine; every claim carries its window.
function HistoricalSection() {
  const stats = tierStats("full");
  if (!stats) return null;
  const sim = lastSimilarWeek();
  const paths = matchingWeekPaths(26);
  const sinceLabel = stats.windowFirst.slice(0, 7).replace("-", "·");

  const gapData: GapPoint[] = weeklyConfigurationTable()
    .filter((r) => r.date >= "2016-01-01")
    .map((r) => ({
      ts: r.ts,
      trend: Number((((r.price / r.ma200) - 1) * 100).toFixed(1)),
      holders: r.realised != null ? Number((((r.price / r.realised) - 1) * 100).toFixed(1)) : undefined,
      miners: r.mining != null ? Number((((r.price / r.mining) - 1) * 100).toFixed(1)) : undefined,
    }));

  return (
    <section>
      <h2 className="font-display text-[20px] sm:text-[24px] font-medium tracking-tight-2 text-ink-100 mb-1">
        How unusual is today?
      </h2>
      <p className="text-[12px] text-ink-400 mb-5 max-w-2xl">
        Every week since {stats.windowFirst} — the earliest date all four reference prices are
        observed together — classified by its configuration. Historical record, not a forecast.
      </p>

      <div className="card p-5 sm:p-6">
        <ConfigurationRibbon />
        <div className="mt-5 pt-4 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-4">
          <HistStat label="Weeks on record" value={`${stats.weeks}`} sub={`since ${stats.windowFirst}`} />
          <HistStat label="In today's configuration" value={stats.matchingTodayPct != null ? `${stats.matchingTodayPct}%` : "—"} sub="of all weeks" />
          <HistStat label="Current spell" value={stats.currentSpellWeeks != null ? `${stats.currentSpellWeeks} wk${stats.currentSpellWeeks === 1 ? "" : "s"}` : "—"} sub="unbroken" />
          <HistStat label="Above all three" value={`${stats.aboveAllPct}%`} sub="of all weeks" />
        </div>
        {sim && (
          <p className="mt-4 pt-4 border-t border-white/[0.06] text-[12.5px] text-ink-300 leading-relaxed">
            The last time Bitcoin held this configuration before the current spell was the week of{" "}
            <span className="text-ink-100">{sim.date}</span>. See{" "}
            <TrackedLink href="/similar-moments" event="journey_next_click" props={{ from: "/four-reference-prices", to: "/similar-moments", position: "secondary" }} className="text-accent">
              Similar Moments
            </TrackedLink>{" "}
            for the full analogue read.
          </p>
        )}
      </div>

      <div className="card p-4 sm:p-6 mt-4 relative">
        <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent mb-3">
          The gaps over time · since 2016
        </div>
        <GapChart data={gapData} />
        <div className="watermark">halvinglens.com · four reference prices</div>
      </div>

      {paths.length >= 3 && (
        <div className="card p-4 sm:p-6 mt-4 relative">
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent mb-1">
            What actually happened next
          </div>
          <p className="text-[12px] text-ink-400 mb-3 max-w-2xl">
            The real price paths that followed each of the {paths.length} prior weeks sharing
            today&rsquo;s configuration (since {sinceLabel.replace("·", "-")}), indexed to 100 at the
            matching week. The most recent match is highlighted. Historical paths — never an
            average, never a forecast.
          </p>
          <WhatHappenedAfter paths={paths} />
          <div className="watermark">halvinglens.com · four reference prices</div>
        </div>
      )}
    </section>
  );
}

function HistStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink-500">{label}</div>
      <div className="mt-1 font-display text-[22px] text-ink-50 tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-[10.5px] text-ink-500 leading-tight">{sub}</div>}
    </div>
  );
}

function PriceCard({
  eyebrow,
  name,
  question,
  value,
  gapPct,
  note,
  estimated,
  href,
}: {
  eyebrow: string;
  name: string;
  question: string;
  value: number | null;
  gapPct?: number | null;
  note?: string;
  estimated?: boolean;
  href?: string;
}) {
  const body = (
    <>
      <div className="text-[10px] uppercase tracking-[0.18em] text-accent">{eyebrow}</div>
      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        <span className="text-[14.5px] font-medium text-ink-50">{name}</span>
        {estimated && (
          <span className="text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border border-signal-violet/25 text-signal-violet bg-signal-violet/[0.08]">
            Estimated
          </span>
        )}
      </div>
      <div className="mt-0.5 text-[11.5px] text-ink-500">{question}</div>
      <div className="mt-3 flex items-baseline gap-2.5 flex-wrap">
        <span className="font-display text-[26px] tabular-nums text-ink-50 leading-none">
          {value != null ? fmtUsd(value, { compact: true }) : "—"}
        </span>
        {gapPct != null && (
          <span className={`font-mono text-[12.5px] tabular-nums ${gapPct >= 0 ? "text-signal-green" : "text-signal-red"}`}>
            {fmtPct(gapPct, 1)} vs market
          </span>
        )}
      </div>
      {note && <p className="mt-2.5 text-[12px] text-ink-400 leading-snug">{note}</p>}
    </>
  );
  if (!href) return <div className="card p-5">{body}</div>;
  return (
    <TrackedLink href={href} event="reference_price_row_clicked" props={{ label: name, page: "four-reference-prices" }} className="card card-interactive p-5 block">
      {body}
    </TrackedLink>
  );
}

function Edu({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[14px] font-medium text-ink-100 mb-1.5">{title}</h3>
      <p className="text-[13px] text-ink-300 leading-relaxed">{children}</p>
    </div>
  );
}
