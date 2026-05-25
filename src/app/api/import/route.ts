import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { detectCar } from "@/lib/utils";
import { scoreContentWithAI } from "@/lib/openai";

const ImportSchema = z.object({
  url: z.string().url(),
  originalAuthor: z.string().optional(),
  caption: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
});

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("x.com") || u.includes("twitter.com")) return "twitter";
  return "manual";
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = ImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const platform = detectPlatform(parsed.data.url);
  const car = detectCar(parsed.data.caption);

  const ai = await scoreContentWithAI({
    caption: parsed.data.caption ?? null,
    carMake: car.make ?? null,
    carModel: car.model ?? null,
    platform,
    engagement: {},
  });

  const existing = await prisma.discoveredContent.findUnique({ where: { url: parsed.data.url } });
  if (existing) {
    return NextResponse.json({ item: existing, duplicate: true });
  }

  const source = await prisma.source.findFirst({ where: { platform: "manual" } });

  const item = await prisma.discoveredContent.create({
    data: {
      sourceId: source?.id ?? null,
      platform,
      url: parsed.data.url,
      originalAuthor: parsed.data.originalAuthor ?? null,
      caption: parsed.data.caption ?? null,
      thumbnailUrl: parsed.data.thumbnailUrl ?? null,
      carMake: car.make ?? null,
      carModel: car.model ?? null,
      aiScore: ai.score,
      aiReason: ai.reason,
      status: "new",
      rightsStatus: "unknown",
    },
  });

  return NextResponse.json({ item, duplicate: false });
}
