/* eslint-disable @next/next/no-img-element */
// Daily Content Pack — image templates.
//
// Pure presentational templates for the six carousel cards, rendered server-side
// by next/og (see the image route). Inline styles only (Satori), flexbox layout,
// 1080×1350 portrait (4:5) with generous safe margins. One consistent frame +
// header/footer treatment so the six cards read as a single professional deck.

import type {
  Card,
  ChangedCard,
  ChartLine,
  CtaCard,
  CycleTimingCard,
  FearGreedCard,
  FgVsPriceCard,
  HeroCard,
  HistoryCard,
  OverlayCard,
  PeakLowCard,
  TakeawayCard,
  WatchCard,
} from "./contentCards";

const SENT_TONE: Record<string, string> = {
  red: "#ff5d5d",
  amber: "#f5b942",
  muted: "#9aa6b4",
  green: "#3ddc97",
  teal: "#5eead4",
};

export const CARD_W = 1080;
export const CARD_H = 1350;

const BG = "linear-gradient(165deg, #0d1219 0%, #0a0e14 58%, #070a0f 100%)";
const INK = "#f3f6fa";
const INK_DIM = "#9aa6b4";
const INK_FAINT = "#6f7c8e";
const ACCENT = "#5eead4";
const HAIRLINE = "rgba(255,255,255,0.08)";
const DIR_COLOR = { up: "#3ddc97", down: "#ff5d5d", flat: "#9aa6b4" } as const;

// Brand families registered on the ImageResponse (see lib/ogFonts.ts).
const SANS = "Inter";
const DISPLAY = "Fraunces"; // serif display — for editorial headlines

// ── Shared frame ─────────────────────────────────────────────────────────────
function Frame({ card, children }: { card: Card; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BG,
        padding: 80,
        fontFamily: SANS,
        color: INK,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: ACCENT }} />
          <div style={{ display: "flex", fontSize: 27, fontWeight: 600, color: "#e4e9f0" }}>
            halvinglens.com
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 21, letterSpacing: 3, color: INK_FAINT, textTransform: "uppercase" }}>
          {card.kicker}
        </div>
      </div>
      <div style={{ display: "flex", height: 1, background: HAIRLINE, marginTop: 28 }} />

      {/* Body */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingTop: 8 }}>{children}</div>

      {/* Footer */}
      <div style={{ display: "flex", height: 1, background: HAIRLINE, marginBottom: 26 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 9 }}>
          {Array.from({ length: card.total }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i + 1 === card.index ? 28 : 9,
                height: 9,
                borderRadius: 5,
                background: i + 1 === card.index ? ACCENT : "rgba(255,255,255,0.18)",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 19, color: INK_FAINT }}>
          Historical context · not financial advice
        </div>
      </div>
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: INK_FAINT, textTransform: "uppercase", marginTop: 36 }}>
      {children}
    </div>
  );
}

// ── 1. Hero summary ──────────────────────────────────────────────────────────
function Hero({ c }: { c: HeroCard }) {
  const Stat = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "50%", marginBottom: 44 }}>
      <div style={{ display: "flex", fontSize: 22, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ display: "flex", fontSize: 46, fontWeight: 600, color: color ?? INK }}>{value}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <div style={{ display: "flex", fontSize: 26, color: INK_DIM, marginBottom: 6 }}>{c.dateLabel}</div>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 76, fontWeight: 700, letterSpacing: -1, marginBottom: 6 }}>
        Bitcoin Cycle Brief
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginBottom: 54 }}>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: ACCENT }}>{c.score}</div>
        <div style={{ display: "flex", fontSize: 30, color: INK_DIM }}>/ 100 cycle score · {c.scoreLabel}</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <Stat label="BTC price" value={c.price} />
        <Stat label="Cycle day" value={`Day ${c.cycleDay} · ${c.progressPct}%`} />
        <Stat label="Sentiment" value={c.sentiment} />
        <Stat label="ETF flows" value={c.etf} color={c.etf.startsWith("Positive") ? DIR_COLOR.up : c.etf.startsWith("Negative") ? DIR_COLOR.down : INK} />
      </div>
    </div>
  );
}

