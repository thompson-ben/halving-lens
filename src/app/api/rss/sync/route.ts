import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectCar } from "@/lib/utils";
import { scoreContentWithAI } from "@/lib/openai";
import { extractOgImage, fetchFeed, getMockFeedItems, shouldUseMockRSS, type RSSItem } from "@/lib/rss";

type FeedConfig = { feeds?: string[] };

type SyncResult = {
  imported: number;
  skipped: number;
  feeds: number;
  usingMock: boolean;
};

async function gatherItems(): Promise<{ items: RSSItem[]; feedCount: number; usingMock: boolean }> {
  if (shouldUseMockRSS()) {
    const items = getMockFeedItems();
    return { items, feedCount: new Set(items.map((i) => i.feedUrl)).size, usingMock: true };
  }

  const sources = await prisma.source.findMany({
    where: { platform: "rss", enabled: true },
  });
  const feeds = sources.flatMap((s) => ((s.config as FeedConfig | null)?.feeds ?? []));

  const lists = await Promise.all(feeds.map((url) => fetchFeed(url)));
  return { items: lists.flat(), feedCount: feeds.length, usingMock: false };
}

async function runSync(): Promise<SyncResult> {
  const { items, feedCount, usingMock } = await gatherItems();
  const source = await prisma.source.findFirst({ where: { platform: "rss" } });

  let imported = 0;
  let skipped = 0;

  for (const item of items) {
    const existing = await prisma.discoveredContent.findUnique({ where: { url: item.link } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const thumbnail = item.thumbnailUrl ?? (await extractOgImage(item.link));
    const captionish = [item.title, item.summary].filter(Boolean).join(" — ");
    const car = detectCar(captionish);
    const ai = await scoreContentWithAI({
      caption: captionish,
      carMake: car.make ?? null,
      carModel: car.model ?? null,
      platform: "rss",
      engagement: {},
    });

    await prisma.discoveredContent.create({
      data: {
        sourceId: source?.id ?? null,
        platform: "rss",
        url: item.link,
        originalAuthor: item.author ?? item.feedTitle,
        authorUrl: item.feedUrl,
        thumbnailUrl: thumbnail ?? null,
        mediaUrl: thumbnail ?? null,
        mediaType: "image",
        caption: captionish || null,
        carMake: car.make ?? null,
        carModel: car.model ?? null,
        aiScore: ai.score,
        aiReason: ai.reason,
        status: "new",
        rightsStatus: "unknown",
        discoveredAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      },
    });
    imported += 1;
  }

  return { imported, skipped, feeds: feedCount, usingMock };
}

export async function POST() {
  const result = await runSync();
  return NextResponse.json(result);
}

// Vercel cron sends a GET request with `Authorization: Bearer <CRON_SECRET>`.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runSync();
  return NextResponse.json(result);
}
