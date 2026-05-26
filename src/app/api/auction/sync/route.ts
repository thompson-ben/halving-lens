import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectCar } from "@/lib/utils";
import { scoreContentWithAI } from "@/lib/openai";
import {
  KNOWN_FEEDS,
  extractOgImage,
  fetchAuctionFeed,
  getMockAuctionItems,
  shouldUseMockAuction,
  type AuctionItem,
} from "@/lib/auction";

type AuctionConfig = { feeds?: string[] };

type SyncResult = {
  imported: number;
  skipped: number;
  feeds: number;
  usingMock: boolean;
};

async function gatherItems(): Promise<{ items: AuctionItem[]; feedCount: number; usingMock: boolean }> {
  if (shouldUseMockAuction()) {
    const items = getMockAuctionItems();
    return { items, feedCount: new Set(items.map((i) => i.feedUrl)).size, usingMock: true };
  }

  const sources = await prisma.source.findMany({
    where: { platform: "auction", enabled: true },
  });
  const configured = sources.flatMap((s) => ((s.config as AuctionConfig | null)?.feeds ?? []));
  // Fall back to KNOWN_FEEDS when an enabled source has no feeds configured —
  // first-run experience without making the operator type URLs.
  const feeds = Array.from(
    new Set(configured.length > 0 ? configured : KNOWN_FEEDS.map((f) => f.feedUrl)),
  );

  const lists = await Promise.all(feeds.map((url) => fetchAuctionFeed(url)));
  return { items: lists.flat(), feedCount: feeds.length, usingMock: false };
}

async function runSync(): Promise<SyncResult> {
  const { items, feedCount, usingMock } = await gatherItems();
  const source = await prisma.source.findFirst({ where: { platform: "auction" } });

  let imported = 0;
  let skipped = 0;

  for (const item of items) {
    const existing = await prisma.discoveredContent.findUnique({ where: { url: item.url } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const thumbnail = item.thumbnailUrl ?? (await extractOgImage(item.url));
    const captionish = [item.title, item.summary].filter(Boolean).join(" — ");
    const car = detectCar(captionish);

    const ai = await scoreContentWithAI({
      caption: captionish,
      carMake: car.make ?? null,
      carModel: car.model ?? null,
      platform: "auction",
      engagement: {},
    });

    await prisma.discoveredContent.create({
      data: {
        sourceId: source?.id ?? null,
        platform: "auction",
        url: item.url,
        originalAuthor: item.house,
        authorUrl: item.feedUrl,
        thumbnailUrl: thumbnail ?? null,
        mediaUrl: thumbnail ?? null,
        mediaType: "image",
        caption: captionish || null,
        carMake: car.make ?? null,
        carModel: car.model ?? null,
        carYear: item.year ?? null,
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
