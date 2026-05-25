/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import { mockDiscoveredContent, mockInstagramPosts, mockCompetitors } from "../src/lib/mockData";

const prisma = new PrismaClient();

const DEFAULT_SOURCES = [
  { platform: "instagram", label: "Instagram", enabled: true },
  { platform: "tiktok", label: "TikTok", enabled: false },
  { platform: "youtube", label: "YouTube Shorts", enabled: false },
  { platform: "twitter", label: "X / Twitter", enabled: false },
  { platform: "rss", label: "Car Blogs (RSS)", enabled: true },
  { platform: "auction", label: "Auction Sites", enabled: false },
  { platform: "manual", label: "Manual URL Import", enabled: true },
];

const DEFAULT_SETTINGS: Array<{ key: string; value: unknown }> = [
  { key: "auto_post_enabled", value: false },
  { key: "default_caption_style", value: "luxury" },
  { key: "min_quality_score", value: 65 },
  { key: "repost_cooldown_days", value: 30 },
  { key: "timezone", value: "Europe/London" },
];

async function main() {
  console.log("→ Seeding sources…");
  for (const src of DEFAULT_SOURCES) {
    await prisma.source.upsert({
      where: { platform_label: { platform: src.platform, label: src.label } },
      update: { enabled: src.enabled },
      create: src,
    });
  }

  console.log("→ Seeding settings…");
  for (const setting of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value as object },
      create: { key: setting.key, value: setting.value as object },
    });
  }

  console.log("→ Seeding discovered content…");
  for (const item of mockDiscoveredContent) {
    const source = await prisma.source.findFirst({ where: { platform: item.platform } });
    await prisma.discoveredContent.upsert({
      where: { url: item.url },
      update: {},
      create: {
        ...item,
        sourceId: source?.id ?? null,
      },
    });
  }

  console.log("→ Seeding historical Instagram posts…");
  for (const post of mockInstagramPosts) {
    await prisma.instagramPost.upsert({
      where: { id: post.id },
      update: {},
      create: {
        id: post.id,
        caption: post.caption,
        mediaType: post.mediaType,
        permalink: post.permalink,
        mediaUrl: post.mediaUrl,
        thumbnailUrl: post.thumbnailUrl,
        timestamp: post.timestamp,
        carMake: post.carMake,
        carModel: post.carModel,
        theme: post.theme,
        captionStyle: post.captionStyle,
        hashtags: post.hashtags,
        postedHour: post.postedHour,
        postedDow: post.postedDow,
        metrics: {
          create: {
            likes: post.likes,
            comments: post.comments,
            saves: post.saves,
            shares: post.shares,
            reach: post.reach,
            impressions: post.impressions,
            videoViews: post.videoViews,
            engagementRate: post.engagementRate,
          },
        },
      },
    });
  }

  console.log("→ Seeding competitor accounts…");
  for (const c of mockCompetitors) {
    await prisma.competitorAccount.upsert({
      where: { platform_handle: { platform: c.platform, handle: c.handle } },
      update: {},
      create: c,
    });
  }

  console.log("✓ Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
