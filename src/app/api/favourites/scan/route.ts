import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { detectCar } from "@/lib/utils";
import { scoreContentWithAI } from "@/lib/openai";
import { embedText, findBestMatch, type TopPostRef } from "@/lib/embeddings";
import { probeImageDimensions } from "@/lib/imageDimensions";
import { autoShortlistRun } from "@/lib/autoShortlist";
import {
  businessDiscovery,
  type IGBusinessDiscovery,
  type IGBusinessDiscoveryMedia,
} from "@/lib/instagram";
import { env } from "@/lib/env";
import { hasResolvedInstagramCreds } from "@/lib/instagramCreds";

type ScanReport = {
  scanned: number;
  imported: number;
  skipped: number;
  usingMock: boolean;
  notes: string[];
  autoShortlisted: number;
};

// Mock fallback: synthesises a plausible business_discovery response per
// favourite so the scan flow remains demonstrable without IG credentials.
function mockProfileForHandle(handle: string, fallbackFollowers: number | null): IGBusinessDiscovery {
  const now = Date.now();
  const followers = fallbackFollowers ?? 1_500_000;
  // Build 6 mock recent posts so postsPerWeek / averages have something to chew on.
  const media: IGBusinessDiscoveryMedia[] = Array.from({ length: 6 }, (_, i) => ({
    id: `mock_${handle}_${now}_${i}`,
    caption: `Latest from @${handle} — Ferrari SF90 cruising the coast.`,
    media_type: i % 2 === 0 ? "IMAGE" : "VIDEO",
    media_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=70",
    permalink: `https://www.instagram.com/${handle}/?mock=${now}-${i}`,
    thumbnail_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=70",
    timestamp: new Date(now - i * 24 * 60 * 60 * 1000).toISOString(),
    like_count: 20_000 + i * 1_500,
    comments_count: 280 + i * 12,
  }));
  return {
    username: handle,
    name: handle,
    biography: "Mock profile (USE_MOCK_DATA=true or IG creds missing).",
    profile_picture_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=200&q=70",
    followers_count: followers,
    follows_count: 250,
    media_count: 8_000,
    media,
  };
}

function computeSignals(media: IGBusinessDiscoveryMedia[], followers: number | null) {
  if (media.length === 0) {
    return { postsPerWeek: null, avgLikes: null, avgComments: null, engagementVelocity: null, topPost: null };
  }

  const timestamps = media
    .map((m) => new Date(m.timestamp).getTime())
    .sort((a, b) => a - b);
  const spanDays = Math.max(1, (timestamps[timestamps.length - 1] - timestamps[0]) / (24 * 60 * 60 * 1000));
  const postsPerWeek = (media.length / spanDays) * 7;

  const likes = media.map((m) => m.like_count ?? 0);
  const comments = media.map((m) => m.comments_count ?? 0);
  const avgLikes = likes.reduce((a, b) => a + b, 0) / likes.length;
  const avgComments = comments.reduce((a, b) => a + b, 0) / comments.length;

  const engagementVelocity = followers && followers > 0
    ? (avgLikes + avgComments) / followers
    : null;

  // "Top post" snapshot for the favourite — most-liked of the scanned window.
  const top = [...media].sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))[0];
  const topPost = top ? {
    id: top.id,
    permalink: top.permalink ?? null,
    thumbnailUrl: top.thumbnail_url ?? top.media_url ?? null,
    caption: top.caption ?? null,
    likeCount: top.like_count ?? null,
    commentCount: top.comments_count ?? null,
    timestamp: top.timestamp,
  } : null;

  return {
    postsPerWeek: Number(postsPerWeek.toFixed(2)),
    avgLikes: Math.round(avgLikes),
    avgComments: Math.round(avgComments),
    engagementVelocity: engagementVelocity != null ? Number(engagementVelocity.toFixed(5)) : null,
    topPost,
  };
}

async function loadTopPerformerRefs(): Promise<TopPostRef[]> {
  const posts = await prisma.instagramPost.findMany({
    where: { topPerformer: true, NOT: { captionEmbedding: { isEmpty: true } } },
    select: { id: true, captionEmbedding: true },
  });
  return posts
    .filter((p) => p.captionEmbedding.length > 0)
    .map((p) => ({ id: p.id, embedding: p.captionEmbedding }));
}

