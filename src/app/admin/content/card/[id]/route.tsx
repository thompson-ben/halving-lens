import { ImageResponse } from "next/og";
import { cookies } from "next/headers";
import { buildCard, CARD_ORDER, type CardId } from "@/lib/contentCards";
import { renderCard, CARD_W, CARD_H } from "@/lib/cardTemplates";

// Server-rendered branded carousel card (1080×1350 PNG). Admin-only — gated by
// the same session cookie as the metrics dashboard (or a ?key= match). Rendered
// on demand so @vercel/og isn't prerendered offline at build.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;
  const cookieKey = cookies().get("hl_admin")?.value;
  const urlKey = new URL(req.url).searchParams.get("key");
  const authed = !!expected && (cookieKey === expected || urlKey === expected);
  if (!authed) {
    return new Response("Unauthorized", { status: 401 });
  }

  const id = params.id as CardId;
  if (!CARD_ORDER.includes(id)) {
    return new Response("Unknown card", { status: 404 });
  }

  return new ImageResponse(renderCard(buildCard(id)), { width: CARD_W, height: CARD_H });
}
