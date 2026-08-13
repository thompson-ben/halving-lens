import { ImageResponse } from "next/og";
import { metricCardsGallery, type CardPeriod } from "@/lib/metricCards";
import { renderMetricSocialCard, METRIC_CARD_W, METRIC_CARD_H } from "@/lib/metricCardTemplates";
import { brandFonts } from "@/lib/ogFonts";

// MW2-B — the metric social card image. PUBLIC by the same reasoning as
// /ads and the research finding cards ("these are meant to be posted"):
// the creative contains only published, deterministic engine output, and a
// public route is what later makes per-metric OG images nearly free. The
// founder-facing GALLERY (selection workflow) stays admin-gated.
//
// Params: [metricId] from the considered population; ?period=1|7|30
// (default 7, junk clamps); ?state=0 renders the founder-review variant
// with the canonical state word visually omitted (payload untouched).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { metricId: string } }) {
  const url = new URL(req.url);
  const p = url.searchParams.get("period");
  const period: CardPeriod = p === "1" ? 1 : p === "30" ? 30 : 7;
  const showStateWord = url.searchParams.get("state") !== "0";

  const g = metricCardsGallery(period);
  const card = [...g.worthLookingAt, ...g.alsoMoving, ...g.routine, ...g.maturing].find(
    (c) => c.metricId === params.metricId,
  );
  if (!card) {
    const reason = g.unavailable.find((u) => u.metricId === params.metricId)?.reason ?? "Unknown metric.";
    return new Response(`No card: ${reason}`, { status: 404 });
  }

  const fonts = brandFonts();
  return new ImageResponse(renderMetricSocialCard(card, { showStateWord }), {
    width: METRIC_CARD_W,
    height: METRIC_CARD_H,
    ...(fonts.length ? { fonts } : {}),
  });
}
