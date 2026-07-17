import { ImageResponse } from "next/og";
import { markGlyphDataUri, BRAND_INK } from "@/lib/brandMark";

// Maskable Android / PWA launcher icon (192×192). Full-bleed ground with the gem
// inside the ~80% safe zone so it survives circular / squircle masking.
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_INK }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={116} height={116} src={markGlyphDataUri(116)} alt="" />
      </div>
    ),
    { width: 192, height: 192 },
  );
}
