import { format } from "date-fns";
import Link from "next/link";
import { DataBadge } from "@/components/DataBadge";
import { BriefSignup } from "@/components/BriefSignup";
import { ShareTrigger } from "@/components/ShareTrigger";
import { TrackedLink } from "@/components/TrackedLink";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { PresenterMode } from "@/components/PresenterMode";
import { RecordModeButton } from "@/components/RecordModeButton";
import { FlagshipJourney } from "@/components/FlagshipJourney";
import { FlagshipShare } from "@/components/FlagshipShare";
import { WhereAreWe } from "@/components/WhereAreWe";
import { WeekInContext } from "@/components/WeekInContext";
import { HistoricalPathExplorer } from "@/components/HistoricalPathExplorer";
import { SinceLastWeek } from "@/components/sob/SinceLastWeek";
import { LeadChart } from "@/components/sob/LeadChart";
import { EvidenceSweep } from "@/components/sob/EvidenceSweep";
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
import { weekAgoBrief } from "@/lib/weekComparison";
import { todaysVerdict, matchReasons, weekChangeSummary, rankedWatch } from "@/lib/stateOfBitcoin";
import { pathExplorer } from "@/lib/pathExplorer";
import { upsideScenarios } from "@/lib/upside";
import { downsideScenarios } from "@/lib/downside";
import { selectChartOfWeek } from "@/lib/chartOfWeek";
import { episodeBriefText } from "@/lib/episodeBrief";
import { latestFindings } from "@/lib/findings";
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
const TONE: Record<"good" | "bad" | "neutral", string> = { good: "text-accent", bad: "text-signal-red", neutral: "text-ink-300" };

