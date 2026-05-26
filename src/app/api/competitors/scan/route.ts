import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectCar } from "@/lib/utils";
import { scoreContentWithAI } from "@/lib/openai";
import { businessDiscovery, type IGBusinessDiscoveryMedia } from "@/lib/instagram";
import { env, hasInstagramCredentials } from "@/lib/env";

type ScanReport = {
  scanned: number;
  imported: number;
  skipped: number;
  unsupported: number;
  usingMock: boolean;
  notes: string[];
};

// Mock fallback: synthesises a plausible recent post per competitor so the
// scan flow is exercisable without IG credentials. Tagged so the operator
// can tell at a glance that a scan ran without live discovery.
function mockMediaForHandle(handle: string): IGBusinessDiscoveryMedia[] {
  const now = Date.now();
  return [
    {
      id: `mock_${handle}_${now}`,
      caption: `Latest from @${handle} — Ferrari SF90 cruising the coast.`,
      media_type: "IMAGE",
      media_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=70",
      permalink: `https://www.instagram.com/${handle}/?mock=${now}`,
      thumbnail_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=70",
      timestamp: new Date().toISOString(),
      like_count: 24_000,
      comments_count: 340,
    },
  ];
}

async function ingestForCompetitor(
  competitorId: string,
  handle: string,
  media: IGBusinessDiscoveryMedia[],
): Promise<{ imported: number; skipped: number }> {
  const source = await prisma.source.findFirst({ where: { platform: "instagram" } });
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
      ? `${ai.reason} (from watched competitor @${handle})`
      : `Surfaced from watched competitor @${handle}.`;

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
        discoveredAt: new Date(m.timestamp),
      },
    });
    imported += 1;
  }

  // Touch lastCheckedAt so the operator can see when each competitor was
  // last walked, even when nothing new was imported.
  await prisma.competitorAccount.update({
    where: { id: competitorId },
    data: { lastCheckedAt: new Date() },
  });

  return { imported, skipped };
}

async function runScan(): Promise<ScanReport> {
  const competitors = await prisma.competitorAccount.findMany({ where: { active: true } });
  const usingMock = env.useMockData || !hasInstagramCredentials();

  let imported = 0;
  let skipped = 0;
  let unsupported = 0;
  const notes: string[] = [];

  for (const c of competitors) {
    if (c.platform !== "instagram") {
      // TikTok / YouTube / Twitter competitor scans land alongside their
      // respective connectors in follow-up PRs. Surface them in the report
      // so the operator knows what was skipped and why.
      unsupported += 1;
      notes.push(`@${c.handle}: ${c.platform} scan not yet wired up`);
      continue;
    }

    const media = usingMock
      ? mockMediaForHandle(c.handle)
      : (await businessDiscovery(c.handle))?.media ?? null;

    if (media === null) {
      notes.push(`@${c.handle}: business_discovery returned no data (private account or not a Business / Creator profile)`);
      await prisma.competitorAccount.update({
        where: { id: c.id },
        data: { lastCheckedAt: new Date() },
      });
      continue;
    }

    const r = await ingestForCompetitor(c.id, c.handle, media);
    imported += r.imported;
    skipped += r.skipped;
  }

  return {
    scanned: competitors.length,
    imported,
    skipped,
    unsupported,
    usingMock,
    notes,
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
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await runScan();
  return NextResponse.json(report);
}
