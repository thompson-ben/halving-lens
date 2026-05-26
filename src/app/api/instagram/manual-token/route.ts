import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { IG_SETTINGS_KEYS, invalidateInstagramCredsCache, getResolvedInstagramCreds } from "@/lib/instagramCreds";

export const dynamic = "force-dynamic";

// Returns the current override state, masking the access token for display.
// The handle is returned in full because it's not sensitive.
export async function GET() {
  const creds = await getResolvedInstagramCreds();
  return NextResponse.json({
    source: creds.source,
    personalHandle: creds.personalHandle || "",
    igBusinessAccountId: creds.igBusinessAccountId,
    pageId: creds.pageId,
    accessTokenMasked: creds.accessToken
      ? `${creds.accessToken.slice(0, 6)}…${creds.accessToken.slice(-4)}`
      : "",
    hasAccessToken: Boolean(creds.accessToken),
  });
}

const PostSchema = z.object({
  // All four fields are optional so the operator can update one at a time —
  // e.g. just refresh the access token without re-pasting the IG account id.
  accessToken: z.string().min(20).optional(),
  igBusinessAccountId: z.string().min(1).optional(),
  pageId: z.string().min(1).optional(),
  personalHandle: z
    .string()
    .max(50)
    .optional()
    .transform((v) => v?.replace(/^@+/, "").trim()),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const writes: Array<[string, string]> = [];
  if (parsed.data.accessToken) writes.push([IG_SETTINGS_KEYS.accessToken, parsed.data.accessToken]);
  if (parsed.data.igBusinessAccountId) writes.push([IG_SETTINGS_KEYS.igBusinessAccountId, parsed.data.igBusinessAccountId]);
  if (parsed.data.pageId) writes.push([IG_SETTINGS_KEYS.pageId, parsed.data.pageId]);
  if (parsed.data.personalHandle !== undefined) writes.push([IG_SETTINGS_KEYS.personalHandle, parsed.data.personalHandle]);

  for (const [key, value] of writes) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: value as unknown as object },
      create: { key, value: value as unknown as object },
    });
  }

  // Force the next IG API call to pick up the new creds, otherwise the
  // 30-second cache would mask the change.
  invalidateInstagramCredsCache();

  return NextResponse.json({ ok: true, updated: writes.map(([k]) => k) });
}

const DeleteSchema = z.object({
  keys: z.array(z.enum(["accessToken", "igBusinessAccountId", "pageId", "personalHandle"])).optional(),
});

// DELETE removes the overrides, letting the env-var fallback take over again.
// Useful when the operator wants to revert to a deployment-managed setup.
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const fields = parsed.data.keys ?? ["accessToken", "igBusinessAccountId", "pageId", "personalHandle"];
  const keys = fields.map((f) => IG_SETTINGS_KEYS[f]);
  await prisma.setting.deleteMany({ where: { key: { in: keys } } });
  invalidateInstagramCredsCache();
  return NextResponse.json({ ok: true, cleared: keys });
}
