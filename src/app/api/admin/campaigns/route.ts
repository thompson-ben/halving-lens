import { NextResponse } from "next/server";
import { createCampaign } from "@/lib/shareCampaigns";
import { currentProfile, isFounderEmail } from "@/lib/profile";
import { isAdmin } from "@/lib/adminAuth";

// Founder-only: create a named share campaign (branded short link + QR). Gated by
// the admin session cookie, same as the Founder Dashboard.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  name?: string;
  slug?: string;
  destination?: string;
  notes?: string;
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

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
