import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getResolvedInstagramCreds } from "@/lib/instagramCreds";

/**
 * Returns the OAuth authorisation URL for connecting an Instagram Business
 * Account via Facebook Login. The actual token exchange happens in
 * /api/instagram/callback.
 *
 * If META_APP_ID / META_REDIRECT_URI aren't set, returns a clear error so
 * the UI can prompt the user with the setup guide.
 */
export async function GET() {
  const creds = await getResolvedInstagramCreds();
  const connected = Boolean(creds.accessToken && creds.igBusinessAccountId);

  if (!env.meta.appId || !env.meta.redirectUri) {
    return NextResponse.json(
      {
        configured: false,
        connected,
        source: creds.source,
        personalHandle: creds.personalHandle || null,
        message:
          "META_APP_ID and META_REDIRECT_URI must be set in env to use the OAuth flow. You can still paste a long-lived access token below.",
      },
      { status: 200 },
    );
  }

  const scopes = [
    "instagram_basic",
    "instagram_manage_insights",
    "pages_show_list",
    "pages_read_engagement",
    "business_management",
  ].join(",");

  const params = new URLSearchParams({
    client_id: env.meta.appId,
    redirect_uri: env.meta.redirectUri,
    scope: scopes,
    response_type: "code",
    state: crypto.randomUUID(),
  });

  return NextResponse.json({
    configured: true,
    connected,
    source: creds.source,
    personalHandle: creds.personalHandle || null,
    authUrl: `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`,
  });
}
