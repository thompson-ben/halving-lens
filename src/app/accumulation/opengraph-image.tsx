import { ImageResponse } from "next/og";
import { accumulationRead, ACCUMULATION_BANDS } from "@/lib/accumulation";
import { markGlyphDataUri } from "@/lib/brandMark";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Rendered on demand — @vercel/og can't be prerendered offline at build.
export const dynamic = "force-dynamic";
export const alt = "Bitcoin Accumulation Index — halvinglens.com";

// Social share card for /accumulation. og:image is read by X, LinkedIn,
// Facebook, Discord and Telegram, so this one asset covers all of them.
export default async function Image() {
  const read = accumulationRead();
  const score = Math.min(100, Math.max(0, read.score));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(160deg, #0c1118 0%, #0a0e14 60%, #070a0f 100%)",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={markGlyphDataUri(30)} width={30} height={30} alt="" />
            <div style={{ display: "flex", fontSize: 26, color: "#e4e9f0", fontWeight: 600 }}>halvinglens.com</div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#6f7c8e", letterSpacing: 3 }}>ACCUMULATION INDEX</div>
        </div>

        {/* Score + band */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", fontSize: 24, color: "#9aa6b4", letterSpacing: 2 }}>
            BITCOIN ACCUMULATION INDEX
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 132, fontWeight: 700, color: read.band.color, lineHeight: 1 }}>
              {read.score}
            </div>
            <div style={{ display: "flex", flexDirection: "column", paddingBottom: 16, gap: 6 }}>
              <div style={{ display: "flex", fontSize: 30, color: "#6f7c8e" }}>/ 100</div>
              <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "#f3f6fa" }}>{read.band.label}</div>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#9aa6b4" }}>
            Lower in its history than {100 - read.historicalPercentile}% of all weeks since 2012.
          </div>
        </div>

        {/* Five-band meter with marker */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", position: "relative", width: "100%" }}>
            <div style={{ display: "flex", width: "100%", height: 26, borderRadius: 13, overflow: "hidden" }}>
              {ACCUMULATION_BANDS.map((b) => (
                <div key={b.key} style={{ display: "flex", flex: 1, background: b.color, opacity: 0.85 }} />
              ))}
            </div>
            <div
              style={{
                position: "absolute",
                left: `${score}%`,
                top: -7,
                marginLeft: -20,
                width: 40,
                height: 40,
                borderRadius: 20,
                background: "#fff",
                border: "5px solid #070a0f",
                display: "flex",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "#6f7c8e", letterSpacing: 1 }}>
            <div style={{ display: "flex" }}>DEEP VALUE</div>
            <div style={{ display: "flex" }}>NEUTRAL</div>
            <div style={{ display: "flex" }}>OVERHEATED</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", fontSize: 22, color: "#6f7c8e" }}>Historical context. Not prediction.</div>
      </div>
    ),
    size,
  );
}
