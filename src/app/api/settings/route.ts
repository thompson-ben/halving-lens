import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.setting.findMany();
  const settings: Record<string, unknown> = {};
  for (const r of rows) settings[r.key] = r.value;
  return NextResponse.json({ settings });
}

const PatchSchema = z.record(z.string(), z.unknown());

export async function PATCH(req: Request) {
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  for (const [key, value] of Object.entries(parsed.data)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: value as object },
      create: { key, value: value as object },
    });
  }
  return NextResponse.json({ ok: true });
}