// ── 2. What changed today ────────────────────────────────────────────────────
function Changed({ c }: { c: ChangedCard }) {
  if (!c.available) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        <Kicker>What changed today</Kicker>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 600, marginTop: 24, maxWidth: 820, lineHeight: 1.25 }}>
          First daily snapshot in the archive — day-over-day changes appear from tomorrow.
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>What changed today</Kicker>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 28 }}>
        {c.rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "26px 0",
              borderBottom: `1px solid ${HAIRLINE}`,
            }}
          >
            <div style={{ display: "flex", fontSize: 40, color: INK }}>{r.label}</div>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: DIR_COLOR[r.dir] }}>
              {r.value}
            </div>
          </div>
        ))}
      </div>
      {c.largest && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 44 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase" }}>
            Largest change
          </div>
          <div style={{ display: "flex", fontSize: 38, fontWeight: 600, color: ACCENT }}>{c.largest}</div>
        </div>
      )}
    </div>
  );
}

// ── 3. Today vs history ──────────────────────────────────────────────────────
function History({ c }: { c: HistoryCard }) {
  const max = Math.max(...c.rows.map((r) => parseFloat(r.value) || 0), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Today vs history</Kicker>
      <div style={{ display: "flex", fontSize: 30, color: INK_DIM, marginTop: 18, marginBottom: 30, maxWidth: 860 }}>
        {c.caption}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {c.rows.map((r) => {
          const v = parseFloat(r.value) || 0;
          const w = Math.max(6, (v / max) * 100);
          const color = r.current ? ACCENT : "rgba(255,255,255,0.32)";
          return (
            <div key={r.label} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", fontSize: 30, color: r.current ? INK : INK_DIM, fontWeight: r.current ? 600 : 400 }}>
                  {r.label}
                </div>
                <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: r.current ? ACCENT : INK }}>
                  {r.value}
                </div>
              </div>
              <div style={{ display: "flex", height: 14, borderRadius: 7, background: "rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", width: `${w}%`, height: 14, borderRadius: 7, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 4. What to watch next ────────────────────────────────────────────────────
function Watch({ c }: { c: WatchCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>What to watch next</Kicker>
      <div style={{ display: "flex", flexDirection: "column", gap: 36, marginTop: 36 }}>
        {c.rows.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 28, alignItems: "flex-start" }}>
            <div style={{ display: "flex", fontSize: 52, fontWeight: 700, color: ACCENT, lineHeight: 1, width: 56 }}>
              {i + 1}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              <div style={{ display: "flex", fontSize: 38, fontWeight: 600, color: INK, lineHeight: 1.2 }}>
                {r.signal}
              </div>
              <div style={{ display: "flex", fontSize: 27, color: INK_DIM, lineHeight: 1.3, maxWidth: 800 }}>
                {r.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 5. Key takeaway ──────────────────────────────────────────────────────────
function Takeaway({ c }: { c: TakeawayCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Key takeaway</Kicker>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 54, fontWeight: 600, lineHeight: 1.3, marginTop: 30, maxWidth: 900 }}>
        {c.text}
      </div>
    </div>
  );
}

// ── 6. Brand / CTA ───────────────────────────────────────────────────────────
function Cta({ c }: { c: CtaCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", fontFamily: DISPLAY, fontSize: 78, fontWeight: 700, letterSpacing: -1, lineHeight: 1.06 }}>
        <div style={{ display: "flex" }}>The clearest view</div>
        <div style={{ display: "flex", color: ACCENT }}>of the Bitcoin cycle.</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 56 }}>
        {c.features.map((f) => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ display: "flex", width: 12, height: 12, borderRadius: 6, background: ACCENT }} />
            <div style={{ display: "flex", fontSize: 36, color: INK }}>{f}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 64 }}>
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#e4e9f0" }}>halvinglens.com</div>
        <div style={{ display: "flex", fontSize: 30, color: INK_DIM }}>Join the free daily email list.</div>
      </div>
    </div>
  );
}

// ── Shared SVG line chart ────────────────────────────────────────────────────
function Chart({
  lines,
  yTicks,
  width = 900,
  height = 520,
}: {
  lines: ChartLine[];
  yTicks?: { label: string; frac: number }[];
  width?: number;
  height?: number;
}) {
  const toPts = (pts: [number, number][]) =>
    pts.map(([x, y]) => `${(x * width).toFixed(1)},${((1 - y) * height).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect x={0} y={0} width={width} height={height} fill="#0a0e14" rx={12} />
      {/* Gridlines only — Satori SVG can't render <text>, so axis labels live in
          the card subtitle / legend instead. */}
      {(yTicks ?? []).map((t, i) => (
        <line
          key={`t${i}`}
          x1={0}
          y1={(1 - t.frac) * height}
          x2={width}
          y2={(1 - t.frac) * height}
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={1}
        />
      ))}
      {lines.map((l, i) => (
        <polyline key={`l${i}`} points={toPts(l.points)} fill="none" stroke={l.color} strokeWidth={3.5} />
      ))}
    </svg>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 22, marginTop: 22 }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ display: "flex", width: 22, height: 5, borderRadius: 3, background: it.color }} />
          <div style={{ display: "flex", fontSize: 24, color: INK_DIM }}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Every halving cycle, lined up from day zero ──────────────────────────────
function Overlay({ c }: { c: OverlayCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Every cycle from day zero</Kicker>
      <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: INK, marginTop: 14, fontFamily: DISPLAY }}>
        Every halving cycle, lined up
      </div>
      <div style={{ display: "flex", fontSize: 26, color: INK_DIM, marginTop: 8, marginBottom: 22 }}>
        Price as a multiple of the halving price · log scale
        {c.yTicks.length ? ` · gridlines ${c.yTicks.map((t) => t.label).join(", ")}` : ""} · days since halving →
      </div>
      <Chart lines={c.lines} yTicks={c.yTicks} />
      <Legend items={c.lines.map((l) => ({ label: l.label, color: l.color }))} />
    </div>
  );
}

// ── When could the current cycle top & bottom? ───────────────────────────────
function CycleTimingTpl({ c }: { c: CycleTimingCard }) {
  const Window = ({ label, range, days, color }: { label: string; range: string; days: string; color: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 30, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 22 }}>
      <div style={{ display: "flex", fontSize: 22, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color }}>{range}</div>
      <div style={{ display: "flex", fontSize: 24, color: INK_DIM }}>{days}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Cycle top &amp; bottom</Kicker>
      <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: INK, marginTop: 14, marginBottom: 26, fontFamily: DISPLAY, lineHeight: 1.1 }}>
        When could this cycle top &amp; bottom?
      </div>
      <Window label="Historical bull-top window" range={c.peakRange} days={c.peakDays} color={ACCENT} />
      <Window label="Historical bear-low window" range={c.bottomRange} days={c.bottomDays} color="#f5b942" />
      <div style={{ display: "flex", fontSize: 26, color: INK, marginTop: 8 }}>{c.position}</div>
      <div style={{ display: "flex", fontSize: 21, color: INK_FAINT, marginTop: 14 }}>{c.note}</div>
    </div>
  );
}

// ── Peak & low windows ───────────────────────────────────────────────────────
function PeakLow({ c }: { c: PeakLowCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Peak &amp; low windows</Kicker>
      <div style={{ display: "flex", fontSize: 30, color: INK_DIM, marginTop: 14, marginBottom: 8 }}>
        When prior cycles made their bull high and bear low
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
        <div style={{ display: "flex", fontSize: 20, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase", paddingBottom: 12 }}>
          <div style={{ display: "flex", width: "40%" }}>Cycle</div>
          <div style={{ display: "flex", width: "30%" }}>Bull high</div>
          <div style={{ display: "flex", width: "30%" }}>Bear low</div>
        </div>
        {c.rows.map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", padding: "22px 0", borderTop: `1px solid ${HAIRLINE}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, width: "40%" }}>
              <div style={{ display: "flex", width: 14, height: 14, borderRadius: 7, background: r.color }} />
              <div style={{ display: "flex", fontSize: 28, color: INK }}>{r.label}</div>
            </div>
            <div style={{ display: "flex", fontSize: 24, color: INK_DIM, width: "30%" }}>{r.peak}</div>
            <div style={{ display: "flex", fontSize: 24, color: INK_DIM, width: "30%" }}>{r.low}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 40, marginTop: 34 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase" }}>Top window</div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: ACCENT }}>{c.peakWindow}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", fontSize: 20, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase" }}>Low window</div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#f5b942" }}>{c.bottomWindow}</div>
        </div>
      </div>
    </div>
  );
}

