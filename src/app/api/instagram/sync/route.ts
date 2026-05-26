import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchInstagramPosts, fetchPostInsights } from "@/lib/instagram";
import { detectCar, extractHashtags } from "@/lib/utils";
import { hasInstagramCredentials } from "@/lib/env";

/**
 * Pull (or refresh) historical Instagram posts and their insights into our
 * database. Safe to call repeatedly — uses upserts.
 *
 * When credentials are missing or USE_MOCK_DATA is set, the underlying
 * library returns mock data, so this endpoint still demonstrates the flow.
 */
async function runSync() {
  const posts = await fetchInstagramPosts(60);

  let imported = 0;
  for (const p of posts) {
    const car = detectCar(p.caption);
    const hashtags = extractHashtags(p.caption);
    const ts = new Date(p.timestamp);
    const insights = await fetchPostInsights(p.id, p.media_type);

    await prisma.instagramPost.upsert({
      where: { id: p.id },
      update: {
        caption: p.caption ?? null,
        mediaType: p.media_type,
        permalink: p.permalink ?? null,
        mediaUrl: p.media_url ?? null,
        thumbnailUrl: p.thumbnail_url ?? p.media_url ?? null,
        timestamp: ts,
        carMake: car.make ?? null,
        carModel: car.model ?? null,
        hashtags,
        postedHour: ts.getHours(),
        postedDow: ts.getDay(),
      },
      create: {
        id: p.id,
        caption: p.caption ?? null,
        mediaType: p.media_type,
        permalink: p.permalink ?? null,
        mediaUrl: p.media_url ?? null,
        thumbnailUrl: p.thumbnail_url ?? p.media_url ?? null,
        timestamp: ts,
        carMake: car.make ?? null,
        carModel: car.model ?? null,
        hashtags,
        postedHour: ts.getHours(),
        postedDow: ts.getDay(),
      },
    });

    await prisma.postMetric.create({
      data: {
        postId: p.id,
        likes: p.like_count ?? 0,
        comments: p.comments_count ?? 0,
        saves: insights.saved ?? null,
        shares: insights.shares ?? null,
        reach: insights.reach ?? null,
        impressions: insights.impressions ?? null,
        videoViews: insights.video_views ?? null,
        engagementRate:
          insights.reach && p.like_count !== undefined
            ? ((p.like_count + (p.comments_count ?? 0)) / insights.reach) * 100
            : null,
      },
    });

    imported += 1;
  }

  return {
    imported,
    usingMock: !hasInstagramCredentials(),
  };
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
