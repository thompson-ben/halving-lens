import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { similarityCutoff } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const search = searchParams.get("q");
  const similar = searchParams.get("similar") === "true";

  const items = await prisma.discoveredContent.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(platform ? { platform } : {}),
      ...(similar ? { bestSimilarityScore: { gte: similarityCutoff() } } : {}),
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
