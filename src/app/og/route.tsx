import { ImageResponse } from "next/og";
import { cycleSummary, HEAT_LABEL } from "@/lib/cycleSummary";
import { fmtUsd } from "@/lib/format";

// "Today's Bitcoin Cycle Read" — the signature share card and visual identity
// of halvinglens.com. Rendered on demand (force-dynamic) so @vercel/og isn't
// prerendered offline at build.
export const dynamic = "force-dynamic";

const HEAT_COLOR: Record<string, string> = {
  cool: "#5aa9ff",
  neutral: "#5eead4",
  heating: "#3ddc97",
  elevated: "#f5b942",
  euphoria: "#ff5d5d",
};
const CONF: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };

export async function GET() {
  const s = cycleSummary();
  const history = s.summary.includes("cooler")
    ? "Cooler than previous cycles"
    : s.summary.includes("hotter")
      ? "Hotter than previous cycles"
      : "Broadly tracking previous cycles";
  const heatColor = HEAT_COLOR[s.heat] ?? "#5eead4";

  const Item = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", fontSize: 20, color: "#6f7c8e", letterSpacing: 2 }}>{label}</div>
      <div style={{ display: "flex", fontSize: 38, color: color ?? "#f3f6fa", fontWeight: 600 }}>{value}</div>
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
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#5eead4" }} />
            <div style={{ display: "flex", fontSize: 26, color: "#e4e9f0", fontWeight: 600 }}>halvinglens.com</div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#6f7c8e", letterSpacing: 3 }}>
            TODAY&apos;S BITCOIN CYCLE READ
          </div>
        </div>

        {/* Big headline: progress + phase */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <div style={{ display: "flex", fontSize: 86, color: "#f3f6fa", fontWeight: 700 }}>
              {s.progressPct}%
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "#9aa6b4" }}>through Cycle 5</div>
          </div>
          <div style={{ display: "flex", fontSize: 40, color: heatColor, fontWeight: 600 }}>{s.phaseLabel}</div>
        </div>

        {/* Read-outs */}
        <div style={{ display: "flex", gap: 56, flexWrap: "wrap" }}>
          <Item label="RISK" value={HEAT_LABEL[s.heat]} color={heatColor} />
          <Item label="CONFIDENCE" value={CONF[s.confidence]} />
          <Item label="VS HISTORY" value={history} />
          <Item label="BTC" value={fmtUsd(s.price)} />
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
