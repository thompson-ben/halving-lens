// Performance learning engine.
//
// This module is intentionally simple and explainable: we compute a per-feature
// "lift" from our historical Instagram posts (how much better than average a
// given car make / theme / posting hour performs), then combine those lifts
// with the AI quality score into a final ranking score.
//
// Swap this out for a real ML model later — the API surface
// (`scoreDiscoveredContent`) stays the same.

import type { InstagramPost, PostMetric } from "@prisma/client";
import { clamp } from "./utils";

type PostWithMetrics = InstagramPost & { metrics: PostMetric[] };

export type LearnedModel = {
  baseline: { avgLikes: number; avgEngagement: number };
  carMakeLift: Record<string, number>;
  carModelLift: Record<string, number>;
  themeLift: Record<string, number>;
  hourLift: Record<number, number>;
  dowLift: Record<number, number>;
  captionStyleLift: Record<string, number>;
  topHashtags: Array<{ tag: string; lift: number }>;
  bestPostingTimes: Array<{ hour: number; dow: number; score: number }>;
  version: string;
};

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function liftMap<K extends string | number>(
  posts: PostWithMetrics[],
  keyFn: (p: PostWithMetrics) => K | null | undefined,
  baseline: number,
): Record<string, number> {
  const groups = new Map<K, number[]>();
  for (const p of posts) {
    const key = keyFn(p);
    if (key === null || key === undefined) continue;
    const likes = p.metrics[0]?.likes ?? 0;
    const arr = groups.get(key) ?? [];
    arr.push(likes);
    groups.set(key, arr);
  }
  const out: Record<string, number> = {};
  for (const [k, vals] of groups.entries()) {
    if (vals.length < 2) continue; // require minimal support
    out[String(k)] = baseline > 0 ? avg(vals) / baseline : 0;
  }
  return out;
}

