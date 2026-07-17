import { ImageResponse } from "next/og";
import { markGlyphDataUri, BRAND_INK } from "@/lib/brandMark";

// iOS home-screen / Safari touch icon. 180×180, no transparency (iOS applies its
// own rounded mask), the Aperture gem centred on the brand ink ground.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_INK }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={124} height={124} src={markGlyphDataUri(124)} alt="" />
      </div>
    ),
    { ...size },
  );
}
