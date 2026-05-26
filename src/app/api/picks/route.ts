import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { similarityCutoff } from "@/lib/embeddings";
import { isFeedReady } from "@/lib/imageDimensions";
import { loadCooldownBrands, scoreCandidate } from "@/lib/picks";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(20, Number(searchParams.get("limit") ?? 10)));
  const feedReadyOnly = searchParams.get("feedReady") === "true";

  const [candidates, cooldownBrands] = await Promise.all([
    prisma.discoveredContent.findMany({
      where: { status: { in: ["new", "shortlisted"] } },
      orderBy: { discoveredAt: "desc" },
      take: 200,
    }),
    loadCooldownBrands(),
  ]);

  const filtered = feedReadyOnly
    ? candidates.filter((c) => isFeedReady(c.width, c.height))
    : candidates;

  const now = Date.now();
  const ranked = filtered
    .map((c) => scoreCandidate(c, cooldownBrands, now))
    .sort((a, b) => b.composite - a.composite)
    .slice(0, limit);

  // Hydrate matched top-performer posts so each card can render the "similar
  // to" hint without an extra round-trip.
  const matchedIds = Array.from(
    new Set(ranked.map((r) => r.content.similarToPostId).filter((id): id is string => !!id)),
  );
  const matchedPosts = matchedIds.length
    ? await prisma.instagramPost.findMany({
        where: { id: { in: matchedIds } },
        select: { id: true, caption: true, permalink: true, thumbnailUrl: true },
      })
    : [];
  const matchMap = new Map(matchedPosts.map((p) => [p.id, p]));

  const items = ranked.map((r) => ({
    ...r.content,
    similarToPost: r.content.similarToPostId ? matchMap.get(r.content.similarToPostId) ?? null : null,
    compositeScore: Number(r.composite.toFixed(4)),
    scoreBreakdown: {
      dna: Number(r.breakdown.dna.toFixed(4)),
      ai: Number(r.breakdown.ai.toFixed(4)),
      recency: Number(r.breakdown.recency.toFixed(4)),
      engagement: Number(r.breakdown.engagement.toFixed(4)),
      inCooldown: r.breakdown.inCooldown,
    },
  }));

  return NextResponse.json({
    items,
    similarityCutoff: similarityCutoff(),
    cooldownBrandCount: cooldownBrands.size,
    candidatePoolSize: filtered.length,
    feedReadyFilterApplied: feedReadyOnly,
  });
}
