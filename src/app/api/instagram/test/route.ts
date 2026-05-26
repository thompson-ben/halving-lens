import { NextResponse } from "next/server";
import { getResolvedInstagramCreds } from "@/lib/instagramCreds";

export const dynamic = "force-dynamic";

// Live ping at the Graph API to confirm a pasted token actually works.
// Used by the Settings UI as the "Test connection" button — surfaces a
// useful error message rather than just failing silently the next time
// the operator triggers a sync.
export async function POST() {
  const creds = await getResolvedInstagramCreds();
  if (!creds.accessToken || !creds.igBusinessAccountId) {
    return NextResponse.json({
      ok: false,
      stage: "credentials",
      message: "No access token / IG Business Account ID configured.",
    });
  }

  const url = new URL(`https://graph.facebook.com/v21.0/${creds.igBusinessAccountId}`);
  url.searchParams.set("fields", "username,name,followers_count,media_count");
  url.searchParams.set("access_token", creds.accessToken);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        stage: "graph",
        status: res.status,
        message: body?.error?.message ?? `Graph API returned ${res.status}`,
      });
    }
    return NextResponse.json({
      ok: true,
      stage: "ok",
      username: body?.username ?? null,
      displayName: body?.name ?? null,
      followers: body?.followers_count ?? null,
      mediaCount: body?.media_count ?? null,
      source: creds.source,
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      stage: "network",
      message: err instanceof Error ? err.message : "Network error",
    });
  }
}
