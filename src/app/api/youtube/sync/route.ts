import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectCar } from "@/lib/utils";
import { scoreContentWithAI } from "@/lib/openai";
import {
  getMockYoutubeItems,
  searchShorts,
  shouldUseMockYouTube,
  type YouTubeItem,
} from "@/lib/youtube";

type YouTubeConfig = { queries?: string[]; perQueryLimit?: number };

type SyncResult = {
  imported: number;
  skipped: number;
  queries: number;
  usingMock: boolean;
};

async function gatherItems(): Promise<{ items: YouTubeItem[]; queryCount: number; usingMock: boolean }> {
  if (shouldUseMockYouTube()) {
    const items = getMockYoutubeItems();
    return { items, queryCount: 1, usingMock: true };
  }

  const sources = await prisma.source.findMany({
    where: { platform: "youtube", enabled: true },
  });
  const queries = Array.from(
    new Set(sources.flatMap((s) => ((s.config as YouTubeConfig | null)?.queries ?? []))),
  );
  const perQueryLimit = Math.max(
    1,
    Math.min(20, (sources[0]?.config as YouTubeConfig | null)?.perQueryLimit ?? 10),
  );

  // Run searches in parallel but cap concurrency to a reasonable number to
  // stay polite under quota spikes.
  const lists = await Promise.all(
    queries.map((q) =>
      searchShorts(q, { limit: perQueryLimit }).catch(() => [] as YouTubeItem[]),
    ),
  );
  return { items: lists.flat(), queryCount: queries.length, usingMock: false };
}

async function runSync(): Promise<SyncResult> {
  const { items, queryCount, usingMock } = await gatherItems();
  const source = await prisma.source.findFirst({ where: { platform: "youtube" } });

  let imported = 0;
  let skipped = 0;

  // Dedup within the same sync batch (multiple queries can return the same id).
  const seenUrls = new Set<string>();
  for (const item of items) {
    if (seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);

    const existing = await prisma.discoveredContent.findUnique({ where: { url: item.url } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const captionish = [item.title, item.description].filter(Boolean).join(" — ");
    const car = detectCar(captionish);
    const ai = await scoreContentWithAI({
      caption: captionish,
      carMake: car.make ?? null,
      carModel: car.model ?? null,
      platform: "youtube",
      engagement: {
        likes: item.likeCount ?? null,
        comments: item.commentCount ?? null,
        views: item.viewCount ?? null,
      },
    });

    await prisma.discoveredContent.create({
      data: {
        sourceId: source?.id ?? null,
        platform: "youtube",
        url: item.url,
        originalAuthor: item.channelTitle ?? null,
        authorUrl: item.channelId ? `https://www.youtube.com/channel/${item.channelId}` : null,
        thumbnailUrl: item.thumbnailUrl ?? null,
        mediaUrl: item.thumbnailUrl ?? null,
        mediaType: "short",
        caption: captionish || null,
        carMake: car.make ?? null,
        carModel: car.model ?? null,
        likes: item.likeCount ?? null,
        comments: item.commentCount ?? null,
        views: item.viewCount ?? null,
        aiScore: ai.score,
        aiReason: ai.reason,
        status: "new",
        rightsStatus: "unknown",
        discoveredAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
      },
    });
    imported += 1;
  }

  return { imported, skipped, queries: queryCount, usingMock };
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
