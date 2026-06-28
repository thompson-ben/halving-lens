import { ImageResponse } from "next/og";
import { accumulationSeries, accumulationRead, ACCUMULATION_BANDS, type AccumulationBandKey } from "@/lib/accumulation";
import { selectHistoricalNarrative } from "@/lib/contentCards";
import { brandFonts } from "@/lib/ogFonts";

// Public "Chart of the Day" for the daily email — the signature Accumulation
// Index timeline (BTC price, log, over colour-coded historical environment
// bands), in the email's dark + gold register. Public + dynamic so email
// clients can fetch it; the ?d=YYYY-MM-DD param busts the daily image cache.
// No auth needed — it only exposes a Bitcoin chart.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 968;
const H = 360;
const GOLD = "#d9b96a";

const COLOR: Record<AccumulationBandKey, string> = Object.fromEntries(
  ACCUMULATION_BANDS.map((b) => [b.key, b.color]),
) as Record<AccumulationBandKey, string>;

export async function GET() {
  const series = accumulationSeries();
  const read = accumulationRead();
  const title = selectHistoricalNarrative().title;

  const n = series.length;
  const prices = series.map((p) => p.price).filter((p) => p > 0);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const lnLo = Math.log(lo);
  const lnHi = Math.log(hi);
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * W : 0);
  const y = (p: number) => H - ((Math.log(Math.max(p, lo)) - lnLo) / (lnHi - lnLo || 1)) * H;

  // Run-length encode environment bands → shaded rects.
  const segs: { x1: number; x2: number; key: AccumulationBandKey }[] = [];
  for (let i = 0; i < n; i++) {
    const prev = segs[segs.length - 1];
    if (prev && prev.key === series[i].bandKey) prev.x2 = x(i);
    else segs.push({ x1: i > 0 ? x(i - 1) : 0, x2: x(i), key: series[i].bandKey });
  }

  // Downsample the price line for a clean stroke.
  const step = Math.max(1, Math.floor(n / 220));
  const pts: string[] = [];
  for (let i = 0; i < n; i += step) pts.push(`${x(i).toFixed(1)},${y(series[i].price).toFixed(1)}`);
  pts.push(`${x(n - 1).toFixed(1)},${y(series[n - 1].price).toFixed(1)}`);

  const fonts = brandFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0c10",
          padding: "44px 56px",
          fontFamily: "Inter",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 22, fontWeight: 700, letterSpacing: 4, color: "#f4f1ea" }}>
            <div style={{ display: "flex", width: 16, height: 16, background: GOLD, transform: "rotate(45deg)", marginRight: 16 }} />
            HALVINGLENS
          </div>
          <div style={{ display: "flex", fontSize: 18, letterSpacing: 3, color: GOLD }}>ACCUMULATION INDEX</div>
        </div>

        {/* Title */}
        <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 38, fontWeight: 600, color: "#f4f1ea", marginTop: 18, letterSpacing: -0.5 }}>
          {title}
        </div>

        {/* Chart */}
        <div style={{ display: "flex", marginTop: 20 }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <rect x={0} y={0} width={W} height={H} fill="#0c0f15" rx={12} />
            {segs.map((s, i) => (
              <rect key={i} x={s.x1} y={0} width={Math.max(0, s.x2 - s.x1)} height={H} fill={COLOR[s.key]} fillOpacity={0.15} />
            ))}
            <polyline points={pts.join(" ")} fill="none" stroke={GOLD} strokeWidth={3} strokeLinejoin="round" />
            <circle cx={x(n - 1)} cy={y(series[n - 1].price)} r={6} fill={GOLD} />
          </svg>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <div style={{ display: "flex", fontSize: 18, color: "#6b7079" }}>2012</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", width: 12, height: 12, borderRadius: 6, background: read.band.color }} />
            <div style={{ display: "flex", fontSize: 20, color: "#c2c6cf" }}>
              Today: {read.score}/100 · {read.band.label}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 18, color: "#6b7079" }}>today</div>
        </div>
      </div>
    ),
    { width: 1080, height: 600, ...(fonts.length ? { fonts } : {}) },
  );
}
