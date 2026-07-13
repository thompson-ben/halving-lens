import { ImageResponse } from "next/og";
import { etfFlowsRead } from "@/lib/etfFlows";
import { fmtUsd } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Rendered on demand — @vercel/og can't be prerendered offline at build.
export const dynamic = "force-dynamic";
export const alt = "Bitcoin ETF Flows — halvinglens.com";

function signed(n: number): string {
  return `${n >= 0 ? "+" : "−"}${fmtUsd(Math.abs(n), { compact: true })}`;
}

// Social share card for /etf. og:image is read by X, LinkedIn, Facebook,
// Discord and Telegram, so this one asset covers all of them.
export default async function Image() {
  const r = etfFlowsRead();
  const net = r.base.latest?.netFlow ?? 0;
  const netColor = net >= 0 ? "#3ddc97" : "#ff5d5d";

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
          <div style={{ display: "flex", fontSize: 22, color: "#6f7c8e", letterSpacing: 3 }}>ETF FLOWS</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", fontSize: 24, color: "#9aa6b4", letterSpacing: 2 }}>
            US SPOT BITCOIN ETF · TODAY&apos;S NET FLOW
          </div>
          <div style={{ display: "flex", fontSize: 128, fontWeight: 700, color: netColor, lineHeight: 1 }}>
            {r.connected ? signed(net) : "Connecting"}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#9aa6b4" }}>
            {r.connected
              ? `7-day ${signed(r.windows.d7.net)} · cumulative ${fmtUsd(r.base.cumulative, { compact: true })}`
              : "Live US spot Bitcoin ETF flows"}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 22, color: "#6f7c8e" }}>What are institutions doing? · Historical context, not prediction.</div>
      </div>
    ),
    size,
  );
}
