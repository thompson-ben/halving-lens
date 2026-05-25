import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CONTENT_STATUSES, type ContentStatus } from "@/types";

const PatchSchema = z.object({
  status: z.enum(CONTENT_STATUSES as [ContentStatus, ...ContentStatus[]]).optional(),
  rightsStatus: z.enum(["unknown", "requested", "granted", "denied"]).optional(),
  rightsNote: z.string().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const item = await prisma.discoveredContent.findUnique({
    where: { id: params.id },
    include: { captions: { orderBy: { createdAt: "desc" } }, score: true, source: true, schedule: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  const now = new Date();
  if (parsed.data.status === "shortlisted") data.shortlistedAt = now;
  if (parsed.data.status === "approved") data.approvedAt = now;
  if (parsed.data.status === "rejected") data.rejectedAt = now;
  if (parsed.data.status === "posted") data.postedAt = now;

  const updated = await prisma.discoveredContent.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json({ item: updated });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.discoveredContent.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
