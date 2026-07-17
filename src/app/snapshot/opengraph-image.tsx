import { ImageResponse } from "next/og";
import { metricChange } from "@/lib/metricChange";
import { cycleSummary } from "@/lib/cycleSummary";
import { fmtUsd } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";
export const alt = "Bitcoin Market Snapshot — where the cycle stands today — halvinglens.com";

// Social share card for /snapshot. og:image is read by X, LinkedIn, Facebook,
// Discord and Telegram, so this one asset covers all of them. Same live numbers
// as the page — the website stays the single source of truth.
export default async function Image() {
  const s = cycleSummary();
  const health = metricChange("market_health");
  const sentiment = metricChange("sentiment");
  const acc = metricChange("accumulation");

  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", fontSize: 20, color: "#6f7c8e", letterSpacing: 2, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", fontSize: 40, color: "#f3f6fa", fontWeight: 700 }}>{value}</div>
    </div>
  );

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#5eead4" }} />
            <div style={{ display: "flex", fontSize: 26, color: "#e4e9f0", fontWeight: 600 }}>halvinglens.com</div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#6f7c8e", letterSpacing: 3 }}>MARKET SNAPSHOT</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", fontSize: 66, color: "#f3f6fa", fontWeight: 700, lineHeight: 1.05, letterSpacing: -1 }}>
            Bitcoin Market Snapshot
          </div>
          <div style={{ display: "flex", fontSize: 27, color: "#8893a4" }}>
            Day {s.cycleDay} of the cycle · {fmtUsd(s.price)} · historical context, not prediction.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Stat label="Price" value={fmtUsd(s.price)} />
          <Stat label="Market Health" value={`${health.current}/100`} />
          <Stat label="Sentiment" value={sentiment.available ? `${sentiment.current}` : "—"} />
          <Stat label="Accumulation" value={`${acc.current}/100`} />
        </div>
      </div>
    ),
    { ...size },
  );
}
