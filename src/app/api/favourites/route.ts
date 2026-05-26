import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.favouriteAccount.findMany({
    orderBy: [{ active: "desc" }, { followersCount: "desc" }],
  });
  return NextResponse.json({ items });
}

const PostSchema = z.object({
  handle: z.string().min(1).transform((s) => s.replace(/^@+/, "")),
  displayName: z.string().optional(),
  url: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  followersCount: z.number().int().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const item = await prisma.favouriteAccount.upsert({
    where: {
      platform_handle: { platform: "instagram", handle: parsed.data.handle },
    },
    update: {
      displayName: parsed.data.displayName,
      url: parsed.data.url ?? `https://www.instagram.com/${parsed.data.handle}`,
      tags: parsed.data.tags ?? [],
      notes: parsed.data.notes,
      followersCount: parsed.data.followersCount,
      active: true,
    },
    create: {
      platform: "instagram",
      handle: parsed.data.handle,
      displayName: parsed.data.displayName,
      url: parsed.data.url ?? `https://www.instagram.com/${parsed.data.handle}`,
      tags: parsed.data.tags ?? [],
      notes: parsed.data.notes,
      followersCount: parsed.data.followersCount,
      discoveredFrom: "manual",
    },
  });
  return NextResponse.json({ item });
}

const PatchSchema = z.object({
  id: z.string(),
  active: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: Request) {
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { id, ...rest } = parsed.data;
  const item = await prisma.favouriteAccount.update({
    where: { id },
    data: rest,
  });
  return NextResponse.json({ item });
}

const DeleteSchema = z.object({ id: z.string() });

export async function DELETE(req: Request) {
  const body = await req.json();
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await prisma.favouriteAccount.delete({ where: { id: parsed.data.id } });
  return NextResponse.json({ ok: true });
}
