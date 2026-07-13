import { ImageResponse } from "next/og";
import { marketHealthRead } from "@/lib/marketHealth";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Rendered on demand — @vercel/og can't be prerendered offline at build.
export const dynamic = "force-dynamic";
export const alt = "Bitcoin Market Health — halvinglens.com";

// Social share card for /market-health. og:image is read by X, LinkedIn,
// Facebook, Discord and Telegram, so this one asset covers all of them.
export default async function Image() {
  const h = marketHealthRead();
  const score = Math.min(100, Math.max(0, h.score));

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
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#5eead4" }} />
            <div style={{ display: "flex", fontSize: 26, color: "#e4e9f0", fontWeight: 600 }}>halvinglens.com</div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#6f7c8e", letterSpacing: 3 }}>MARKET HEALTH</div>
        </div>

        {/* Score + label */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", fontSize: 24, color: "#9aa6b4", letterSpacing: 2 }}>
            BITCOIN MARKET HEALTH SCORE
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 132, fontWeight: 700, color: h.color, lineHeight: 1 }}>
              {h.score}
            </div>
            <div style={{ display: "flex", flexDirection: "column", paddingBottom: 16, gap: 6 }}>
              <div style={{ display: "flex", fontSize: 30, color: "#6f7c8e" }}>/ 100</div>
              <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "#f3f6fa" }}>{h.label} · {h.tag}</div>
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#9aa6b4" }}>
            More attractive than {h.value.cheaperThan}% of all weeks since 2012.
          </div>
        </div>

        {/* Score meter with marker (red → green) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", position: "relative", width: "100%" }}>
            <div style={{ display: "flex", width: "100%", height: 26, borderRadius: 13, overflow: "hidden" }}>
              {["#ff5d5d", "#f97316", "#f5b942", "#5eead4", "#3ddc97"].map((c) => (
                <div key={c} style={{ display: "flex", flex: 1, background: c, opacity: 0.85 }} />
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
            <div style={{ display: "flex" }}>OVERHEATED</div>
            <div style={{ display: "flex" }}>BALANCED</div>
            <div style={{ display: "flex" }}>CALM</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", fontSize: 22, color: "#6f7c8e" }}>Historical context. Not prediction.</div>
      </div>
    ),
    size,
  );
}
