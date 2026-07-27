import { ImageResponse } from "next/og";
import { buildCard, isCardId, PACK_LABELS, type BuildCtx, type CardId, type PackId } from "@/lib/contentCards";
import { renderCard, CARD_W, CARD_H } from "@/lib/cardTemplates";
import { brandFonts } from "@/lib/ogFonts";
import { isAdmin } from "@/lib/adminAuth";
import { storyEngine } from "@/lib/storyEngine";
import { recentSocialPosts } from "@/lib/socialPosts";

// Server-rendered branded carousel card (1080×1350 PNG). Admin-only — gated by
// the admin session cookie. Rendered on demand so @vercel/og isn't prerendered
// offline at build.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) {
    return new Response("Unauthorized", { status: 401 });
  }

  const id = params.id;
  if (!isCardId(id)) {
    return new Response("Unknown card", { status: 404 });
  }
  // Validate the pack against the shared registry rather than a hand-written
  // ladder — a new pack (e.g. four_prices) is recognised the moment it exists
  // in PACK_LABELS, instead of silently falling through to "daily" and
  // rendering with the wrong slide numbering.
  const packParam = new URL(req.url).searchParams.get("pack");
  const pack: PackId = packParam && packParam in PACK_LABELS ? (packParam as PackId) : "daily";

  // Story-driven packs get the history-aware engine decision so the rendered
  // hero (chart + headline + layout) matches the studio and respects diversity.
  let ctx: BuildCtx | undefined;
  if (pack === "chart_week" || pack === "week") {
    ctx = { story: storyEngine({ recentPosts: await recentSocialPosts() }).top };
  }

  const fonts = brandFonts();
  return new ImageResponse(renderCard(buildCard(id as CardId, pack, ctx)), {
    width: CARD_W,
    height: CARD_H,
    ...(fonts.length ? { fonts } : {}),
  });
}
