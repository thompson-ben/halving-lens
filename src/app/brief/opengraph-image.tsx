import { ImageResponse } from "next/og";
import { buildBrief } from "@/lib/brief";
import { cycleSummary } from "@/lib/cycleSummary";
import { fmtPct, fmtUsd } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Rendered on demand — @vercel/og can't be prerendered offline at build.
export const dynamic = "force-dynamic";
export const alt = "Bitcoin Cycle Brief — halving.lens";

// Brief-specific share card: the dated headline + key numbers.
export default async function Image() {
  const b = buildBrief();
  const s = cycleSummary();
  const chg = s.change24h != null ? `${fmtPct(s.change24h, 1)} ${s.changeLabel}` : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0e14",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: "#5eead4" }} />
            <div style={{ display: "flex", fontSize: 28, color: "#e4e9f0", fontWeight: 600 }}>
              halving.lens
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#9aa6b4" }}>Bitcoin Cycle Brief · {b.date}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 26, color: "#5eead4" }}>{s.phaseLabel}</div>
          <div style={{ display: "flex", fontSize: 54, color: "#f3f6fa", fontWeight: 700, lineHeight: 1.12, maxWidth: 1040 }}>
            {b.headline}
          </div>
        </div>

        <div style={{ display: "flex", gap: 64 }}>
          <Stat label="BTC PRICE" value={`${fmtUsd(s.price)}${chg ? ` (${chg})` : ""}`} />
          <Stat label="CYCLE DAY" value={`${s.cycleDay} · ${s.progressPct}%`} />
          <Stat label="HEAT" value={s.heat === "cool" ? "Cool" : s.heat === "neutral" ? "Neutral" : s.heat === "heating" ? "Heating" : s.heat === "elevated" ? "Elevated" : "Euphoric"} />
        </div>
      </div>
    ),
    size,
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", fontSize: 18, color: "#6f7c8e" }}>{label}</div>
      <div style={{ display: "flex", fontSize: 34, color: "#e4e9f0", fontWeight: 600 }}>{value}</div>
    </div>
  );
}
