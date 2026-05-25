import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sources = await prisma.source.findMany({ orderBy: { label: "asc" } });
  return NextResponse.json({ sources });
}

const PatchSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
});

export async function PATCH(req: Request) {
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const updated = await prisma.source.update({
    where: { id: parsed.data.id },
    data: { enabled: parsed.data.enabled },
  });
  return NextResponse.json({ source: updated });
}
