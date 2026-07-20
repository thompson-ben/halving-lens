import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminLogin } from "@/components/AdminLogin";
import { isAdmin, adminConfigured } from "@/lib/adminAuth";
import { ContentPackStudio, type StudioPack } from "@/components/ContentPackStudio";
import { ReelStudio } from "@/components/ReelStudio";
import { buildPack, CARD_LABELS, accumulationContentPack, marketHealthContentPack, etfContentPack, metricContentPack, cyclesContentPack, weekContentPack, chartOfWeekContentPack, type BuildCtx, type Deck, type PackId } from "@/lib/contentCards";
import { contentPack } from "@/lib/brief";
import { historicalContentPack, similarContentPack } from "@/lib/historicalPack";
import { reelPackage, reelScriptText } from "@/lib/reel";
import { todaysPlan, etfIsInteresting, accumulationIsInteresting } from "@/lib/contentCalendar";
import { storyEngine, type Story, type StorySelection } from "@/lib/storyEngine";
import { recentSocialPosts } from "@/lib/socialPosts";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Content Pack Generator — halvinglens.com",
  robots: { index: false },
};

// Admin-only Daily Content Pack studio: one-click branded carousel cards + copy
// blocks, all generated from today's Daily Brief. Auth via the metrics dashboard
// session cookie (or ?key= match). Noindex, unlinked from public nav.
export default async function ContentPackPage({ searchParams }: { searchParams?: { pack?: string } }) {
  if (!adminConfigured()) {
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl leading-relaxed">
          Set <code className="text-accent">ANALYTICS_DASHBOARD_KEY</code> in the environment to
          enable the studio.
        </p>
      </Shell>
    );
  }

  if (!isAdmin()) {
    return (
      <Shell>
        <AdminLogin />
      </Shell>
    );
  }

  const toStudioPack = (
    id: PackId,
    label: string,
    deck: Deck,
    content: ReturnType<typeof contentPack>,
  ): StudioPack => ({
    id,
    label,
    slug: deck.slug,
    dateLabel: deck.dateLabel,
    cards: deck.cards.map((c) => ({ id: c.id, index: c.index, name: CARD_LABELS[c.id].name })),
    copy: {
      caption: content.instagram,
      thread: content.xThread.join("\n\n"),
      linkedin: content.linkedin,
      email: `Subject: ${content.emailSubject}\n\n${content.emailBody}`,
      ...(content.storyCaption ? { story: content.storyCaption } : {}),
      ...(content.youtubeCommunity ? { youtube: content.youtubeCommunity } : {}),
    },
  });

  // The editorial engine's decision, resolved once with the real post history so
  // the Chart-of-the-Week pack, its copy and the transparency panel all agree.
  const recent = await recentSocialPosts();
  const decision = storyEngine({ recentPosts: recent });
  const storyCtx: BuildCtx = { story: decision.top };

  const packs: StudioPack[] = [
    toStudioPack("week", "Generate This Week in the Bitcoin Cycle", buildPack("week"), weekContentPack()),
    toStudioPack("chart_week", "Generate Chart of the Week", buildPack("chart_week", storyCtx), chartOfWeekContentPack(storyCtx)),
    toStudioPack("cycles", "Generate Every Cycle Compared", buildPack("cycles"), cyclesContentPack()),
    toStudioPack("daily", "Generate Daily Brief Pack", buildPack("daily"), contentPack()),
    toStudioPack("historical", "Generate Historical Context Pack", buildPack("historical"), historicalContentPack()),
    toStudioPack("similar", "Generate Similar Moments Pack", buildPack("similar"), similarContentPack()),
    toStudioPack("accumulation", "Generate Accumulation Index Pack", buildPack("accumulation"), accumulationContentPack()),
    toStudioPack("market_health", "Generate Market Health Pack", buildPack("market_health"), marketHealthContentPack()),
    toStudioPack("etf", "Generate ETF Flow Pack", buildPack("etf"), etfContentPack()),
    toStudioPack("metric", "Generate Metric Deep Dive Pack", buildPack("metric"), metricContentPack()),
  ];

  const reel = reelPackage();

  const plan = todaysPlan();
  const etf = etfIsInteresting();
  const acc = accumulationIsInteresting();

  return (
    <Shell>
      <TodaysPlan plan={plan} etf={etf} acc={acc} />
      <EditorialEngine decision={decision} recent={recent} />
      <ContentPackStudio packs={packs} initialPackId={searchParams?.pack} />
      <div className="mt-12 pt-10 border-t border-white/[0.07]">
        <ReelStudio reel={reel} script={reelScriptText(reel)} />
      </div>
    </Shell>
  );
}

// ── Editorial engine transparency ────────────────────────────────────────────
// Shows WHY today's story won: the ranked candidates, the winning score
// breakdown, the chosen layout, and the recent-post history that drives
// diversity. Makes the automated editorial decision auditable at a glance.
const FACTOR_LABEL: Record<string, string> = {
  magnitude: "7-day magnitude",
  distanceFromNorm: "Distance from norm",
  percentChange: "% change",
  thresholdCrossing: "Threshold crossing",
  rarity: "Historical rarity",
  percentileMovement: "Percentile movement",
  supportingIndicators: "Supporting indicators",
  confidence: "Confidence",
  researchSignificance: "Research significance",
};

