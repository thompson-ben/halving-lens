import { ImageResponse } from "next/og";
import { briefBySlug, briefSlugs, briefStat } from "@/lib/evidenceBriefs";
import { brandFonts } from "@/lib/ogFonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "HalvingLens Evidence Brief";

export function generateStaticParams() {
  return briefSlugs().map((slug) => ({ slug }));
}

const GOLD = "#d9b96a";
const ACCENT = "#5eead4";

// Social card for an Evidence Brief — leads with the permanent citation ID and
// the single live headline figure, so the share image is itself the answer.
export default function Image({ params }: { params: { slug: string } }) {
  const b = briefBySlug(params.slug);
  const fonts = brandFonts();
  const id = b?.id ?? "HL-E";
  const question = b?.question ?? "HalvingLens Evidence Brief";
  const stat = b ? briefStat(b) : null;
  const headline = stat?.available ? stat.headline : null;
  const statement = stat?.available ? stat.statement : b?.summary ?? "";

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
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: 3, color: ACCENT }}>{id}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 18, fontWeight: 600, letterSpacing: 3, color: "#8c919c", marginBottom: 18 }}>
            EVIDENCE BRIEF
          </div>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 46, fontWeight: 600, color: "#f4f1ea", lineHeight: 1.12, letterSpacing: -0.5, maxWidth: 1060 }}>
            {question}
          </div>
          {headline && (
            <div style={{ display: "flex", alignItems: "flex-end", marginTop: 30 }}>
              <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 120, fontWeight: 600, color: ACCENT, lineHeight: 0.9, letterSpacing: -2 }}>
                {headline}
              </div>
              <div style={{ display: "flex", fontSize: 24, color: "#c2c6cf", lineHeight: 1.3, marginLeft: 28, marginBottom: 12, maxWidth: 560 }}>
                {statement}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 21, color: "#8c919c" }}>Historical context. Not prediction.</div>
          <div style={{ display: "flex", fontSize: 21, color: "#6b7079" }}>halvinglens.com/research/briefs</div>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
