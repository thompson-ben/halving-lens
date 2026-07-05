import { NextResponse } from "next/server";
import { currentProfile, setDisplayName } from "@/lib/profile";

// Set (or clear) the signed-in member's public display name. Case-insensitively
// unique — validation and the "taken" check live in setDisplayName, with a DB
// unique index as the race-safe backstop.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const p = currentProfile();
  if (!p) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });

  let name = "";
  try {
    name = String(((await req.json()) as { name?: unknown }).name ?? "");
  } catch {
    /* treat as empty ⇒ clear */
  }

  const result = await setDisplayName(p.email, name);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
