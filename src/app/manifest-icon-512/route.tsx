import { ImageResponse } from "next/og";
import { markGlyphDataUri, BRAND_INK } from "@/lib/brandMark";

// Maskable Android / PWA launcher + splash icon (512×512). Full-bleed ground
// with the gem inside the ~80% safe zone for circular / squircle masking.
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_INK }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={310} height={310} src={markGlyphDataUri(310)} alt="" />
      </div>
    ),
    { width: 512, height: 512 },
  );
}
