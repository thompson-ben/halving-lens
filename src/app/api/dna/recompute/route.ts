import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  embedText,
  findBestMatch,
  embeddingModel,
  type TopPostRef,
} from "@/lib/embeddings";

export const dynamic = "force-dynamic";

// Recompute the full Content DNA pipeline:
//   1. Refresh the `topPerformer` flag on InstagramPost (top quartile by
//      latest PostMetric.likes, or top 10 if the cohort is small).
//   2. Embed any InstagramPost or DiscoveredContent that doesn't yet have a
//      caption embedding.
//   3. For every DiscoveredContent, find the closest top-performer post and
//      store the similarity score + winning post id.
//
// This is idempotent and safe to re-run. It deliberately walks the full set
// instead of just deltas so it picks up new top-performers when the team's
// own post metrics shift.
export async function POST() {
  const startedAt = Date.now();

  // -- Step 1 -- Recompute top-performer flags ------------------------------
  // Pull the latest PostMetric per InstagramPost. We sort by latest likes
  // (the closest proxy we have to overall pull without weighting reach).
  const posts = await prisma.instagramPost.findMany({
    select: {
      id: true,
      caption: true,
      captionEmbedding: true,
      metrics: {
        orderBy: { capturedAt: "desc" },
        take: 1,
        select: { likes: true },
      },
    },
  });

  const rankable = posts
    .map((p) => ({ id: p.id, caption: p.caption, embedding: p.captionEmbedding, likes: p.metrics[0]?.likes ?? 0 }))
    .sort((a, b) => b.likes - a.likes);
  const topCount = Math.max(10, Math.ceil(rankable.length * 0.25));
  const topIds = new Set(rankable.slice(0, topCount).map((p) => p.id));

  await prisma.$transaction([
    prisma.instagramPost.updateMany({ where: { topPerformer: true }, data: { topPerformer: false } }),
    prisma.instagramPost.updateMany({ where: { id: { in: Array.from(topIds) } }, data: { topPerformer: true } }),
  ]);

  // -- Step 2 -- Backfill caption embeddings on InstagramPost ---------------
  let postsEmbedded = 0;
  for (const p of rankable) {
    if (p.embedding && p.embedding.length > 0) continue;
    if (!p.caption) continue;
    const vec = await embedText(p.caption);
    if (!vec) continue;
    await prisma.instagramPost.update({
      where: { id: p.id },
      data: { captionEmbedding: vec },
    });
    postsEmbedded += 1;
  }

  // -- Step 3 -- Build the top-performer reference set ----------------------
  const topRefs: TopPostRef[] = (
    await prisma.instagramPost.findMany({
      where: { topPerformer: true, NOT: { captionEmbedding: { isEmpty: true } } },
      select: { id: true, captionEmbedding: true },
    })
  )
    .filter((p) => p.captionEmbedding.length > 0)
    .map((p) => ({ id: p.id, embedding: p.captionEmbedding }));

  // -- Step 4 -- Embed + score every DiscoveredContent ----------------------
  const discovered = await prisma.discoveredContent.findMany({
    select: { id: true, caption: true, captionEmbedding: true },
  });

  let contentEmbedded = 0;
  let contentScored = 0;
  for (const c of discovered) {
    let embedding = c.captionEmbedding && c.captionEmbedding.length > 0 ? c.captionEmbedding : null;
    if (!embedding && c.caption) {
      const vec = await embedText(c.caption);
      if (vec) {
        embedding = vec;
        contentEmbedded += 1;
      }
    }
    if (!embedding) continue;

    const match = findBestMatch(embedding, topRefs);
    await prisma.discoveredContent.update({
      where: { id: c.id },
      data: {
        captionEmbedding: embedding,
        bestSimilarityScore: match?.score ?? null,
        similarToPostId: match?.postId ?? null,
      },
    });
    contentScored += 1;
  }

  return NextResponse.json({
    model: embeddingModel,
    durationMs: Date.now() - startedAt,
    topPerformerCount: topIds.size,
    totalPosts: rankable.length,
    postsEmbedded,
    totalDiscovered: discovered.length,
    contentEmbedded,
    contentScored,
  });
}