function fmtSignedPct(n: number): string {
  const digits = Math.abs(n) >= 10 ? 0 : 1;
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(digits)}%`;
}

// Days between a YYYY-MM-DD publish date and the snapshot's "today" (deterministic
// against the committed snapshot, not wall-clock).
function daysSince(dateStr: string, today: Date): number {
  const d = new Date(dateStr);
  return Math.floor((today.getTime() - d.getTime()) / 86_400_000);
}

export default function SnapshotPage({ searchParams }: { searchParams: { presenter?: string } }) {
  const presenter = searchParams?.presenter === "true";

  const price = metricChange("price");
  const p7 = price.changes.find((c) => c.period === 7 && c.available);
  const p1 = price.changes.find((c) => c.period === 1 && c.available);
  const dailyNote = dailyVsWeeklyPrice();
  const pos = snapshotCyclePosition();
  const health = metricChange("market_health");
  const ctx = snapshotContext();
  const watch = rankedWatch();
  const cotw = selectChartOfWeek();
  const reasons = matchReasons();
  const weekChange = weekChangeSummary();
  const explorer = pathExplorer();
  const verdict = todaysVerdict();

  // "Since last <weekday>" — a rolling 7-day comparison relative to today, named
  // for the actual weekday of the comparison point (not hard-anchored to any day).
  const weekAgo = weekAgoBrief();
  const sinceTitle = weekAgo ? `Since last ${weekAgo.weekday}` : "Since this time last week";

  const today = SOURCE.fetchedAt ? new Date(SOURCE.fetchedAt) : new Date();
  const finding = latestFindings(1)[0];
  // Research Corner only counts as "this week's finding" when genuinely recent.
  const freshFinding = finding && daysSince(finding.datePublished, today) <= 14 ? finding : null;

  const asOf = SOURCE.fetchedAt ? format(new Date(SOURCE.fetchedAt), "d MMM yyyy, HH:mm 'UTC'") : "—";

  return (
    <div className={presenter ? "presenter-stage space-y-10 max-w-5xl mx-auto" : "space-y-12 lg:space-y-14"}>
      {presenter && <PresenterMode page="The State of Bitcoin" />}
      {presenter && <PresenterHud episodeScript={episodeBriefText()} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Publication identity — this is the current Chapter of The Journal.
          Additive chrome only; hidden in presenter mode to keep the recording clean. */}
      {!presenter && <JournalMasthead chapter={currentChapter()} />}

      {/* ── Section 1 — State of Bitcoin Today ── */}
      <section data-sob-section="today">
        <header className="pt-2">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">
              {presenter ? "Documenting the Cycle — Presenter Mode" : "The definitive weekly read"}
            </span>
            <DataBadge status={DATA_STATUS[SOURCE.mode] ?? "live-derived"} source={`As of ${asOf}`} />
            {!presenter && <ShareTrigger />}
            {!presenter && <RecordModeButton page="/state-of-bitcoin" />}
          </div>
          <h1 className={`font-display font-medium tracking-tightest text-ink-50 leading-[1.04] ${presenter ? "text-[44px] sm:text-[60px]" : "text-[34px] sm:text-[42px] lg:text-[54px]"}`}>
            The State of Bitcoin
          </h1>
          <p className={`mt-3 text-ink-200 leading-relaxed max-w-2xl ${presenter ? "text-[19px]" : "text-[15px] sm:text-[17px]"}`}>
            Where Bitcoin stands today — and the story of the last seven days that brought it here, placed in historical context.
          </p>
        </header>

        {/* Compact orientation strip — the current position at a glance */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
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
        {dailyNote && <p className="mt-3 text-[12.5px] text-ink-400 leading-relaxed">{dailyNote}</p>}

        {/* The signature orientation visual */}
        <div className="mt-8">
          <WhereAreWe />
        </div>

        {/* Reference Prices — Market Price / 200-Day Moving Average /
            Realised Price / Estimated Mining Cost, the full reference-price
            set the market is read against (observed + estimated together). */}
        <div className="mt-8">
          <ReferencePrices />
        </div>
      </section>

      {/* ── Section 2 — The Story of the Last Seven Days ── */}
      <section data-sob-section="week-story">
        <SectionHead n="01" title="The story of the last seven days" note="The week's biggest developments, ranked — what changed, why it matters, and how the moves relate." />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[12px] text-ink-200">{weekChange.headline}</span>
        </div>
        <WeekInContext showCycleStatus={false} />
      </section>

      {/* ── Section 3 — Since Last Wednesday ── */}
      <section data-sob-section="since-last-week">
        <SectionHead n="02" title={sinceTitle} note="A rolling seven-day, then-vs-now of the core readings — and how last week's watch item actually played out." />
        <SinceLastWeek />
      </section>

      {/* ── Section 4 — The Week's Lead Chart ── */}
      <section data-sob-section="lead-chart">
        <SectionHead n="03" title="The week's lead chart" note="The single chart that best captures the week — shown inline." />
        <LeadChart pick={cotw} />
      </section>

      {/* ── Section 5 — Evidence Sweep ── */}
      <section data-sob-section="evidence">
        <SectionHead n="04" title="The evidence" note="The core HalvingLens readings, ranked by how much they moved this week." />
        <EvidenceSweep />
      </section>

      {/* ── Section 6 — Historical Context ── */}
      <section data-sob-section="history">
        <SectionHead n="05" title="How has history behaved from here?" note="Real completed cycles replayed from today's point. Historical context, not a forecast." />
        <p className="mb-4 text-[13px] text-ink-300 leading-relaxed max-w-2xl">
          Each prior-cycle line shows what actually happened after the same stage of an earlier Bitcoin cycle. Dashed
          sections are the paths after a cycle&rsquo;s peak.
        </p>
        {explorer.available && (
          <div className="card p-4 sm:p-7 relative mb-4">
            <HistoricalPathExplorer data={explorer} />
            <div className="watermark">halvinglens.com · historical path explorer</div>
          </div>
        )}
        <div className="card p-5 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ContextStat label="Closest match" value={ctx.match ?? "—"} sub={ctx.similarity != null ? `${ctx.similarity}% similar` : undefined} />
            <ContextStat label="Accumulation" value={`${ctx.accPercentile}%`} sub="more attractive than of weeks" />
            <ContextStat label="Drawdown rank" value={ctx.drawdownPercentile != null ? `${ctx.drawdownPercentile}th` : "—"} sub="of tracked days" />
            <ContextStat label="Market Health" value={ctx.healthPercentile != null ? `${ctx.healthPercentile}th` : (health.band?.label ?? "—")} sub="percentile" />
          </div>
          {reasons.length > 0 && ctx.match && (
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500 mb-2">Why this match?</div>
              <div className="flex flex-wrap gap-2">
                {reasons.map((r) => (
                  <span key={r.label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11.5px] text-ink-200">
                    {r.label}
                    <span className="tabular-nums text-ink-500">{r.closeness}%</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="mt-5 pt-4 border-t border-white/[0.06] text-[14px] text-ink-200 leading-relaxed">{ctx.summary}</p>
          {ETF.connected && (
            <p className="mt-3 text-[12px] text-ink-500 leading-relaxed max-w-2xl">
              Note: spot ETF demand is new to this cycle, so there is no like-for-like precedent in earlier halving cycles.
            </p>
          )}
        </div>
        <HistoricalRangeCard />
      </section>

      {/* ── Section 7 — What did not change? ── */}
      <section data-sob-section="cycle-status">
        <SectionHead n="06" title="What did not change?" note="Whether this week actually moved the broader cycle interpretation." />
        <CycleStatusSection />
      </section>

      {/* ── Section 8 — What we're watching next ── */}
      <section data-sob-section="watching">
        <SectionHead n="07" title="What we're watching next" note="The objective thresholds we'll return to next week — observations, not predictions." />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {watch.map((w, i) => (
            <div key={i} className={`card p-5 ${w.top ? "ring-1 ring-accent/30" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-[14px] font-medium text-ink-50 leading-snug">{w.title}</div>
                {w.top && <span className="shrink-0 text-[9.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border border-accent/30 bg-accent/[0.06] text-accent">Priority</span>}
              </div>
              <div className="mt-2 text-[12px] text-accent">{w.current}</div>
              <p className="mt-2 text-[12.5px] text-ink-400 leading-relaxed">{w.why}</p>
              <div className="mt-3 pt-3 border-t border-white/[0.06] text-[11.5px] text-ink-500">
                <span className="text-ink-400">Meaningful change: </span>
                {w.trigger}
              </div>
            </div>
          ))}
        </div>
        {presenter && (
          <p className="mt-4 text-[12.5px] text-ink-500 italic">
            &ldquo;These are not forecasts — they are the objective thresholds that would tell us whether the current interpretation is changing.&rdquo;
          </p>
        )}
      </section>

      {/* ── Section 9 — Weekly Conclusion ── */}
      <section data-sob-section="conclusion">
        <SectionHead n="08" title="The verdict" note="Everything above, combined into one weekly read." />
        <WeeklyConclusion presenter={presenter} verdict={verdict} />
      </section>

      {/* ── Research corner — secondary; only when genuinely recent ── */}
      {freshFinding && (
        <section>
          <SectionHead n="09" title="Research corner" note="This week's finding from the research library." />
          <TrackedLink href={`/research/findings/${freshFinding.slug}`} event="snapshot_research_click" props={{ id: freshFinding.id }} className="card card-interactive p-5 sm:p-6 block">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-accent/25 text-accent">{freshFinding.id}</span>
              <span className="text-[11px] text-ink-500">{freshFinding.datePublished}</span>
            </div>
            <div className="mt-2 font-display text-[20px] sm:text-[23px] text-ink-50 leading-tight">{freshFinding.title}</div>
            <p className="mt-2 text-[13.5px] text-ink-300 leading-relaxed max-w-2xl">{freshFinding.headline}</p>
            <span className="mt-3 inline-block text-[12.5px] text-accent">Read the research →</span>
          </TrackedLink>
        </section>
      )}

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

      <p className="text-[11px] text-ink-600 pt-2">
        Every figure traces to the live HalvingLens data and updates automatically. Historical context. Not prediction. Not financial advice.
      </p>

      {presenter ? (
        <div className="pt-4">
          <Link href="/state-of-bitcoin" className="text-[12px] text-ink-500 hover:text-ink-300">← Exit presenter mode</Link>
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
        <span className="text-[11px] font-mono text-ink-600">{n}</span>
        <h2 className="font-display text-[22px] sm:text-[26px] text-ink-50 tracking-tight-2">{title}</h2>
      </div>
      <p className="mt-1 ml-8 text-[12.5px] text-ink-500">{note}</p>
    </div>
  );
}

