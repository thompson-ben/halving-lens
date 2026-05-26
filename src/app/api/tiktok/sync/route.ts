import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectCar } from "@/lib/utils";
import { scoreContentWithAI } from "@/lib/openai";
import {
  fetchUserVideos,
  getMockTikTokItems,
  shouldUseMockTikTok,
  type TikTokVideo,
} from "@/lib/tiktok";

type SyncResult = {
  imported: number;
  skipped: number;
  usingMock: boolean;
};

async function gatherItems(): Promise<{ items: TikTokVideo[]; usingMock: boolean }> {
  if (shouldUseMockTikTok()) {
    return { items: getMockTikTokItems(), usingMock: true };
  }
  try {
    const items = await fetchUserVideos(20);
    return { items, usingMock: false };
  } catch {
    return { items: [], usingMock: false };
  }
}

async function runSync(): Promise<SyncResult> {
  const { items, usingMock } = await gatherItems();
  const source = await prisma.source.findFirst({ where: { platform: "tiktok" } });

  let imported = 0;
  let skipped = 0;

  for (const item of items) {
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
      platform: "tiktok",
      engagement: {
        likes: item.likeCount ?? null,
        comments: item.commentCount ?? null,
        views: item.viewCount ?? null,
      },
    });

    await prisma.discoveredContent.create({
      data: {
        sourceId: source?.id ?? null,
        platform: "tiktok",
        url: item.url,
        originalAuthor: item.username ? `@${item.username}` : null,
        authorUrl: item.username ? `https://www.tiktok.com/@${item.username}` : null,
        thumbnailUrl: item.thumbnailUrl ?? null,
        mediaUrl: item.thumbnailUrl ?? null,
        mediaType: "video",
        caption: captionish || null,
        carMake: car.make ?? null,
        carModel: car.model ?? null,
        likes: item.likeCount ?? null,
        comments: item.commentCount ?? null,
        views: item.viewCount ?? null,
        shares: item.shareCount ?? null,
        aiScore: ai.score,
        aiReason: ai.reason,
        status: "new",
        rightsStatus: "unknown",
        discoveredAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      },
    });
    imported += 1;
  }

  return { imported, skipped, usingMock };
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
