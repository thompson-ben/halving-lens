import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trainModel } from "@/lib/scoring";

// Hits Prisma at request time; never prerender at build (DB may not exist).
export const dynamic = "force-dynamic";

export async function GET() {
  const posts = await prisma.instagramPost.findMany({
    include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 } },
    orderBy: { timestamp: "desc" },
  });

  const model = trainModel(posts);

  // Top posts by likes
  const topPosts = [...posts]
    .sort((a, b) => (b.metrics[0]?.likes ?? 0) - (a.metrics[0]?.likes ?? 0))
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      caption: p.caption,
      permalink: p.permalink,
      thumbnailUrl: p.thumbnailUrl,
      carMake: p.carMake,
      carModel: p.carModel,
      theme: p.theme,
      captionStyle: p.captionStyle,
      likes: p.metrics[0]?.likes ?? 0,
      comments: p.metrics[0]?.comments ?? 0,
      reach: p.metrics[0]?.reach ?? null,
      timestamp: p.timestamp,
    }));

  // Brand breakdown
  const brandStats = Object.entries(model.carMakeLift)
    .map(([make, lift]) => ({ make, lift, label: make }))
    .sort((a, b) => b.lift - a.lift);

  // Timeline (likes by week)
  const timeline = (() => {
    const buckets = new Map<string, { likes: number; count: number; engagement: number }>();
    for (const p of posts) {
      const week = `${p.timestamp.getFullYear()}-W${weekOfYear(p.timestamp).toString().padStart(2, "0")}`;
      const b = buckets.get(week) ?? { likes: 0, count: 0, engagement: 0 };
      b.likes += p.metrics[0]?.likes ?? 0;
      b.engagement += p.metrics[0]?.engagementRate ?? 0;
      b.count += 1;
      buckets.set(week, b);
    }
    return Array.from(buckets.entries())
      .map(([week, b]) => ({
        week,
        avgLikes: b.count ? Math.round(b.likes / b.count) : 0,
        avgEngagement: b.count ? Number((b.engagement / b.count).toFixed(2)) : 0,
        posts: b.count,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  })();

  return NextResponse.json({
    totals: {
      posts: posts.length,
      totalLikes: posts.reduce((s, p) => s + (p.metrics[0]?.likes ?? 0), 0),
      totalComments: posts.reduce((s, p) => s + (p.metrics[0]?.comments ?? 0), 0),
      avgEngagement: Number(model.baseline.avgEngagement.toFixed(2)),
    },
    model,
    topPosts,
    brandStats,
    timeline,
  });
}

function weekOfYear(d: Date): number {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86_400_000 + onejan.getDay() + 1) / 7);
}
