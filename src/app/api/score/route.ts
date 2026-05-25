import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreDiscoveredContent, trainModel } from "@/lib/scoring";

/**
 * Rescore every piece of discovered content against the freshly-trained
 * performance model. Run this after syncing Instagram historical data or
 * after ingesting new posts.
 */
export async function POST() {
  const posts = await prisma.instagramPost.findMany({
    include: { metrics: { orderBy: { capturedAt: "desc" }, take: 1 } },
  });
  const model = trainModel(posts);

  const content = await prisma.discoveredContent.findMany({
    where: { status: { in: ["new", "shortlisted"] } },
  });

  let updated = 0;
  for (const c of content) {
    const result = scoreDiscoveredContent(
      {
        carMake: c.carMake,
        carModel: c.carModel,
        platform: c.platform,
        aiScore: c.aiScore,
        engagement: { likes: c.likes, comments: c.comments, views: c.views },
        isDuplicate: Boolean(c.duplicateOfId),
        withinCooldown: c.cooldownUntil ? c.cooldownUntil > new Date() : false,
      },
      model,
    );

    await prisma.contentScore.upsert({
      where: { contentId: c.id },
      update: {
        qualityScore: result.qualityScore,
        audienceFitScore: result.audienceFitScore,
        noveltyScore: result.noveltyScore,
        predictedEngagement: result.predictedEngagement,
        finalScore: result.finalScore,
        rationale: result.rationale,
        features: result.features as object,
      },
      create: {
        contentId: c.id,
        qualityScore: result.qualityScore,
        audienceFitScore: result.audienceFitScore,
        noveltyScore: result.noveltyScore,
        predictedEngagement: result.predictedEngagement,
        finalScore: result.finalScore,
        rationale: result.rationale,
        features: result.features as object,
      },
    });

    await prisma.discoveredContent.update({
      where: { id: c.id },
      data: { aiScore: result.finalScore, aiReason: result.rationale },
    });

    updated += 1;
  }

  return NextResponse.json({ updated, modelVersion: model.version });
}
