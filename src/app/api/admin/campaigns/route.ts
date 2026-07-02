import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createCampaign } from "@/lib/shareCampaigns";
import { currentProfile, isFounderEmail } from "@/lib/profile";

// Founder-only: create a named share campaign (branded short link + QR). Gated by
// the dashboard key/cookie, same as the Founder Dashboard.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authed(req: Request, bodyKey?: string): boolean {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;
  if (!expected) return false;
  const cookieKey = cookies().get("hl_admin")?.value;
  const urlKey = new URL(req.url).searchParams.get("key");
  return cookieKey === expected || urlKey === expected || bodyKey === expected;
}

interface Body {
  name?: string;
  slug?: string;
  destination?: string;
  notes?: string;
  key?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  if (!authed(req, body.key)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const name = (body.name ?? "").trim();
  const destination = (body.destination ?? "/").trim();
  if (!name) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });

  const profile = currentProfile();
  const createdBy = profile && isFounderEmail(profile.email) ? profile.email : null;

  const result = await createCampaign({
    name,
    slug: body.slug?.trim() || undefined,
    destination_path: destination,
    notes: body.notes?.trim() || null,
    createdBy,
  });

  if (!result.ok) return NextResponse.json(result, { status: result.error === "store_failed" ? 500 : 409 });
  return NextResponse.json(result);
}
