import { ImageResponse } from "next/og";
import { brandFonts } from "@/lib/ogFonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";
export const alt = "HalvingLens — The clearest view of the Bitcoin cycle";

const GOLD = "#d9b96a";

// Social card for the paid landing page.
export default function Image() {
  const fonts = brandFonts();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0c10", padding: 72, fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 22, fontWeight: 700, letterSpacing: 4, color: "#f4f1ea" }}>
          <div style={{ display: "flex", width: 16, height: 16, background: GOLD, transform: "rotate(45deg)", marginRight: 16 }} />
          HALVINGLENS RESEARCH
        </div>
        <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 64, fontWeight: 600, color: "#f4f1ea", lineHeight: 1.08, letterSpacing: -1, maxWidth: 980 }}>
          The clearest view of the Bitcoin cycle.
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#9aa0aa" }}>
          Understand today&apos;s Bitcoin market in under 60 seconds — historical context, not hype.
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
