import { ImageResponse } from "next/og";
import { getWeekly, allWeeklySlugs } from "@/lib/weekly";
import { brandFonts } from "@/lib/ogFonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "HalvingLens Weekly Research";

export function generateStaticParams() {
  return allWeeklySlugs().map((slug) => ({ slug }));
}

const GOLD = "#d9b96a";

export default function Image({ params }: { params: { slug: string } }) {
  const w = getWeekly(params.slug);
  const fonts = brandFonts();
  const title = w?.biggestStory.title ?? "HalvingLens Weekly Research";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0c10", padding: 64, fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 22, fontWeight: 700, letterSpacing: 4, color: "#f4f1ea" }}>
            <div style={{ display: "flex", width: 16, height: 16, background: GOLD, transform: "rotate(45deg)", marginRight: 16 }} />
            HALVINGLENS WEEKLY
          </div>
          <div style={{ display: "flex", fontSize: 20, color: GOLD }}>{w?.weekLabel ?? ""}</div>
        </div>
        <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 54, fontWeight: 600, color: "#f4f1ea", lineHeight: 1.12, letterSpacing: -0.5, maxWidth: 1060 }}>
          {title}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <div style={{ display: "flex", fontSize: 22, color: "#8c919c", marginRight: 14 }}>Context Score</div>
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 52, fontWeight: 700, color: GOLD }}>{w?.contextScore.score ?? ""}</div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#6b7079" }}>Weekly Research</div>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