export function trainModel(posts: PostWithMetrics[]): LearnedModel {
  const likes = posts.map((p) => p.metrics[0]?.likes ?? 0);
  const engagement = posts.map((p) => p.metrics[0]?.engagementRate ?? 0);
  const baselineLikes = avg(likes);
  const baselineEng = avg(engagement);

  const carMakeLift = liftMap(posts, (p) => p.carMake, baselineLikes);
  const carModelLift = liftMap(posts, (p) => p.carModel, baselineLikes);
  const themeLift = liftMap(posts, (p) => p.theme, baselineLikes);
  const hourLift = liftMap(posts, (p) => p.postedHour, baselineLikes);
  const dowLift = liftMap(posts, (p) => p.postedDow, baselineLikes);
  const captionStyleLift = liftMap(posts, (p) => p.captionStyle, baselineLikes);

  // Hashtag lift
  const tagPerf = new Map<string, number[]>();
  for (const p of posts) {
    const likeCount = p.metrics[0]?.likes ?? 0;
    for (const tag of p.hashtags ?? []) {
      const arr = tagPerf.get(tag) ?? [];
      arr.push(likeCount);
      tagPerf.set(tag, arr);
    }
  }
  const topHashtags = Array.from(tagPerf.entries())
    .filter(([, v]) => v.length >= 3)
    .map(([tag, v]) => ({ tag, lift: baselineLikes > 0 ? avg(v) / baselineLikes : 0 }))
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 12);

  // Best posting times (combine hour + dow)
  const slotGroups = new Map<string, number[]>();
  for (const p of posts) {
    if (p.postedHour === null || p.postedHour === undefined) continue;
    if (p.postedDow === null || p.postedDow === undefined) continue;
    const key = `${p.postedDow}-${p.postedHour}`;
    const arr = slotGroups.get(key) ?? [];
    arr.push(p.metrics[0]?.likes ?? 0);
    slotGroups.set(key, arr);
  }
  const bestPostingTimes = Array.from(slotGroups.entries())
    .map(([k, vals]) => {
      const [dow, hour] = k.split("-").map(Number);
      return { dow, hour, score: baselineLikes > 0 ? avg(vals) / baselineLikes : 0 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return {
    baseline: { avgLikes: baselineLikes, avgEngagement: baselineEng },
    carMakeLift,
    carModelLift,
    themeLift,
    hourLift,
    dowLift,
    captionStyleLift,
    topHashtags,
    bestPostingTimes,
    version: "v0.1.0",
  };
}

export type ScoringInput = {
  carMake?: string | null;
  carModel?: string | null;
  platform: string;
  aiScore?: number | null;
  engagement: { likes?: number | null; comments?: number | null; views?: number | null };
  isDuplicate?: boolean;
  withinCooldown?: boolean;
};

export type ScoringResult = {
  qualityScore: number;
  audienceFitScore: number;
  noveltyScore: number;
  predictedEngagement: number;
  finalScore: number;
  rationale: string;
  features: Record<string, number | string | boolean | null>;
};

/**
 * Score a discovered piece of content against the learned model.
 */
export function scoreDiscoveredContent(input: ScoringInput, model: LearnedModel | null): ScoringResult {
  const quality = clamp(input.aiScore ?? 50, 0, 100);

  // Audience fit — how well does this match what historically works?
  let fit = 50;
  const features: Record<string, number | string | boolean | null> = {
    carMake: input.carMake ?? null,
    carModel: input.carModel ?? null,
    platform: input.platform,
  };

  if (model && input.carMake && model.carMakeLift[input.carMake]) {
    const lift = model.carMakeLift[input.carMake];
    features.carMakeLift = lift;
    fit += (lift - 1) * 35; // ~+35 for 2× lift, -35 for half lift
  }
  if (model && input.carModel && model.carModelLift[input.carModel]) {
    const lift = model.carModelLift[input.carModel];
    features.carModelLift = lift;
    fit += (lift - 1) * 15;
  }
  fit = clamp(fit, 0, 100);

  // Novelty — penalise duplicates and items within the cooldown window.
  let novelty = 100;
  if (input.isDuplicate) {
    novelty -= 60;
    features.duplicatePenalty = -60;
  }
  if (input.withinCooldown) {
    novelty -= 30;
    features.cooldownPenalty = -30;
  }
  novelty = clamp(novelty, 0, 100);

  // Predicted engagement — combine source engagement + audience fit.
  const sourceEng = input.engagement.likes ?? 0;
  const engPct =
    sourceEng > 500_000 ? 95 :
    sourceEng > 100_000 ? 85 :
    sourceEng > 25_000 ? 70 :
    sourceEng > 5_000 ? 55 :
    sourceEng > 0 ? 40 :
    30;
  const predictedEngagement = clamp(engPct * 0.55 + fit * 0.45, 0, 100);

  const finalScore = clamp(
    quality * 0.35 + fit * 0.3 + predictedEngagement * 0.25 + novelty * 0.1,
    0,
    100,
  );

  const rationale = buildRationale({ quality, fit, novelty, predictedEngagement, input, model });

  return {
    qualityScore: quality,
    audienceFitScore: fit,
    noveltyScore: novelty,
    predictedEngagement,
    finalScore,
    rationale,
    features,
  };
}

function buildRationale(args: {
  quality: number;
  fit: number;
  novelty: number;
  predictedEngagement: number;
  input: ScoringInput;
  model: LearnedModel | null;
}): string {
  const parts: string[] = [];
  if (args.input.carMake && args.model?.carMakeLift[args.input.carMake]) {
    const lift = args.model.carMakeLift[args.input.carMake];
    const pct = ((lift - 1) * 100).toFixed(0);
    if (lift > 1.1) parts.push(`${args.input.carMake} content historically performs ${pct}% above your average.`);
    else if (lift < 0.9) parts.push(`${args.input.carMake} content historically underperforms by ${Math.abs(Number(pct))}%.`);
  }
  if (args.predictedEngagement >= 75) parts.push("Strong predicted engagement based on source performance.");
  if (args.novelty < 50) parts.push("Novelty penalty applied (duplicate or within repost cooldown).");
  if (args.quality >= 85) parts.push("High AI quality score.");
  if (parts.length === 0) parts.push("Composite score combines quality, audience fit, novelty, and predicted engagement.");
  return parts.join(" ");
}
