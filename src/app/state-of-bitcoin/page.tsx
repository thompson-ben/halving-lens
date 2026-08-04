import { format } from "date-fns";
import Link from "next/link";
import { DataBadge } from "@/components/DataBadge";
import { BriefSignup } from "@/components/BriefSignup";
import { ShareTrigger } from "@/components/ShareTrigger";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { PresenterMode } from "@/components/PresenterMode";
import { RecordModeButton } from "@/components/RecordModeButton";
import { FlagshipJourney } from "@/components/FlagshipJourney";
import { FlagshipShare } from "@/components/FlagshipShare";
import { WhereAreWe } from "@/components/WhereAreWe";
import { HistoricalPathExplorer } from "@/components/HistoricalPathExplorer";
import { LeadChart } from "@/components/sob/LeadChart";
import { MarketSnapshot } from "@/components/sob/MarketSnapshot";
import { WeekInFiveExpanded } from "@/components/sob/WeekInFive";
import { WeekAtAGlance, ActBridge } from "@/components/sob/WeekAtAGlance";
import { ReferencePrices } from "@/components/sob/ReferencePrices";
import { CycleStatusSection } from "@/components/sob/CycleStatusSection";
import { WeeklyConclusion } from "@/components/sob/WeeklyConclusion";
import { PresenterHud } from "@/components/sob/PresenterHud";
import { JournalMasthead } from "@/components/journal/JournalMasthead";
import { ChapterNav } from "@/components/journal/ChapterNav";
import { currentChapter, previousChapter } from "@/lib/journal";
import { dailyVsWeeklyPrice } from "@/lib/dayContext";
import { metricChange } from "@/lib/metricChange";
import { snapshotContext, snapshotCyclePosition } from "@/lib/snapshot";
import { matchReasons } from "@/lib/stateOfBitcoin";
import { marketMovers } from "@/lib/marketMovers";
import { weeklyBriefing } from "@/lib/weeklyBriefing";
import type { MoverPeriod, MoversResult } from "@/lib/marketMovers/types";
import { pathExplorer } from "@/lib/pathExplorer";
import { selectChartOfWeek } from "@/lib/chartOfWeek";
import { presenterEpisode, presenterSections } from "@/lib/presenterEpisode";
import { ETF } from "@/lib/etf";
import { SOURCE } from "@/lib/btcData";
import { fmtUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

const DESC =
  "Where Bitcoin stands today — what changed over the last seven days, why it matters, and how current conditions compare with previous Bitcoin cycles.";

export const metadata = {
  title: { absolute: "The State of Bitcoin | HalvingLens" },
  description: DESC,
  alternates: { canonical: "https://halvinglens.com/state-of-bitcoin" },
  openGraph: {
    title: "The State of Bitcoin | HalvingLens",
    description: DESC,
    url: "https://halvinglens.com/state-of-bitcoin",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "The State of Bitcoin | HalvingLens", description: DESC },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "The State of Bitcoin",
  description: DESC,
  url: "https://halvinglens.com/state-of-bitcoin",
  isPartOf: { "@type": "WebSite", name: "HalvingLens", url: "https://halvinglens.com" },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "HalvingLens", item: "https://halvinglens.com" },
      { "@type": "ListItem", position: 2, name: "The State of Bitcoin", item: "https://halvinglens.com/state-of-bitcoin" },
    ],
  },
};

const DATA_STATUS: Record<string, "live" | "live-derived" | "coming-soon"> = { live: "live", mixed: "live-derived", synthetic: "coming-soon" };
const TONE: Record<"good" | "bad" | "neutral", string> = { good: "text-signal-green", bad: "text-signal-red", neutral: "text-ink-300" };

