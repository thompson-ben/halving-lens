import type { DiscoveredContent } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Brand cooldown: an item from a brand we've already published in the last
// 14 days gets its composite halved. Keeps the picks deck feeling fresh
// across consecutive days without hard-blocking strong items.
export const BRAND_COOLDOWN_DAYS = 14;
export const COOLDOWN_MULTIPLIER = 0.5;

// Composite weights — must sum to 1.0 pre-cooldown.
export const W_DNA = 0.45;
export const W_AI = 0.35;
export const W_RECENCY = 0.15;
export const W_ENGAGEMENT = 0.05;

export type CompositeBreakdown = {
  dna: number;
  ai: number;
  recency: number;
  engagement: number;
  inCooldown: boolean;
};

export type ScoredCandidate = {
  content: DiscoveredContent;
  composite: number;
  breakdown: CompositeBreakdown;
};

export function scoreCandidate(
  c: DiscoveredContent,
  cooldownBrands: Set<string>,
  now = Date.now(),
): ScoredCandidate {
  const dna = c.bestSimilarityScore ?? 0;
  const ai = (c.aiScore ?? 0) / 100;
  const ageDays = Math.max(0, (now - c.discoveredAt.getTime()) / (24 * 60 * 60 * 1000));
  const recency = Math.exp(-ageDays / 7);
  const engagement = Math.min(1, Math.log10((c.likes ?? 0) + 1) / 7);

  let composite = W_DNA * dna + W_AI * ai + W_RECENCY * recency + W_ENGAGEMENT * engagement;
  const inCooldown = c.carMake ? cooldownBrands.has(c.carMake.toLowerCase().trim()) : false;
  if (inCooldown) composite *= COOLDOWN_MULTIPLIER;

  return {
    content: c,
    composite,
    breakdown: { dna, ai, recency, engagement, inCooldown },
  };
}

export async function loadCooldownBrands(): Promise<Set<string>> {
  const recent = await prisma.instagramPost.findMany({
    where: { timestamp: { gte: new Date(Date.now() - BRAND_COOLDOWN_DAYS * 24 * 60 * 60 * 1000) } },
    select: { carMake: true },
  });
  return new Set(
    recent.map((p) => p.carMake?.toLowerCase().trim()).filter((b): b is string => !!b),
  );
}
