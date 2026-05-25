import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.competitorAccount.findMany({ orderBy: { followers: "desc" } });
  return NextResponse.json({ items });
}

const PostSchema = z.object({
  platform: z.string(),
  handle: z.string(),
  url: z.string().optional(),
  followers: z.number().int().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const item = await prisma.competitorAccount.upsert({
    where: { platform_handle: { platform: parsed.data.platform, handle: parsed.data.handle } },
    update: { ...parsed.data, active: true },
    create: { ...parsed.data },
  });
  return NextResponse.json({ item });
}
