import { ImageResponse } from "next/og";
import { CYCLE_PROGRESS_PCT, DAYS_TO_NEXT_HALVING, SPOT, TODAY, TODAY_DAY_IN_CYCLE } from "@/lib/btcData";
import { cyclePhase, cycleTrackingHeadline } from "@/lib/cycleIntel";
import { fmtUsd } from "@/lib/format";

// Rendered on demand (Vercel) — never prerendered at build, where @vercel/og
// can't fetch its runtime bits offline.
export const dynamic = "force-dynamic";

// Branded share card — social unfurls (og:image) + the in-app download button.
export async function GET() {
  const phase = cyclePhase();
  const pct = Math.round(CYCLE_PROGRESS_PCT * 100);
  const price = SPOT?.price ?? TODAY.price;
  const headline = cycleTrackingHeadline();

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
            <div style={{ display: "flex", fontSize: 30, color: "#e4e9f0", fontWeight: 600 }}>
              halving.lens
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#5eead4",
              border: "1px solid rgba(94,234,212,0.3)",
              background: "rgba(94,234,212,0.08)",
              borderRadius: 999,
              padding: "10px 22px",
            }}
          >
            {phase.label}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 28, color: "#9aa6b4" }}>
            Cycle 5 · day {TODAY_DAY_IN_CYCLE} of 1458
          </div>
          <div style={{ display: "flex", fontSize: 60, color: "#f3f6fa", fontWeight: 700, maxWidth: 1000 }}>
            Bitcoin is {pct}% through the halving cycle.
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#c2cad6", maxWidth: 1000 }}>{headline}</div>
        </div>

        <div style={{ display: "flex", gap: 80 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 20, color: "#6f7c8e" }}>BTC PRICE</div>
            <div style={{ display: "flex", fontSize: 40, color: "#e4e9f0", fontWeight: 600 }}>{fmtUsd(price)}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 20, color: "#6f7c8e" }}>DAYS TO HALVING</div>
            <div style={{ display: "flex", fontSize: 40, color: "#e4e9f0", fontWeight: 600 }}>{DAYS_TO_NEXT_HALVING}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 20, color: "#6f7c8e" }}>THROUGH CYCLE</div>
            <div style={{ display: "flex", fontSize: 40, color: "#5eead4", fontWeight: 600 }}>{pct}%</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
