import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { similarityCutoff } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

// How long a brand stays in cooldown after we've already published a post
// featuring it. Keeps daily picks from feeling repetitive across days. The
// operator-configurable Setting.repost_cooldown_days is separate — it's the
// hard cooldown on re-posting the exact same content.
const BRAND_COOLDOWN_DAYS = 14;

// Daily Picks scoring weights. Sum to 1.0 before the cooldown penalty.
const W_DNA = 0.45;
const W_AI = 0.35;
const W_RECENCY = 0.15;
const W_ENGAGEMENT = 0.05;

// Brand cooldown halves the composite — we still want to see strong items
// from a recently-used brand, just not at the top of the deck.
const COOLDOWN_MULTIPLIER = 0.5;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(20, Number(searchParams.get("limit") ?? 10)));

  const [candidates, recentlyPosted] = await Promise.all([
    prisma.discoveredContent.findMany({
      where: { status: { in: ["new", "shortlisted"] } },
      orderBy: { discoveredAt: "desc" },
      take: 200,
    }),
    prisma.instagramPost.findMany({
      where: { timestamp: { gte: new Date(Date.now() - BRAND_COOLDOWN_DAYS * 24 * 60 * 60 * 1000) } },
      select: { carMake: true },
    }),
  ]);

  const cooldownBrands = new Set(
    recentlyPosted
      .map((p) => p.carMake?.toLowerCase().trim())
      .filter((b): b is string => !!b),
  );

  const now = Date.now();
  const scored = candidates.map((c) => {
    const dna = c.bestSimilarityScore ?? 0;
    const ai = (c.aiScore ?? 0) / 100;
    const ageDays = Math.max(0, (now - c.discoveredAt.getTime()) / (24 * 60 * 60 * 1000));
    const recency = Math.exp(-ageDays / 7); // ~7-day half-life
    const engagement = Math.min(1, Math.log10((c.likes ?? 0) + 1) / 7);

    let composite = W_DNA * dna + W_AI * ai + W_RECENCY * recency + W_ENGAGEMENT * engagement;

    const inCooldown = c.carMake ? cooldownBrands.has(c.carMake.toLowerCase().trim()) : false;
    if (inCooldown) composite *= COOLDOWN_MULTIPLIER;

    return {
      content: c,
      composite,
      breakdown: {
        dna,
        ai,
        recency,
        engagement,
        inCooldown,
      },
    };
  });

  const ranked = scored.sort((a, b) => b.composite - a.composite).slice(0, limit);

  // Hydrate matched top-performer posts so the card can render the "similar
  // to" hint without an extra round-trip — same shape the content API uses.
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
    candidatePoolSize: candidates.length,
  });
}
