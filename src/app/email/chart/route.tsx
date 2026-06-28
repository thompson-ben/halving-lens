import { ImageResponse } from "next/og";
import { accumulationSeries, accumulationRead, ACCUMULATION_BANDS, type AccumulationBandKey } from "@/lib/accumulation";
import { featureHeroNarrative } from "@/lib/editorial";
import { similarMoments } from "@/lib/similarity";
import { drawdownAnalysis } from "@/lib/drawdowns";
import { sentimentRead, SENTIMENT_AVAILABLE } from "@/lib/sentiment";
import { brandFonts } from "@/lib/ogFonts";

// The rotating "wow" hero visual for the daily email — a signature HalvingLens
// chart, selected by the day's strongest narrative (Similar Moments → Position
// → Drawdowns → Fear & Greed → Cycle context). Magazine-cover scale, dark+gold.
// Public + dynamic so email clients can fetch it; ?d=YYYY-MM-DD busts the daily
// image cache. Exposes only a Bitcoin chart — no auth needed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIZE = { width: 1200, height: 680 };
const BG = "#0a0c10";
const PANEL = "#0c0f15";
const INK = "#f4f1ea";
const SUB = "#c2c6cf";
const DIM = "#8c919c";
const FAINT = "#6b7079";
const GOLD = "#d9b96a";
const SENT_COLOR: Record<string, string> = { red: "#e8786f", amber: "#e0a64f", muted: "#9aa0aa", green: "#5fd0a0", teal: "#56c7c7" };

const label = (t: string, color = FAINT, size = 18) => ({
  display: "flex",
  fontSize: size,
  letterSpacing: 3,
  textTransform: "uppercase" as const,
  color,
});

function Frame({ tag, title, children }: { tag: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, padding: "52px 60px", fontFamily: "Inter" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 20, fontWeight: 700, letterSpacing: 4, color: INK }}>
          <div style={{ display: "flex", width: 15, height: 15, background: GOLD, transform: "rotate(45deg)", marginRight: 16 }} />
          HALVINGLENS RESEARCH
        </div>
        <div style={label(tag, GOLD, 17)}>{tag}</div>
      </div>
      <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 46, fontWeight: 600, color: INK, marginTop: 22, letterSpacing: -0.6, lineHeight: 1.05 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", marginTop: 8 }}>{children}</div>
    </div>
  );
}

// Horizontal bar row (HTML — lets us include labels Satori can't put in <svg>).
function Bar({ name, pct, value, color, strong }: { name: string; pct: number; value: string; color: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
      <div style={{ display: "flex", width: 150, fontSize: 24, fontWeight: strong ? 700 : 500, color: strong ? INK : SUB }}>{name}</div>
      <div style={{ display: "flex", flex: 1, height: 26, background: "#1a1e26", borderRadius: 13, marginRight: 18 }}>
        <div style={{ display: "flex", width: `${Math.max(2, pct)}%`, height: 26, background: color, borderRadius: 13, opacity: strong ? 1 : 0.7 }} />
      </div>
      <div style={{ display: "flex", width: 110, justifyContent: "flex-end", fontSize: 26, fontWeight: 700, color: strong ? color : SUB }}>{value}</div>
    </div>
  );
}