function fmtSignedPct(n: number): string {
  const digits = Math.abs(n) >= 10 ? 0 : 1;
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(digits)}%`;
}

export default function SnapshotPage({ searchParams }: { searchParams: { presenter?: string } }) {
  const presenter = searchParams?.presenter === "true";

  const brief = weeklyBriefing();
  const five = brief.points;

  const price = metricChange("price");
  const p7 = price.changes.find((c) => c.period === 7 && c.available);
  const p1 = price.changes.find((c) => c.period === 1 && c.available);
  const dailyNote = dailyVsWeeklyPrice();
  const pos = snapshotCyclePosition();
  const health = metricChange("market_health");
  const ctx = snapshotContext();
  const cotw = selectChartOfWeek();
  const watch = brief.watchItems;
  const reasons = matchReasons();
  const explorer = pathExplorer();

  // Every registered reading, ranked by how unusual its move is within its
  // OWN history — one section replacing the three that previously answered
  // "what changed?" from the same handful of metrics.
  const movers = { 1: marketMovers(1), 7: marketMovers(7), 30: marketMovers(30) } as Record<MoverPeriod, MoversResult>;

  // The week's agenda — one set of canonical talking points, shown short in
  // the standfirst rail and long in "What matters most".

  const today = SOURCE.fetchedAt ? new Date(SOURCE.fetchedAt) : new Date();

  const asOf = SOURCE.fetchedAt ? format(new Date(SOURCE.fetchedAt), "d MMM yyyy, HH:mm 'UTC'") : "—";

  return (
    <div className={presenter ? "presenter-stage space-y-10 max-w-5xl mx-auto" : "space-y-12 lg:space-y-14"}>
      {presenter && <PresenterMode page="The State of Bitcoin" />}
      {presenter && <PresenterHud episodeScript={presenterEpisode()} sections={presenterSections()} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Publication identity — this is the current Chapter of The Journal.
          Additive chrome only; hidden in presenter mode to keep the recording clean. */}
      {!presenter && <JournalMasthead chapter={currentChapter()} />}

      {/* ── Section 1 — State of Bitcoin Today ── */}
      <section data-sob-section="today">
        <header className="pt-2">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="eyebrow text-accent">
              {presenter ? "Documenting the Cycle — Presenter Mode" : "The definitive weekly read"}
            </span>
            <DataBadge status={DATA_STATUS[SOURCE.mode] ?? "live-derived"} source={`As of ${asOf}`} />
            {!presenter && <ShareTrigger />}
            {!presenter && <RecordModeButton page="/state-of-bitcoin" />}
          </div>
          <h1 className="font-display font-medium tracking-tightest text-ink-50 text-display">
            The State of Bitcoin
          </h1>
          <p className="mt-3 font-display text-headline text-ink-100 leading-snug max-w-measure">
            {brief.verdict}
          </p>
        </header>

        {/* On a phone the four-stat strip stacks two-high and pushes the five
            answers past the first screen, so the front page comes first there
            and the orientation stats follow. On sm and up both fit above the
            fold in the original order. */}
        <div className="flex flex-col">
        {/* Compact orientation strip — the current position at a glance */}
        <div className="order-2 sm:order-1 mt-6 pt-5 border-t border-white/[0.09] grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5">
          <TodayStat
            label="Bitcoin price"
            value={fmtUsd(price.current)}
            sub={
              p7 ? (
                <span className="flex flex-col gap-0.5">
                  <span className={TONE[p7.good]}>{p7.pctLabel ?? p7.absLabel} · Last 7 days</span>
                  {p1 && (
                    <span className="text-ink-600">
                      {p1.dir === "flat" ? "No change" : p1.pctLabel ?? p1.absLabel} · Last 24h
                    </span>
                  )}
                </span>
              ) : undefined
            }
          />
          <TodayStat label="Cycle day" value={`Day ${pos.cycleDay}`} sub={`${pos.progressPct}% through`} />
          <TodayStat label="Since halving" value={fmtSignedPct(pos.gainFromHalving)} sub={`${Math.round(pos.drawdownFromAth)}% from high`} />
          <TodayStat label="Cycle phase" value={pos.phaseLabel} sub={health.band?.label ?? undefined} />
        </div>

        {/* One deterministic line relating today's move to the week's — only when
            it materially aids understanding (7-day stays the primary lens). */}
        {dailyNote && <p className="order-3 mt-3 text-caption text-ink-400 leading-relaxed max-w-measure">{dailyNote}</p>}

        {/* The front page: five questions, five answers, five deep links —
            the executive summary AND the presenter's running order. */}
        <div className="order-1 sm:order-3">
          <WeekAtAGlance rows={brief.glance} />
        </div>
        </div>
      </section>

      {/* ── What changed — the Market Snapshot ── */}
      <section data-sob-section="movers" id="movers" className="pt-2 lg:pt-10">
        <SectionHead
          n="1"
          title="What changed"
          note="Every HalvingLens reading, ranked by how unusual its move is within its own history — not by raw percentage."
        />
        <MarketSnapshot initial={movers} />
        <ActBridge text={brief.bridges[1]} />
      </section>

      {/* ── ACT 2 — Why this matters ── */}
      <section data-sob-section="why" id="why" className="pt-2 lg:pt-10">
        <SectionHead n="2" title="Why this matters" note="Where the week leaves the market against its Four Reference Prices, and the chart that best captures it. Concurrence, not causation — and whether any of it is unusual is the next act's question." />
        <ReferencePrices />
        <div className="mt-8">
          <LeadChart pick={cotw} />
        </div>
        <ActBridge text={brief.bridges[2]} />
      </section>

      {/* ── ACT 3 — How unusual is it? Two beats: where we are, then how
          prior cycles behaved from here. One idea per beat; the context
          figures ride as captions rather than a widget of their own. */}
      <section data-sob-section="unusual" id="unusual" className="pt-2 lg:pt-10">
        <SectionHead n="3" title="How unusual is it?" note="This week measured against the record — where the cycle stands, and how prior cycles behaved from here." />

        {/* Beat one — where we are, and whether that reading moved. */}
        <div className="mb-8">
          <WhereAreWe />
        </div>
        <CycleStatusSection />

        {/* Beat two — the record. */}
        <div className="mt-12">
          <h3 className="eyebrow text-editorial mb-3">How prior cycles behaved from here</h3>
          <p className="mb-4 text-body text-ink-300 leading-relaxed max-w-measure">
            Each prior-cycle line shows what actually happened after the same stage of an earlier Bitcoin cycle. Dashed
            sections are the paths after a cycle&rsquo;s peak.
          </p>
          {explorer.available && (
            <div className="card p-4 sm:p-7 relative">
              <HistoricalPathExplorer data={explorer} />
              <div className="watermark">halvinglens.com · historical path explorer</div>
            </div>
          )}
          <div className="mt-5 border-t border-white/[0.06] pt-5 space-y-2">
            <p className="text-body text-ink-200 leading-relaxed max-w-measure">{ctx.summary}</p>
            <p className="text-caption text-ink-500 leading-relaxed max-w-measure tabular-nums">
              {ctx.match && (
                <>
                  Closest match: {ctx.match}
                  {ctx.similarity != null && <> ({ctx.similarity}% similar{reasons.length > 0 && <> — {reasons.map((r) => `${r.label.toLowerCase()} ${r.closeness}%`).join(", ")}</>})</>}
                  {" · "}
                </>
              )}
              Accumulation {ctx.accPercentile}/100
              {ctx.drawdownPercentile != null && <> · Drawdown {ctx.drawdownPercentile}th percentile of tracked days</>}
              {ctx.healthPercentile != null ? <> · Market Health {ctx.healthPercentile}th percentile</> : health.band?.label ? <> · Market Health {health.band.label}</> : null}
            </p>
            {ETF.connected && (
              <p className="text-micro text-ink-600 leading-relaxed max-w-measure">
                Note: spot ETF demand is new to this cycle, so there is no like-for-like precedent in earlier halving cycles.
              </p>
            )}
          </div>
        </div>
        <ActBridge text={brief.bridges[3]} />
      </section>



      {/* ── What to remember — the five points, expanded ── */}
      <section data-sob-section="matters" id="matters" className="pt-2 lg:pt-10">
        <SectionHead n="4" title="What to remember" note="If you take only five things from this week, take these — expanded from the front page at the top." />
        <WeekInFiveExpanded data={five} />
        <ActBridge text={brief.bridges[4]} />
      </section>

      {/* ── What we're watching next ── */}
      <section data-sob-section="watching" id="watching" className="pt-2 lg:pt-10">
        <SectionHead n="5" title="What we're watching next" note="The objective thresholds we'll return to next week — observations, not predictions." />
        {brief.previousWatch && (
          <div className="card p-5 mb-4">
            <div className="eyebrow text-ink-500 mb-1.5">Last week we were watching</div>
            <p className="text-body text-ink-200 leading-relaxed max-w-measure">
              {brief.previousWatch.signal} — it {brief.previousWatch.outcome === "held" ? "held" : brief.previousWatch.outcome === "eased" ? "eased" : brief.previousWatch.outcome === "escalated" ? "became more notable" : "moved"}.{" "}
              <span className="text-ink-400">
                Then: {brief.previousWatch.then}. Now: {brief.previousWatch.now}.
              </span>
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {watch.map((w, i) => (
            <div key={i} className={`card p-5 ${w.top ? "ring-1 ring-accent/30" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-body font-medium text-ink-50 leading-snug">{w.title}</div>
                {w.top && <span className="shrink-0 eyebrow px-2 py-0.5 rounded-full border border-editorial/40 bg-editorial/[0.08] text-editorial">Priority</span>}
              </div>
              <div className="mt-2 text-caption text-ink-100 tabular-nums">{w.current}</div>
              <p className="mt-2 text-caption text-ink-400 leading-relaxed">{w.why}</p>
              <div className="mt-3 pt-3 border-t border-white/[0.06] text-caption text-ink-500">
                <span className="text-ink-400">Meaningful change: </span>
                {w.trigger}
              </div>
            </div>
          ))}
        </div>
        {presenter && (
          <p className="mt-4 text-caption text-ink-500 italic">
            &ldquo;These are not forecasts — they are the objective thresholds that would tell us whether the current interpretation is changing.&rdquo;
          </p>
        )}

        {/* The close — the SAME canonical verdict introduced in the
            standfirst, never a second interpretation. */}
        <div className="mt-8">
          <WeeklyConclusion
            presenter={presenter}
            verdict={brief.verdict}
            nextWatchTitle={(brief.watchItems.find((w) => w.top) ?? brief.watchItems[0])?.title}
          />
        </div>
      </section>

      {/* Email conversion — the flagship read's inline capture (PR138). Placed
          after the verdict, at the point of highest reader conviction; hidden
          in presenter mode to keep recordings clean. */}
      {!presenter && (
        <div id="subscribe" className="scroll-mt-24">
          <BriefSignup
            heading="Never miss the State of Bitcoin"
            blurb="Join the free Daily Bitcoin Cycle Brief — the same evidence-first read, every morning, plus the full weekly research each Sunday. No hype, no predictions."
          />
        </div>
      )}

      {!presenter && (
        <FlagshipShare page="/state-of-bitcoin" label="The State of Bitcoin" blurb="Where Bitcoin stands today, explained through the story of the last seven days." />
      )}

      {/* Chapter connection — read the previous edition, or browse the archive. */}
      {!presenter && <ChapterNav prev={previousChapter()} />}

      {!presenter && <FlagshipJourney current="state-of-bitcoin" />}

      <p className="text-caption text-ink-600 pt-2 max-w-measure">
        Every figure traces to the live HalvingLens data and updates automatically. Historical context. Not prediction. Not financial advice.
      </p>

      {presenter ? (
        <div className="pt-4">
          <Link href="/state-of-bitcoin" className="text-caption text-ink-500 hover:text-ink-300">← Exit presenter mode</Link>
        </div>
      ) : (
        <FeedbackWidget section="snapshot" contentType="page" />
      )}
    </div>
  );
}

// ── local components ─────────────────────────────────────────────────────────
function SectionHead({ n, title, note }: { n: string; title: string; note: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline gap-3">
        <span className="text-caption font-mono text-editorial/70">{n}</span>
        <h2 className="font-display text-headline text-ink-50 tracking-tight-2">{title}</h2>
      </div>
      <p className="mt-1 ml-8 text-caption text-ink-500 max-w-measure">{note}</p>
    </div>
  );
}

function TodayStat({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow text-ink-500">{label}</div>
      <div className="mt-1.5 font-display text-headline text-ink-50 tabular-nums leading-tight">{value}</div>
      {sub && <div className="mt-1 text-micro text-ink-400 leading-tight">{sub}</div>}
    </div>
  );
}

function ContextStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="eyebrow text-ink-500">{label}</div>
      <div className="mt-1 text-headline font-display text-ink-50 tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-micro text-ink-500 leading-tight">{sub}</div>}
    </div>
  );
}
