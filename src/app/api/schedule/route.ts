import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const Schema = z.object({
  contentId: z.string(),
  scheduledFor: z.string().datetime(),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  autoPost: z.boolean().optional(),
});

export async function GET() {
  const items = await prisma.postingSchedule.findMany({
    orderBy: { scheduledFor: "asc" },
    include: { content: true },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const content = await prisma.discoveredContent.findUnique({ where: { id: parsed.data.contentId } });
  if (!content) return NextResponse.json({ error: "Content not found" }, { status: 404 });
  if (content.status !== "approved" && content.status !== "shortlisted") {
    return NextResponse.json(
      { error: "Content must be approved before it can be scheduled" },
      { status: 409 },
    );
  }

  const schedule = await prisma.postingSchedule.upsert({
    where: { contentId: parsed.data.contentId },
    update: {
      scheduledFor: new Date(parsed.data.scheduledFor),
      caption: parsed.data.caption,
      hashtags: parsed.data.hashtags ?? [],
      autoPost: parsed.data.autoPost ?? false,
      status: "scheduled",
    },
    create: {
      contentId: parsed.data.contentId,
      scheduledFor: new Date(parsed.data.scheduledFor),
      caption: parsed.data.caption,
      hashtags: parsed.data.hashtags ?? [],
      autoPost: parsed.data.autoPost ?? false,
    },
  });

  await prisma.discoveredContent.update({
    where: { id: parsed.data.contentId },
    data: { status: "approved", approvedAt: new Date() },
  });

  return NextResponse.json({ schedule });
}