export async function GET() {
  const narrative = featureHeroNarrative();
  const fonts = brandFonts();
  const opts = { ...SIZE, ...(fonts.length ? { fonts } : {}) };

  // ── Similar Moments hero ───────────────────────────────────────────────────
  if (narrative === "similar") {
    const top3 = similarMoments(3);
    const top = top3[0];
    const max = Math.max(...top3.map((m) => m.similarity), 1);
    return new ImageResponse(
      (
        <Frame tag="Similar Moments" title="What this moment rhymes with">
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 30 }}>
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 120, fontWeight: 700, color: GOLD, lineHeight: 1 }}>{top?.similarity ?? 0}%</div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 22 }}>
              <div style={{ display: "flex", fontSize: 26, color: DIM }}>match to</div>
              <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 44, fontWeight: 600, color: INK }}>{top?.dateLabel ?? "—"}</div>
            </div>
          </div>
          {top3.map((m, i) => (
            <Bar key={i} name={m.dateLabel} pct={(m.similarity / max) * 100} value={`${m.similarity}%`} color={GOLD} strong={i === 0} />
          ))}
        </Frame>
      ),
      opts,
    );
  }

  // ── Historical Drawdowns hero ──────────────────────────────────────────────
  if (narrative === "drawdown") {
    const dd = drawdownAnalysis();
    const rows = dd.rows;
    const max = Math.max(...rows.map((r) => Math.abs(r.drawdownAtStage)), 1);
    return new ImageResponse(
      (
        <Frame tag="Historical Drawdowns" title="Is this drop normal?">
          <div style={{ display: "flex", fontSize: 24, color: DIM, marginBottom: 26 }}>
            Drawdown from the cycle high at day {dd.cycleDay} of each cycle
          </div>
          {rows.map((r, i) => (
            <Bar
              key={i}
              name={r.year}
              pct={(Math.abs(r.drawdownAtStage) / max) * 100}
              value={`${Math.round(r.drawdownAtStage)}%`}
              color={r.isCurrent ? GOLD : "#e8786f"}
              strong={r.isCurrent}
            />
          ))}
        </Frame>
      ),
      opts,
    );
  }

  // ── Fear & Greed hero ──────────────────────────────────────────────────────
  if (narrative === "fear_greed" && SENTIMENT_AVAILABLE) {
    const sr = sentimentRead();
    const v = sr ? sr.value : 50;
    const col = sr ? SENT_COLOR[sr.band.tone] ?? GOLD : GOLD;
    return new ImageResponse(
      (
        <Frame tag="Fear & Greed" title="What sentiment is telling us">
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 40 }}>
            <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 150, fontWeight: 700, color: col, lineHeight: 1 }}>{v}</div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 24 }}>
              <div style={{ display: "flex", fontSize: 28, color: DIM }}>/ 100</div>
              <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 46, fontWeight: 600, color: col }}>{sr ? sr.band.label : "—"}</div>
            </div>
          </div>
          <div style={{ display: "flex", position: "relative", width: "100%" }}>
            <div style={{ display: "flex", width: "100%", height: 22, borderRadius: 11, background: "linear-gradient(90deg,#e8786f,#e0a64f,#9aa0aa,#5fd0a0,#56c7c7)" }} />
            <div style={{ position: "absolute", left: `${Math.max(0, Math.min(100, v))}%`, top: -7, marginLeft: -18, display: "flex", width: 36, height: 36, borderRadius: 18, background: "#fff", border: "5px solid #0a0c10" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 20, color: FAINT }}>
            <div style={{ display: "flex" }}>Extreme fear</div>
            <div style={{ display: "flex" }}>Extreme greed</div>
          </div>
        </Frame>
      ),
      opts,
    );
  }

  // ── Cycle context / default — the Accumulation Index timeline (signature) ───
  const series = accumulationSeries();
  const read = accumulationRead();
  const color = Object.fromEntries(ACCUMULATION_BANDS.map((b) => [b.key, b.color])) as Record<AccumulationBandKey, string>;
  const n = series.length;
  const W = 1080;
  const H = 360;
  const lo = Math.min(...series.map((p) => p.price));
  const hi = Math.max(...series.map((p) => p.price));
  const lnLo = Math.log(lo);
  const lnHi = Math.log(hi);
  const X = (i: number) => (i / (n - 1)) * W;
  const Y = (p: number) => H - ((Math.log(Math.max(p, lo)) - lnLo) / (lnHi - lnLo || 1)) * H;
  const segs: { x1: number; x2: number; key: AccumulationBandKey }[] = [];
  for (let i = 0; i < n; i++) {
    const prev = segs[segs.length - 1];
    if (prev && prev.key === series[i].bandKey) prev.x2 = X(i);
    else segs.push({ x1: i > 0 ? X(i - 1) : 0, x2: X(i), key: series[i].bandKey });
  }
  const step = Math.max(1, Math.floor(n / 240));
  const pts: string[] = [];
  for (let i = 0; i < n; i += step) pts.push(`${X(i).toFixed(1)},${Y(series[i].price).toFixed(1)}`);
  pts.push(`${X(n - 1).toFixed(1)},${Y(series[n - 1].price).toFixed(1)}`);

  return new ImageResponse(
    (
      <Frame tag="Cycle Context" title="Where today sits in Bitcoin's history">
        <div style={{ display: "flex" }}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <rect x={0} y={0} width={W} height={H} fill={PANEL} rx={12} />
            {segs.map((s, i) => (
              <rect key={i} x={s.x1} y={0} width={Math.max(0, s.x2 - s.x1)} height={H} fill={color[s.key]} fillOpacity={0.15} />
            ))}
            <polyline points={pts.join(" ")} fill="none" stroke={GOLD} strokeWidth={3} strokeLinejoin="round" />
            <circle cx={X(n - 1)} cy={Y(series[n - 1].price)} r={6} fill={GOLD} />
          </svg>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
          <div style={{ display: "flex", fontSize: 18, color: FAINT }}>2012</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", width: 12, height: 12, borderRadius: 6, background: read.band.color }} />
            <div style={{ display: "flex", fontSize: 20, color: SUB }}>Today: {read.score}/100 · {read.band.label}</div>
          </div>
          <div style={{ display: "flex", fontSize: 18, color: FAINT }}>today</div>
        </div>
      </Frame>
    ),
    opts,
  );
}
