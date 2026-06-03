import { ImageResponse } from "next/og";
import { similarMoments } from "@/lib/similarity";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Rendered on demand — @vercel/og can't be prerendered offline at build.
export const dynamic = "force-dynamic";
export const alt = "Have we seen this before? — Bitcoin similar moments — halvinglens.com";

// Social share card for /similar-moments. og:image is read by X, LinkedIn,
// Facebook, Discord and Telegram, so this one asset covers all of them.
export default async function Image() {
  const top = similarMoments(1)[0];

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
          <div style={{ display: "flex", fontSize: 22, color: "#6f7c8e", letterSpacing: 3 }}>SIMILAR MOMENTS</div>
        </div>

        {/* Headline + subheading */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", fontSize: 68, color: "#f3f6fa", fontWeight: 700, lineHeight: 1.05, letterSpacing: -1, maxWidth: 1040 }}>
            Have we seen this before?
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#9aa6b4", maxWidth: 880 }}>
            Find the most similar moments in Bitcoin history.
          </div>
        </div>

        {/* Closest match */}
        {top ? (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              padding: "28px 36px",
              borderRadius: 18,
              background: "rgba(94,234,212,0.06)",
              border: "1px solid rgba(94,234,212,0.22)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", fontSize: 20, color: "#5eead4", letterSpacing: 3 }}>MOST SIMILAR HISTORICAL MOMENT</div>
              <div style={{ display: "flex", fontSize: 64, color: "#f3f6fa", fontWeight: 700 }}>{top.dateLabel}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <div style={{ display: "flex", fontSize: 64, color: "#5eead4", fontWeight: 700 }}>{top.similarity}%</div>
              <div style={{ display: "flex", fontSize: 24, color: "#9aa6b4" }}>similar</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 30, color: "#9aa6b4" }}>Ranked from real Bitcoin price history.</div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", fontSize: 22, color: "#6f7c8e" }}>Historical context. Not prediction.</div>
      </div>
    ),
    size,
  );
}
