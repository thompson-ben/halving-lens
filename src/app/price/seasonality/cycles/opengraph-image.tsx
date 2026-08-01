import { ImageResponse } from "next/og";
import { brandFonts } from "@/lib/ogFonts";
import { buildCycleSeasonalityPayload } from "@/lib/cycleSeasonalityPayload";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";
export const alt = "Bitcoin by Cycle Month — the halving cycles, aligned";

const GOLD = "#d9b96a";

// Social card for /price/seasonality/cycles: the four cycle rows in
// miniature — REAL monthly returns by months since halving (never
// illustrative data), with the standing close.

function cellBg(v: number | null): string {
  if (v == null) return "rgba(255,255,255,0.04)";
  const a = Math.abs(v) >= 15 ? 0.55 : Math.abs(v) >= 5 ? 0.34 : 0.16;
  return v > 0 ? `rgba(61,220,151,${a})` : v < 0 ? `rgba(255,93,93,${a})` : "rgba(255,255,255,0.08)";
}

export default function Image() {
  const fonts = brandFonts();
  const payload = buildCycleSeasonalityPayload();
  const byKey = new Map(payload.grids["returns:market"]?.cells.map(([c, m, v]) => [`${c}-${m}`, v]) ?? []);
  const months = Array.from({ length: 36 }, (_, i) => i); // first 36 months fit the card

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0c10", padding: 64, fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 20, fontWeight: 700, letterSpacing: 4, color: "#f4f1ea" }}>
          <div style={{ display: "flex", width: 14, height: 14, background: GOLD, transform: "rotate(45deg)", marginRight: 14 }} />
          HALVINGLENS RESEARCH
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 56, fontWeight: 600, color: "#f4f1ea", letterSpacing: -1 }}>
            Bitcoin by Cycle Month
          </div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 24, color: "#9aa0aa" }}>
            The halving cycles, aligned by months since each halving.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {payload.spans.map((s) => (
            <div key={s.id} style={{ display: "flex", marginBottom: 6 }}>
              <div style={{ display: "flex", width: 76, fontSize: 18, color: "#6f7c8e", alignItems: "center" }}>{s.label.slice(0, 4)}</div>
              {months.map((m) => (
                <div key={m} style={{ display: "flex", width: 26, height: 34, marginRight: 3, borderRadius: 4, background: cellBg(byKey.get(`${s.id}-${m}`) ?? null) }} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 21, color: "#6f7c8e" }}>
          Historical context, not a prediction. · halvinglens.com/price/seasonality/cycles
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
