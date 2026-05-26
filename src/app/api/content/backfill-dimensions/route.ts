import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { probeImageDimensions } from "@/lib/imageDimensions";

export const dynamic = "force-dynamic";

// Walk every DiscoveredContent without dimensions and probe the source
// image. Idempotent — safe to re-run; items that already have width/height
// are skipped. Capped at a reasonable batch size per call so the route
// doesn't time out on Vercel (max 300s on Pro).
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(500, Number(searchParams.get("limit") ?? 100)));

  const candidates = await prisma.discoveredContent.findMany({
    where: {
      OR: [{ width: null }, { height: null }],
      mediaType: { not: "video" },
    },
    select: { id: true, mediaUrl: true, thumbnailUrl: true },
    take: limit,
    orderBy: { discoveredAt: "desc" },
  });

  let probed = 0;
  let succeeded = 0;
  let failed = 0;
  for (const c of candidates) {
    probed += 1;
    const dims = await probeImageDimensions(c.mediaUrl ?? c.thumbnailUrl);
    if (dims) {
      await prisma.discoveredContent.update({
        where: { id: c.id },
        data: { width: dims.width, height: dims.height },
      });
      succeeded += 1;
    } else {
      failed += 1;
    }
  }

  const remaining = await prisma.discoveredContent.count({
    where: { OR: [{ width: null }, { height: null }], mediaType: { not: "video" } },
  });

  return NextResponse.json({ probed, succeeded, failed, remaining, batchLimit: limit });
}
