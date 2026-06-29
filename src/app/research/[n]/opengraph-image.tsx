import { ImageResponse } from "next/og";
import { getEdition, allEditionNumbers } from "@/lib/research";
import { brandFonts } from "@/lib/ogFonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "HalvingLens Research edition";

export function generateStaticParams() {
  return allEditionNumbers().map((n) => ({ n: String(n) }));
}

const GOLD = "#d9b96a";

// Frozen social card for a research edition — the exact score and take as
// published that morning.
export default function Image({ params }: { params: { n: string } }) {
  const e = getEdition(Number(params.n));
  const fonts = brandFonts();
  const take = e?.take ?? "HalvingLens Research";
  const score = e?.contextScore.score ?? 0;
  const stars = e?.contextScore.stars ?? 0;

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
          <div style={{ display: "flex", fontSize: 20, color: GOLD }}>Edition #{e?.edition ?? ""}</div>
        </div>

        <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 52, fontWeight: 600, color: "#f4f1ea", lineHeight: 1.15, letterSpacing: -0.5, maxWidth: 1050 }}>
          {take}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <div style={{ display: "flex", fontSize: 22, color: "#8c919c", marginRight: 14 }}>Context Score</div>
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 56, fontWeight: 700, color: GOLD }}>{score}</div>
            <div style={{ display: "flex", alignItems: "center", marginLeft: 14, marginBottom: 8 }}>
              {Array.from({ length: stars }).map((_, i) => (
                <div key={i} style={{ display: "flex", width: 12, height: 12, background: GOLD, transform: "rotate(45deg)", marginLeft: 6 }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#6b7079" }}>{e?.dateLabel ?? ""}</div>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