// ── Fear & Greed — what it's telling us ──────────────────────────────────────
function FearGreed({ c }: { c: FearGreedCard }) {
  const color = SENT_TONE[c.tone] ?? ACCENT;
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Fear &amp; Greed</Kicker>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 24 }}>
        <div style={{ display: "flex", fontSize: 150, fontWeight: 700, color, lineHeight: 1, fontFamily: DISPLAY }}>{c.value}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 30, color: INK_DIM }}>/ 100</div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color }}>{c.label}</div>
        </div>
      </div>
      {/* gauge */}
      <div style={{ display: "flex", width: "100%", height: 16, borderRadius: 8, marginTop: 40, background: "linear-gradient(90deg,#ff5d5d,#f5b942,#9aa6b4,#3ddc97,#5eead4)" }}>
        <div style={{ display: "flex", marginLeft: `${Math.max(0, Math.min(98, c.value))}%`, width: 6, height: 16, background: "#ffffff", borderRadius: 3 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 18, color: INK_FAINT }}>
        <div style={{ display: "flex" }}>Extreme fear</div>
        <div style={{ display: "flex" }}>Extreme greed</div>
      </div>
      <div style={{ display: "flex", fontSize: 28, color: INK, marginTop: 44, lineHeight: 1.4 }}>{c.summary}</div>
    </div>
  );
}

