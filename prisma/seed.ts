/* eslint-disable no-console */
import { PrismaClient, Prisma } from "@prisma/client";
import { mockDiscoveredContent, mockInstagramPosts, mockCompetitors } from "../src/lib/mockData";

const prisma = new PrismaClient();

type SourceSeed = {
  platform: string;
  label: string;
  enabled: boolean;
  config?: Record<string, unknown>;
};

const DEFAULT_SOURCES: SourceSeed[] = [
  { platform: "instagram", label: "Instagram", enabled: true },
  { platform: "tiktok", label: "TikTok", enabled: false },
<<<<<<< HEAD
  { platform: "youtube", label: "YouTube Shorts", enabled: false },
  {
    platform: "twitter",
    label: "X / Twitter",
    enabled: false,
    // Stored on the Source row so they're editable per environment.
    // Each query is wrapped with `has:media -is:retweet -is:reply lang:en`
    // by the connector, so the operator only writes the topic part.
    config: {
      queries: [
        "Ferrari OR Lamborghini OR Pagani",
        "Porsche GT3 OR Porsche 911 GT3 RS",
        "McLaren OR Bugatti OR Koenigsegg",
      ],
      perQueryLimit: 20,
    },
  },
  { platform: "rss", label: "Car Blogs (RSS)", enabled: true },
=======
  {
    platform: "youtube",
    label: "YouTube Shorts",
    enabled: false,
    // Search queries are stored on the Source row so they're editable per
    // environment without a code deploy. Quota cost: 100 units per query
    // (search) + ~1 unit per result (videos.list batch).
    config: {
      queries: [
        "Ferrari supercar shorts",
        "Lamborghini supercar shorts",
        "Porsche GT3 shorts",
        "McLaren supercar shorts",
        "Bugatti shorts",
      ],
      perQueryLimit: 10,
    },
  },
  { platform: "twitter", label: "X / Twitter", enabled: false },
  {
    platform: "rss",
    label: "Car Blogs (RSS)",
    enabled: true,
    // Feed URLs are stored on the Source row so they're editable without a
    // code deploy. The defaults below cover the major editorial outlets.
    config: {
      feeds: [
        "https://www.carscoops.com/feed/",
        "https://www.motor1.com/rss/news/all/",
        "https://www.autoblog.com/rss.xml",
      ],
    },
  },
>>>>>>> origin/main
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
    const config = src.config ? { config: src.config as Prisma.InputJsonValue } : {};
    await prisma.source.upsert({
      where: { platform_label: { platform: src.platform, label: src.label } },
      update: { enabled: src.enabled, ...config },
      create: {
        platform: src.platform,
        label: src.label,
        enabled: src.enabled,
        ...config,
      },
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
