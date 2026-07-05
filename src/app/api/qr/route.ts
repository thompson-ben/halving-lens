import { qrSvg } from "@/lib/qrSvg";
import { shortUrl } from "@/lib/shareLinks";
import { SITE_HOST } from "@/lib/site";

// Branded QR code for a HalvingLens short link. Always encodes the /r/<slug>
// short URL (never the destination), so scans route through the redirect and get
// recorded. Returns SVG — crisp at any size, ideal for print and screens.
//   /api/qr?slug=hl-r002            → framed, branded, with the short URL caption
//   /api/qr?slug=home&framed=0      → just the code panel (for embedding)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "home").slice(0, 80).replace(/[^a-zA-Z0-9._~-]/g, "");
  const framed = searchParams.get("framed") !== "0";
  // Optional referral code — baked into the QR so an in-person scan still
  // attributes the resulting signup to the member who shared it.
  const ref = (searchParams.get("ref") || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
  // Encode the short URL with ?s=qr so scans are attributable at the redirect.
  const url = `${shortUrl(slug)}?s=qr${ref ? `&ref=${ref}` : ""}`;
  const caption = searchParams.get("caption")?.slice(0, 60) ?? `${SITE_HOST}/r/${slug}`;

  const svg = qrSvg(url, { framed, caption, size: 640 });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Deterministic per slug — cache hard at the edge.
      "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
    },
  });
}