async function ingestMedia(
  handle: string,
  media: IGBusinessDiscoveryMedia[],
): Promise<{ imported: number; skipped: number }> {
  const source = await prisma.source.findFirst({ where: { platform: "instagram" } });
  // Loaded once per scan — top performers don't shift mid-scan, and we'd
  // otherwise repeat the same query for every imported piece of content.
  const topRefs = await loadTopPerformerRefs();
  let imported = 0;
  let skipped = 0;

  for (const m of media) {
    const url = m.permalink ?? `https://www.instagram.com/p/${m.id}`;
    const existing = await prisma.discoveredContent.findUnique({ where: { url } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const car = detectCar(m.caption);
    const ai = await scoreContentWithAI({
      caption: m.caption ?? null,
      carMake: car.make ?? null,
      carModel: car.model ?? null,
      platform: "instagram",
      engagement: { likes: m.like_count ?? null, comments: m.comments_count ?? null },
    });

    const reason = ai.reason
      ? `${ai.reason} (from favourite @${handle})`
      : `Surfaced from favourite @${handle}.`;

    // Best-effort DNA scoring on ingest so new items show up in the
    // "Similar to top performers" tab immediately. Falls back to null
    // when there are no top-performer embeddings to compare against yet.
    let captionEmbedding: number[] = [];
    let bestSimilarityScore: number | null = null;
    let similarToPostId: string | null = null;
    if (m.caption) {
      const vec = await embedText(m.caption);
      if (vec) {
        captionEmbedding = vec;
        const match = findBestMatch(vec, topRefs);
        if (match) {
          bestSimilarityScore = match.score;
          similarToPostId = match.postId;
        }
      }
    }

    // Probe image dimensions on ingest. We probe the media_url (not the
    // thumbnail, which is a CDN-resized variant). Skip for video — the
    // probe would download the moov atom and we don't filter video by
    // aspect anyway.
    const probeUrl = m.media_type?.toLowerCase() === "video" ? null : (m.media_url ?? m.thumbnail_url ?? null);
    const dims = await probeImageDimensions(probeUrl);

    await prisma.discoveredContent.create({
      data: {
        sourceId: source?.id ?? null,
        platform: "instagram",
        url,
        originalAuthor: `@${handle}`,
        authorUrl: `https://www.instagram.com/${handle}`,
        thumbnailUrl: m.thumbnail_url ?? m.media_url ?? null,
        mediaUrl: m.media_url ?? null,
        mediaType: m.media_type?.toLowerCase() ?? "image",
        caption: m.caption ?? null,
        carMake: car.make ?? null,
        carModel: car.model ?? null,
        likes: m.like_count ?? null,
        comments: m.comments_count ?? null,
        aiScore: ai.score,
        aiReason: reason,
        status: "new",
        rightsStatus: "unknown",
        captionEmbedding,
        bestSimilarityScore,
        similarToPostId,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
        discoveredAt: new Date(m.timestamp),
      },
    });
    imported += 1;
  }

  return { imported, skipped };
}

async function runScan(): Promise<ScanReport> {
  const favourites = await prisma.favouriteAccount.findMany({ where: { active: true } });
  const usingMock = env.useMockData || !(await hasResolvedInstagramCreds());

  let imported = 0;
  let skipped = 0;
  const notes: string[] = [];

  for (const f of favourites) {
    const profile = usingMock
      ? mockProfileForHandle(f.handle, f.followersCount)
      : await businessDiscovery(f.handle);

    if (!profile) {
      notes.push(`@${f.handle}: business_discovery returned no data (private account or not a Business / Creator profile)`);
      await prisma.favouriteAccount.update({
        where: { id: f.id },
        data: { lastScannedAt: new Date() },
      });
      continue;
    }

    const signals = computeSignals(profile.media, profile.followers_count ?? f.followersCount ?? null);

    await prisma.favouriteAccount.update({
      where: { id: f.id },
      data: {
        displayName: profile.name ?? f.displayName,
        bio: profile.biography ?? f.bio,
        profilePicUrl: profile.profile_picture_url ?? f.profilePicUrl,
        followersCount: profile.followers_count ?? f.followersCount,
        followsCount: profile.follows_count ?? f.followsCount,
        mediaCount: profile.media_count ?? f.mediaCount,
        postsPerWeek: signals.postsPerWeek,
        avgLikes: signals.avgLikes,
        avgComments: signals.avgComments,
        engagementVelocity: signals.engagementVelocity,
        topPost: (signals.topPost ?? undefined) as Prisma.InputJsonValue | undefined,
        lastScannedAt: new Date(),
      },
    });

    const r = await ingestMedia(f.handle, profile.media);
    imported += r.imported;
    skipped += r.skipped;
  }

  // After ingest, run the auto-shortlist pass once. It's a no-op when the
  // setting is off; otherwise it promotes any new items above the
  // composite threshold so the operator opens Today's Picks to a curated
  // shortlist instead of an untriaged firehose.
  const settings = await loadAutoShortlistSettings();
  const auto = await autoShortlistRun({ settings, dryRun: false });
  if (auto.ran) {
    notes.push(`Auto-shortlisted ${auto.shortlisted} (threshold ${auto.threshold}).`);
  }

  return {
    scanned: favourites.length,
    imported,
    skipped,
    usingMock,
    notes,
    autoShortlisted: auto.ran ? auto.shortlisted : 0,
  };
}

async function loadAutoShortlistSettings() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["auto_shortlist_enabled", "auto_shortlist_threshold"] } },
  });
  const out = new Map(rows.map((r) => [r.key, r.value]));
  return {
    enabled: Boolean(out.get("auto_shortlist_enabled") ?? false),
    threshold: Number(out.get("auto_shortlist_threshold") ?? 75),
  };
}

export async function POST() {
  const report = await runScan();
  return NextResponse.json(report);
}

// Vercel cron sends a GET request with `Authorization: Bearer <CRON_SECRET>`.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await runScan();
  return NextResponse.json(report);
}