// ── Fear & Greed vs Bitcoin price — one price line, coloured by that day's F&G ─
function FgVsPrice({ c }: { c: FgVsPriceCard }) {
  const W = 900;
  const H = 520;
  const px = (x: number) => (x * W).toFixed(1);
  const py = (y: number) => ((1 - y) * H).toFixed(1);
  const bands = [
    { label: "Extreme fear", color: "#ff5d5d" },
    { label: "Fear", color: "#f5b942" },
    { label: "Neutral", color: "#9aa6b4" },
    { label: "Greed", color: "#3ddc97" },
    { label: "Extreme greed", color: "#5eead4" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Fear &amp; Greed vs price</Kicker>
      <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: INK, marginTop: 14, fontFamily: DISPLAY }}>
        Fear &amp; Greed vs Bitcoin price
      </div>
      <div style={{ display: "flex", fontSize: 26, color: INK_DIM, marginTop: 8, marginBottom: 22 }}>
        Bitcoin price (log), coloured by that day&apos;s Fear &amp; Greed · {c.priceRange}
      </div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect x={0} y={0} width={W} height={H} fill="#0a0e14" rx={12} />
        {c.points.slice(0, -1).map((p, i) => {
          const n = c.points[i + 1];
          return (
            <line
              key={i}
              x1={px(p.x)}
              y1={py(p.y)}
              x2={px(n.x)}
              y2={py(n.y)}
              stroke={p.color}
              strokeWidth={5}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <Legend items={bands} />
      <div style={{ display: "flex", fontSize: 21, color: INK_FAINT, marginTop: 18 }}>
        Extremes matter most — euphoria has clustered near tops, deep fear near lows.
      </div>
    </div>
  );
}

function Unavailable({ what }: { what: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: INK_DIM, maxWidth: 820, lineHeight: 1.3 }}>
        {what} isn&apos;t available yet — it will appear here once the data is connected.
      </div>
    </div>
  );
}

export function renderCard(card: Card): React.ReactElement {
  const body = (() => {
    switch (card.body.kind) {
      case "hero":
        return <Hero c={card.body} />;
      case "changed":
        return <Changed c={card.body} />;
      case "history":
        return <History c={card.body} />;
      case "cycle_overlay":
        return card.body.available ? <Overlay c={card.body} /> : <Unavailable what="The cycle overlay" />;
      case "cycle_timing":
        return card.body.available ? <CycleTimingTpl c={card.body} /> : <Unavailable what="Cycle timing" />;
      case "peak_low_windows":
        return card.body.available ? <PeakLow c={card.body} /> : <Unavailable what="Peak & low windows" />;
      case "fear_greed":
        return card.body.available ? <FearGreed c={card.body} /> : <Unavailable what="Fear & Greed" />;
      case "fear_greed_vs_price":
        return card.body.available ? <FgVsPrice c={card.body} /> : <Unavailable what="Fear & Greed vs price" />;
      case "watch":
        return <Watch c={card.body} />;
      case "takeaway":
        return <Takeaway c={card.body} />;
      case "cta":
        return <Cta c={card.body} />;
    }
  })();
  return <Frame card={card}>{body}</Frame>;
}
