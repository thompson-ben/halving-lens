import { ImageResponse } from "next/og";
import { brandFonts } from "@/lib/ogFonts";
import { PRICE_ARCHIVE } from "@/lib/data/priceArchiveData";
import { questionBySlug } from "@/lib/questions";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";
export const alt = "Bitcoin Questions — answered by the record";

const GOLD = "#d9b96a";

// Social card for every question page (PR-Q1): the question itself, one real
// archival stat (never illustrative data), and the standing close.

export default function Image({ params }: { params: { slug: string } }) {
  const q = questionBySlug(params.slug);
  const fonts = brandFonts();
  const days = PRICE_ARCHIVE.length.toLocaleString("en-US");
  const fromYear = PRICE_ARCHIVE[0]?.date.slice(0, 4) ?? "2010";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0c10", padding: 64, fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 20, fontWeight: 700, letterSpacing: 4, color: "#f4f1ea" }}>
          <div style={{ display: "flex", width: 14, height: 14, background: GOLD, transform: "rotate(45deg)", marginRight: 14 }} />
          HALVINGLENS · BITCOIN QUESTIONS
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 62, fontWeight: 600, color: "#f4f1ea", letterSpacing: -1, lineHeight: 1.1, maxWidth: 1000 }}>
            {q?.question ?? "Bitcoin Questions"}
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 26, color: "#9aa0aa" }}>
            Answered from {days} daily closes, since {fromYear}.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 21, color: "#6f7c8e" }}>
          Historical context, not a prediction. · halvinglens.com/questions
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
