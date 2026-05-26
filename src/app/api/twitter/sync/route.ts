import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectCar } from "@/lib/utils";
import { scoreContentWithAI } from "@/lib/openai";
import {
  getMockTwitterItems,
  searchMediaTweets,
  shouldUseMockTwitter,
  type TwitterMediaTweet,
} from "@/lib/twitter";

type TwitterConfig = { queries?: string[]; perQueryLimit?: number };

type SyncResult = {
  imported: number;
  skipped: number;
  queries: number;
  usingMock: boolean;
};

async function gatherItems(): Promise<{ items: TwitterMediaTweet[]; queryCount: number; usingMock: boolean }> {
  if (shouldUseMockTwitter()) {
    return { items: getMockTwitterItems(), queryCount: 1, usingMock: true };
  }

  const sources = await prisma.source.findMany({
    where: { platform: "twitter", enabled: true },
  });
  const queries = Array.from(
    new Set(sources.flatMap((s) => ((s.config as TwitterConfig | null)?.queries ?? []))),
  );
  const perQueryLimit = Math.max(
    10,
    Math.min(100, (sources[0]?.config as TwitterConfig | null)?.perQueryLimit ?? 20),
  );

  const lists = await Promise.all(
    queries.map((q) =>
      searchMediaTweets(q, perQueryLimit).catch(() => [] as TwitterMediaTweet[]),
    ),
  );
  return { items: lists.flat(), queryCount: queries.length, usingMock: false };
}

async function runSync(): Promise<SyncResult> {
  const { items, queryCount, usingMock } = await gatherItems();
  const source = await prisma.source.findFirst({ where: { platform: "twitter" } });

  let imported = 0;
  let skipped = 0;
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);

    const existing = await prisma.discoveredContent.findUnique({ where: { url: item.url } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const car = detectCar(item.text);
    const ai = await scoreContentWithAI({
      caption: item.text,
      carMake: car.make ?? null,
      carModel: car.model ?? null,
      platform: "twitter",
      engagement: {
        likes: item.likeCount ?? null,
        comments: item.replyCount ?? null,
        views: item.viewCount ?? null,
      },
    });

    await prisma.discoveredContent.create({
      data: {
        sourceId: source?.id ?? null,
        platform: "twitter",
        url: item.url,
        originalAuthor: item.authorUsername ? `@${item.authorUsername}` : item.authorName ?? null,
        authorUrl: item.authorUsername ? `https://x.com/${item.authorUsername}` : null,
        thumbnailUrl: item.thumbnailUrl ?? null,
        mediaUrl: item.thumbnailUrl ?? null,
        mediaType: "image",
        caption: item.text,
        carMake: car.make ?? null,
        carModel: car.model ?? null,
        likes: item.likeCount ?? null,
        comments: item.replyCount ?? null,
        views: item.viewCount ?? null,
        shares: item.retweetCount ?? null,
        aiScore: ai.score,
        aiReason: ai.reason,
        status: "new",
        rightsStatus: "unknown",
        discoveredAt: item.createdAt ? new Date(item.createdAt) : new Date(),
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
