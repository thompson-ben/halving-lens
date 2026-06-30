import { ImageResponse } from "next/og";
import { findingBySlug, findingSlugs } from "@/lib/findings";
import { brandFonts } from "@/lib/ogFonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "HalvingLens Research finding";

export function generateStaticParams() {
  return findingSlugs().map((slug) => ({ slug }));
}

const GOLD = "#d9b96a";

// Social card for a Research Finding — leads with the permanent citation ID so
// the share image is itself a citation.
export default function Image({ params }: { params: { slug: string } }) {
  const f = findingBySlug(params.slug);
  const fonts = brandFonts();
  const id = f?.id ?? "HL-R";
  const title = f?.title ?? "HalvingLens Research";
  const headline = f?.headline ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0c10",
          padding: 64,
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 22, fontWeight: 700, letterSpacing: 4, color: "#f4f1ea" }}>
            <div style={{ display: "flex", width: 16, height: 16, background: GOLD, transform: "rotate(45deg)", marginRight: 16 }} />
            HALVINGLENS RESEARCH
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 3, color: GOLD }}>{id}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#8c919c", marginBottom: 18 }}>
            RESEARCH FINDING
          </div>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 56, fontWeight: 600, color: "#f4f1ea", lineHeight: 1.1, letterSpacing: -0.5, maxWidth: 1060 }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 25, color: "#c2c6cf", lineHeight: 1.35, marginTop: 22, maxWidth: 1020 }}>
            {headline}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 21, color: "#8c919c" }}>Historical context. Not prediction.</div>
          <div style={{ display: "flex", fontSize: 21, color: "#6b7079" }}>halvinglens.com/research/findings</div>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
