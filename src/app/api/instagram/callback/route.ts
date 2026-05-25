import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * OAuth callback for the Facebook Login flow. Exchanges the short-lived
 * code for a long-lived user access token.
 *
 * Production note: store the token securely (e.g. encrypted column or a
 * secrets manager) rather than echoing it back to the client. This route
 * is intentionally minimal to make the setup flow obvious during dev.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/settings?ig_error=missing_code", env.appUrl));

  if (!env.meta.appId || !env.meta.appSecret || !env.meta.redirectUri) {
    return NextResponse.redirect(new URL("/settings?ig_error=missing_config", env.appUrl));
  }

  try {
    const shortRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: env.meta.appId,
          client_secret: env.meta.appSecret,
          redirect_uri: env.meta.redirectUri,
          code,
        }).toString(),
    );
    if (!shortRes.ok) throw new Error(`short token exchange failed: ${shortRes.status}`);
    const shortJson = (await shortRes.json()) as { access_token: string };

    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: env.meta.appId,
          client_secret: env.meta.appSecret,
          fb_exchange_token: shortJson.access_token,
        }).toString(),
    );
    if (!longRes.ok) throw new Error(`long token exchange failed: ${longRes.status}`);
    const longJson = (await longRes.json()) as { access_token: string; expires_in?: number };

    const url = new URL("/settings", env.appUrl);
    url.searchParams.set("ig_connected", "1");
    url.searchParams.set("token_preview", longJson.access_token.slice(0, 10) + "…");
    return NextResponse.redirect(url);
  } catch (err) {
    const url = new URL("/settings", env.appUrl);
    url.searchParams.set("ig_error", err instanceof Error ? err.message : "unknown");
    return NextResponse.redirect(url);
  }
}
