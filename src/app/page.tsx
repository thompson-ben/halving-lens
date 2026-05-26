import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
import { ContentCard } from "@/components/ContentCard";
import { trainModel } from "@/lib/scoring";
import { similarityCutoff } from "@/lib/embeddings";
import { Dna, Heart, ListChecks, Sparkles, TrendingUp, CalendarClock, Trophy } from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [topQueue, posts, scheduled, queueCounts, dnaMatches, topPerformers] = await Promise.all([
    prisma.discoveredContent.findMany({
      where: { status: { in: ["new", "shortlisted"] } },
      orderBy: [{ aiScore: "desc" }],
      take: 6,
    }),
    prisma.instagramPost.findMany({
      include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 } },
      orderBy: { timestamp: "desc" },
    }),
    prisma.postingSchedule.count({ where: { status: "scheduled" } }),
    prisma.discoveredContent.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.discoveredContent.count({
      where: {
        status: { in: ["new", "shortlisted"] },
        bestSimilarityScore: { gte: similarityCutoff() },
      },
    }),
    prisma.instagramPost.findMany({
      where: { topPerformer: true },
      select: { carMake: true, captionStyle: true, theme: true, hashtags: true },
    }),
  ]);

  const model = trainModel(posts);
  const totalLikes = posts.reduce((s, p) => s + (p.metrics[0]?.likes ?? 0), 0);
  const queueNew = queueCounts.find((q) => q.status === "new")?._count._all ?? 0;
  const topBrand = Object.entries(model.carMakeLift).sort((a, b) => b[1] - a[1])[0];
  const bestSlot = model.bestPostingTimes[0];

  // "What your top posts have in common" — derive a few quick stats from
  // the posts flagged topPerformer by the Content DNA pipeline.
  const dnaInsights = summariseTopPerformers(topPerformers);

  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-100">Dashboard</h1>
          <p className="text-sm text-ink-300 mt-1">
            Premium supercar content — sourced, scored, scheduled. Phase 1: historical analysis &amp; queue review.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Lifetime likes"
          value={formatNumber(totalLikes)}
          hint={`${posts.length} posts analysed`}
          icon={Heart}
        />
        <StatCard
          label="Avg engagement"
          value={formatPercent(model.baseline.avgEngagement)}
          hint="Across analysed posts"
          icon={TrendingUp}
          tone="accent"
        />
        <StatCard
          label="Queue: new"
          value={queueNew}
          hint={`${queueCounts.find((q) => q.status === "shortlisted")?._count._all ?? 0} shortlisted`}
          icon={ListChecks}
        />
        <StatCard
          label="DNA matches in queue"
          value={dnaMatches}
          hint={`Above ${Math.round(similarityCutoff() * 100)}% similarity`}
          icon={Dna}
          tone="accent"
        />
        <StatCard
          label="Scheduled posts"
          value={scheduled}
          hint="Awaiting publish"
          icon={CalendarClock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-title">AI recommendations</div>
              <h2 className="text-lg font-semibold text-ink-100 mt-1">Top of the queue</h2>
            </div>
            <Link href="/discovery" className="btn-ghost text-xs">
              Open queue →
            </Link>
          </div>
          {topQueue.length === 0 ? (
            <div className="text-sm text-ink-300 py-10 text-center">
              No content discovered yet. Try{" "}
              <Link href="/import" className="text-accent hover:underline">
                importing a URL
              </Link>
              .
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {topQueue.slice(0, 4).map((c) => (
                <ContentCard
                  key={c.id}
                  item={{
                    ...c,
                    discoveredAt: c.discoveredAt.toISOString(),
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="card p-5 space-y-5">
          <div>
            <div className="section-title flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5" /> What&apos;s working
            </div>
            <div className="mt-3 space-y-3">
              {topBrand && (
                <Insight
                  title={`${topBrand[0]} is your best-performing brand`}
                  detail={`${(((topBrand[1] ?? 1) - 1) * 100).toFixed(0)}% above your average likes.`}
                />
              )}
              {bestSlot && (
                <Insight
                  title="Best posting slot"
                  detail={`${dows[bestSlot.dow]} at ${bestSlot.hour}:00 — ${((bestSlot.score - 1) * 100).toFixed(0)}% above average.`}
                />
              )}
              {model.topHashtags[0] && (
                <Insight
                  title={`Top hashtag: ${model.topHashtags[0].tag}`}
                  detail={`${((model.topHashtags[0].lift - 1) * 100).toFixed(0)}% lift versus average.`}
                />
              )}
              {Object.entries(model.captionStyleLift).sort((a, b) => b[1] - a[1])[0] && (
                <Insight
                  title={`${Object.entries(model.captionStyleLift).sort((a, b) => b[1] - a[1])[0][0]} captions outperform`}
                  detail="Lean into this style for the next 2 weeks."
                />
              )}
            </div>
          </div>

          {dnaInsights.count > 0 && (
            <div className="border-t border-ink-700 pt-4">
              <div className="section-title flex items-center gap-2">
                <Dna className="w-3.5 h-3.5" /> What your top posts have in common
              </div>
              <div className="mt-3 space-y-3">
                <Insight
                  title={`${dnaInsights.count} posts flagged as top performers`}
                  detail={
                    dnaInsights.topMake
                      ? `Dominant brand: ${dnaInsights.topMake.label} (${dnaInsights.topMake.share}%).`
                      : "Brand mix is even — no single brand dominates."
                  }
                />
                {dnaInsights.topStyle && (
                  <Insight
                    title={`Caption style: ${dnaInsights.topStyle.label}`}
                    detail={`${dnaInsights.topStyle.share}% of your top performers use this style.`}
                  />
                )}
                {dnaInsights.topTheme && (
                  <Insight
                    title={`Theme: ${dnaInsights.topTheme.label}`}
                    detail={`${dnaInsights.topTheme.share}% share among top performers.`}
                  />
                )}
                {dnaInsights.topHashtag && (
                  <Insight
                    title={`Recurring hashtag: ${dnaInsights.topHashtag.label}`}
                    detail={`Appears on ${dnaInsights.topHashtag.share}% of top performers.`}
                  />
                )}
              </div>
            </div>
          )}

          <div className="border-t border-ink-700 pt-4">
            <div className="section-title flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Quick links
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/analytics" className="btn-secondary text-xs">
                Analytics →
              </Link>
              <Link href="/calendar" className="btn-secondary text-xs">
                Calendar →
              </Link>
              <Link href="/import" className="btn-secondary text-xs">
                Import URL
              </Link>
              <Link href="/settings" className="btn-secondary text-xs">
                Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Insight({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg bg-ink-850 border border-ink-700 px-3 py-2.5">
      <div className="text-sm text-ink-100">{title}</div>
      <div className="text-xs text-ink-300 mt-0.5">{detail}</div>
    </div>
  );
}

type TopPostRow = {
  carMake: string | null;
  captionStyle: string | null;
  theme: string | null;
  hashtags: string[];
};

function summariseTopPerformers(rows: TopPostRow[]) {
  const count = rows.length;
  if (count === 0) {
    return { count, topMake: null, topStyle: null, topTheme: null, topHashtag: null };
  }
  return {
    count,
    topMake: topShare(rows.map((r) => r.carMake)),
    topStyle: topShare(rows.map((r) => r.captionStyle)),
    topTheme: topShare(rows.map((r) => r.theme)),
    topHashtag: topShare(rows.flatMap((r) => r.hashtags ?? [])),
  };
}

function topShare(values: Array<string | null | undefined>): { label: string; share: number } | null {
  const counts = new Map<string, number>();
  let total = 0;
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
    total += 1;
  }
  if (total === 0) return null;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [label, n] = sorted[0];
  return { label, share: Math.round((n / total) * 100) };
}
