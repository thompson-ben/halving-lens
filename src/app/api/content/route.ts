import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { similarityCutoff } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

// Aspect-ratio buckets exposed via ?aspect=. We match against width/height
// using narrow ranges (±10%) instead of computing the ratio in SQL because
// Prisma can't express a ratio cleanly without a raw query, and the IG CDN
// outputs are predictable enough that range matching nails it.
function aspectWhere(aspect: string | null): Prisma.DiscoveredContentWhereInput {
  if (!aspect || aspect === "any") return {};
  // We can't express the ratio cleanly in Prisma without a raw query, so
  // we narrow by exact target dimensions (with a small ±10% tolerance) —
  // this matches the realistic IG CDN outputs.
  if (aspect === "square") {
    return {
      AND: [
        { width: { gte: 900 } },
        { width: { lte: 1280 } },
        { height: { gte: 900 } },
        { height: { lte: 1280 } },
      ],
    };
  }
  if (aspect === "portrait") {
    return {
      AND: [
        { width: { gte: 900 } },
        { width: { lte: 1280 } },
        { height: { gte: 1200 } },
        { height: { lte: 1500 } },
      ],
    };
  }
  if (aspect === "feed") {
    return {
      OR: [aspectWhere("square"), aspectWhere("portrait")],
    };
  }
  return {};
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const search = searchParams.get("q");
  const similar = searchParams.get("similar") === "true";
  const aspect = searchParams.get("aspect");

  const items = await prisma.discoveredContent.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(platform ? { platform } : {}),
      ...(similar ? { bestSimilarityScore: { gte: similarityCutoff() } } : {}),
      ...aspectWhere(aspect),
      ...(search
        ? {
            OR: [
              { caption: { contains: search, mode: "insensitive" } },
              { originalAuthor: { contains: search, mode: "insensitive" } },
              { carMake: { contains: search, mode: "insensitive" } },
              { carModel: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: similar
      ? [{ bestSimilarityScore: "desc" }, { discoveredAt: "desc" }]
      : [{ aiScore: "desc" }, { discoveredAt: "desc" }],
    take: 200,
    include: { captions: { orderBy: { createdAt: "desc" }, take: 1 }, score: true },
  });

  // Resolve the matched top-performer post for any item that has one so the
  // queue card can show "Similar to: <post>" without an extra round-trip.
  const matchedIds = Array.from(new Set(items.map((i) => i.similarToPostId).filter((id): id is string => !!id)));
  const matchedPosts = matchedIds.length
    ? await prisma.instagramPost.findMany({
        where: { id: { in: matchedIds } },
        select: { id: true, caption: true, permalink: true, thumbnailUrl: true },
      })
    : [];
  const matchMap = new Map(matchedPosts.map((p) => [p.id, p]));

  const augmented = items.map((it) => ({
    ...it,
    similarToPost: it.similarToPostId ? matchMap.get(it.similarToPostId) ?? null : null,
  }));

  return NextResponse.json({ items: augmented, similarityCutoff: similarityCutoff() });
}