function TodayStat({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink-500">{label}</div>
      <div className="mt-1 font-display text-[19px] text-ink-50 tabular-nums leading-tight">{value}</div>
      {sub && <div className="mt-0.5 text-[10.5px] text-ink-400 leading-tight">{sub}</div>}
    </div>
  );
}

function ContextStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink-500">{label}</div>
      <div className="mt-1 text-[19px] font-display text-ink-50 tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-[10.5px] text-ink-500 leading-tight">{sub}</div>}
    </div>
  );
}

function HistoricalRangeCard() {
  const up = upsideScenarios();
  const down = downsideScenarios();
  if (!up.available) return null;
  const severe = down.levels.filter((l) => l.category === "drawdown").slice(-1)[0]?.price ?? null;
  const strong = up.strongPrice;
  return (
    <TrackedLink href="/historical-price-paths" event="snapshot_range_click" className="card card-interactive p-5 sm:p-6 mt-4 block">
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent">The full historical range from here</div>
      <div className="mt-2.5 flex items-center gap-3 flex-wrap">
        {severe != null && (
          <span className="text-[15px] text-signal-red tabular-nums">
            <span aria-hidden>↓</span> {fmtUsd(severe, { compact: true })}
          </span>
        )}
        <span className="text-ink-600">·</span>
        <span className="text-[13px] text-ink-400 tabular-nums">Today {fmtUsd(up.currentPrice, { compact: true })}</span>
        <span className="text-ink-600">·</span>
        {strong != null && (
          <span className="text-[15px] text-accent tabular-nums">
            <span aria-hidden>↑</span> {fmtUsd(strong, { compact: true })}
          </span>
        )}
      </div>
      <p className="mt-2 text-[12.5px] text-ink-400 leading-relaxed max-w-2xl">
        How far previous halving cycles went from today&rsquo;s point — both up and down. Historical paths, not forecasts.
      </p>
      <span className="mt-2 inline-block text-[12.5px] text-accent">See Historical Price Paths →</span>
    </TrackedLink>
  );
}
