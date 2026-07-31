import { ImageResponse } from "next/og";
import { PRICE_ARCHIVE } from "@/lib/data/priceArchiveData";
import { brandFonts } from "@/lib/ogFonts";
import { seasonalityData } from "@/lib/seasonality";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";
export const alt = "Bitcoin Seasonality — monthly behaviour across the full observed record";

const GOLD = "#d9b96a";

// Social card for /price/seasonality: the signature heatmap in miniature —
// the last six complete-ish years of REAL monthly returns from the engine
// (never illustrative data), with the standing close.

function cellBg(v: number | null): string {
  if (v == null) return "rgba(255,255,255,0.04)";
  const a = Math.abs(v) >= 15 ? 0.55 : Math.abs(v) >= 5 ? 0.34 : 0.16;
  return v > 0 ? `rgba(61,220,151,${a})` : v < 0 ? `rgba(255,93,93,${a})` : "rgba(255,255,255,0.08)";
}

export default function Image() {
  const fonts = brandFonts();
  const todayIso = PRICE_ARCHIVE.length
    ? PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1].date
    : new Date().toISOString().slice(0, 10);
  const d = seasonalityData({ mode: "returns", series: "market", filter: "all" }, todayIso);
  const years = [...new Set(d.cells.map((c) => c.year))].sort().slice(-6);
  const rows = years.map((y) => ({
    y,
    vals: Array.from({ length: 12 }, (_, i) => d.cells.find((c) => c.year === y && c.month === i + 1)?.value ?? null),
  }));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0a0c10", padding: 64, fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 20, fontWeight: 700, letterSpacing: 4, color: "#f4f1ea" }}>
          <div style={{ display: "flex", width: 14, height: 14, background: GOLD, transform: "rotate(45deg)", marginRight: 14 }} />
          HALVINGLENS RESEARCH
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 58, fontWeight: 600, color: "#f4f1ea", letterSpacing: -1 }}>
            Bitcoin Seasonality
          </div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 24, color: "#9aa0aa" }}>
            Monthly behaviour across the full observed record, since 2010.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.map((r) => (
            <div key={r.y} style={{ display: "flex", marginBottom: 6 }}>
              <div style={{ display: "flex", width: 64, fontSize: 18, color: "#6f7c8e", alignItems: "center" }}>{r.y}</div>
              {r.vals.map((v, i) => (
                <div key={i} style={{ display: "flex", width: 82, height: 34, marginRight: 6, borderRadius: 6, background: cellBg(v) }} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 21, color: "#6f7c8e" }}>
          Historical context, not a prediction. · halvinglens.com/price/seasonality
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
