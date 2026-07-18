import { ImageResponse } from "next/og";
import { pathExplorer } from "@/lib/pathExplorer";
import { markGlyphDataUri } from "@/lib/brandMark";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";
export const alt = "Historical Path Explorer — how Bitcoin actually travelled from here in previous cycles — halvinglens.com";

// Social share card for /historical-price-paths. Renders the Path Explorer as
// an inline SVG (embedded via a data URI, which Satori renders reliably), so the
// signature visual — real rebased cycle paths from today's equivalent point —
// travels with every shared link. Historical evidence, not prediction.
function chartSvg(): string {
  const p = pathExplorer();
  const W = 1040;
  const H = 300;
  const pad = { l: 8, r: 8, t: 10, b: 10 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const allPct = p.paths.flatMap((c) => c.points.map((pt) => pt.pct));
  const lo = Math.min(100, ...allPct);
  const hi = Math.max(100, ...allPct);
  const rng = hi - lo || 1;
  const x = (day: number) => pad.l + (day / p.windowDays) * plotW;
  const y = (pct: number) => pad.t + (1 - (pct - lo) / rng) * plotH;

  const baseline = `<line x1="${pad.l}" y1="${y(100).toFixed(1)}" x2="${(W - pad.r).toFixed(1)}" y2="${y(100).toFixed(1)}" stroke="rgba(255,255,255,0.22)" stroke-width="1.5" stroke-dasharray="4 4"/>`;
  const lines = p.paths
    .map((c) => {
      const pts = c.points.map((pt) => `${x(pt.day).toFixed(1)},${y(pt.pct).toFixed(1)}`).join(" ");
      const dash = c.pastPeak ? `stroke-dasharray="7 5" stroke-opacity="0.6"` : "";
      const w = c.pastPeak ? 2.5 : 4;
      return `<polyline points="${pts}" fill="none" stroke="${c.color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${dash}/>`;
    })
    .join("");
  const origin = `<circle cx="${x(0).toFixed(1)}" cy="${y(100).toFixed(1)}" r="7" fill="#5eead4"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${baseline}${lines}${origin}</svg>`;
}

export default async function Image() {
  const p = pathExplorer();
  const svg = chartSvg();
  // base64 data URI is the most robust form for @vercel/og (Satori/resvg).
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const stillClimbing = p.paths.filter((c) => !c.pastPeak).length;

  // NB: never hand Satori a style value of `undefined` — it calls .trim() on
  // style values and crashes. Convey "past peak" with opacity + text, not a
  // conditionally-undefined borderTop.
  const Legend = ({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 24, height: 4, borderRadius: 2, background: color, opacity: dashed ? 0.5 : 1 }} />
      <div style={{ display: "flex", fontSize: 20, color: "#bfc7d2" }}>
        {label}
        {dashed ? " (past peak)" : ""}
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(160deg, #0c1118 0%, #0a0e14 60%, #070a0f 100%)", padding: 56, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={markGlyphDataUri(30)} width={30} height={30} alt="" />
            <div style={{ display: "flex", fontSize: 26, color: "#e4e9f0", fontWeight: 600 }}>halvinglens.com</div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#6f7c8e", letterSpacing: 3 }}>HISTORICAL PATH EXPLORER</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", fontSize: 38, color: "#f3f6fa", fontWeight: 700, letterSpacing: -0.5 }}>
              How Bitcoin actually travelled from here
            </div>
            {/* Live anchor — cycle day + how many prior cycles were still rising */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 6, paddingBottom: 6, paddingLeft: 16, paddingRight: 16, borderRadius: 999, border: "1px solid rgba(94,234,212,0.3)", background: "rgba(94,234,212,0.08)" }}>
              <div style={{ display: "flex", fontSize: 22, color: "#5eead4", fontWeight: 700 }}>Day {p.cycleDay}</div>
              <div style={{ display: "flex", fontSize: 20, color: "#9aa6b4" }}>· {stillClimbing}/{p.paths.length} still climbing</div>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUri} width={1040} height={288} alt="" />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 22 }}>
            {p.paths.map((c) => (
              <Legend key={c.cycleId} color={c.color} label={`${c.label}`} dashed={c.pastPeak} />
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "#6f7c8e" }}>Real cycle paths, rebased to today. Not a forecast.</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