function EditorialEngine({ decision, recent }: { decision: StorySelection; recent: Awaited<ReturnType<typeof recentSocialPosts>> }) {
  const top = decision.top;
  return (
    <div className="card-glow p-5 sm:p-6 mb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent">Editorial engine · today&apos;s story</div>
        <div className="text-[11px] text-ink-500">
          Layout <span className="text-ink-200">{top.layout}</span> · score{" "}
          <span className="text-ink-200 font-mono">{Math.round(top.score * 100)}</span>/100
        </div>
      </div>

      <div className="text-[20px] text-ink-50 font-medium leading-snug">{top.headline}</div>
      <p className="mt-1 text-[13px] text-ink-400">{top.deck}</p>
      {top.diversityNote && <p className="mt-1.5 text-[12px] text-signal-amber">{top.diversityNote}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">
        {/* Why it won — the score breakdown */}
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500 mb-2.5">Why it won</div>
          <div className="space-y-1.5">
            {(Object.keys(FACTOR_LABEL) as (keyof typeof top.breakdown)[]).map((k) => (
              <div key={k} className="flex items-center gap-3">
                <div className="w-40 shrink-0 text-[11.5px] text-ink-300">{FACTOR_LABEL[k]}</div>
                <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                  <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.round(top.breakdown[k] * 100)}%` }} />
                </div>
                <div className="w-8 shrink-0 text-right font-mono text-[11px] text-ink-400 tabular-nums">{Math.round(top.breakdown[k] * 100)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranked alternatives */}
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500 mb-2.5">Ranked stories</div>
          <div className="space-y-1">
            {decision.ranked.map((s: Story, i: number) => (
              <div key={s.key} className={`flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg ${i === 0 ? "bg-accent/[0.07]" : ""}`}>
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="w-4 text-[11px] font-mono text-ink-600 tabular-nums">{i + 1}</span>
                  <span className={`text-[12.5px] truncate ${i === 0 ? "text-ink-50" : "text-ink-300"}`}>{s.headline}</span>
                </div>
                <div className="shrink-0 flex items-center gap-2 font-mono text-[11px] tabular-nums">
                  <span className={i === 0 ? "text-accent" : "text-ink-400"}>{Math.round(s.score * 100)}</span>
                  {s.score !== s.rawScore && <span className="text-ink-600">(raw {Math.round(s.rawScore * 100)})</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent post history — the diversity memory */}
      <div className="mt-5 pt-4 border-t border-white/[0.07]">
        <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500 mb-2">
          Recent posts {recent.length ? `· diversity memory (${recent.length})` : ""}
        </div>
        {recent.length === 0 ? (
          <p className="text-[12px] text-ink-500 leading-relaxed">
            No posts logged yet. Use <span className="text-ink-300">Mark as posted</span> after publishing so the engine can avoid repeating a hero
            chart, layout or angle. Until then it ranks purely on editorial importance.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {recent.slice(0, 10).map((p, i) => (
              <div key={i} className="text-[11px] text-ink-400 border border-white/[0.08] rounded-lg px-2.5 py-1">
                <span className="text-ink-500">{p.postDate}</span> · {p.pack}
                {p.layout ? <span className="text-ink-600"> · {p.layout}</span> : ""}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TodaysPlan({
  plan,
  etf,
  acc,
}: {
  plan: ReturnType<typeof todaysPlan>;
  etf: ReturnType<typeof etfIsInteresting>;
  acc: ReturnType<typeof accumulationIsInteresting>;
}) {
  const Trigger = ({ label, check }: { label: string; check: { flagged: boolean; reason: string } }) => (
    <div className="flex items-start gap-2.5">
      <span className={`mt-1 inline-block w-2 h-2 rounded-full shrink-0 ${check.flagged ? "bg-signal-green" : "bg-ink-600"}`} />
      <div className="text-[12.5px] leading-relaxed">
        <span className="text-ink-200">{label}: </span>
        <span className={check.flagged ? "text-signal-green" : "text-ink-500"}>{check.flagged ? "publish today" : "hold"}</span>
        <span className="text-ink-500"> — {check.reason}</span>
      </div>
    </div>
  );
  return (
    <div className="card-glow p-5 sm:p-6 mb-8">
      <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">Today&apos;s plan · {plan.day}</div>
      <div className="text-[18px] text-ink-50 font-medium">
        Publish: <span className="text-accent">{plan.slot.label}</span>
      </div>
      <p className="mt-1 text-[13px] text-ink-400">
        {plan.slot.note}
        {plan.slot.packId ? " Generate it below." : " Not a studio pack — produced on its own page."}
      </p>
      <div className="mt-4 pt-4 border-t border-white/[0.07] space-y-2">
        <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500 mb-1">Event-driven packs</div>
        <Trigger label="ETF Flow" check={etf} />
        <Trigger label="Accumulation Index" check={acc} />
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-7">
      <header className="pt-2">
        <Link
          href="/admin/metrics"
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-ink-200 mb-4"
        >
          <ArrowLeft size={13} /> Metrics dashboard
        </Link>
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-3">Internal</div>
        <h1 className="font-display text-[32px] lg:text-[40px] font-medium tracking-tightest text-ink-50">
          Content Pack Generator
        </h1>
        <p className="mt-3 text-[13.5px] text-ink-300 max-w-2xl leading-relaxed">
          One-click branded carousels from the live cycle data — pick the{" "}
          <span className="text-ink-100">Daily Brief Pack</span> or the{" "}
          <span className="text-ink-100">Historical Context Pack</span> (which leads with the
          strongest historical narrative: drawdowns, cycle position or sentiment). Each produces
          Instagram-ready cards plus captions for X, LinkedIn and email. Below them, the{" "}
          <span className="text-ink-100">Daily Reel package</span> — a ready-to-shoot short-form
          video script built around the single most interesting insight today. Generated
          server-side; no manual design.
        </p>
      </header>
      {children}
    </div>
  );
}
