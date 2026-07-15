/* eslint-disable @next/next/no-img-element */
// Daily Content Pack — image templates.
//
// Pure presentational templates for the six carousel cards, rendered server-side
// by next/og (see the image route). Inline styles only (Satori), flexbox layout,
// 1080×1350 portrait (4:5) with generous safe margins. One consistent frame +
// header/footer treatment so the six cards read as a single professional deck.

import { ACCUMULATION_BANDS } from "./accumulation";
import type {
  AccumulationCardView,
  AccumulationOutcomesCardView,
  Card,
  CyclesPositionCard,
  CyclesSimilaritiesCard,
  CyclesDifferencesCard,
  CyclesContextCard,
  WeekCoverCard,
  WeekSnapshotCard,
  WeekChangedCard,
  WeekContextCard,
  CotwWhyCard,
  CotwContextCard,
  CotwTakeawayCard,
  ChangedCard,
  ChartLine,
  CtaCard,
  CycleTimingCard,
  CyclePositionCard,
  DrawdownsCard,
  EtfHeroCard,
  EtfTodayCard,
  EtfTrendCard,
  EtfContextCard,
  EtfWhyCard,
  FearGreedCard,
  FgVsPriceCard,
  HealthFactorsCard,
  HealthHistoryCard,
  HealthInterpretationCard,
  HeroCard,
  HistoryCard,
  MarketHealthCard,
  MetricIntroCard,
  MetricTextCard,
  MetricReadingCard,
  MetricHistoryCard,
  OverlayCard,
  PeakLowCard,
  SimilarMomentsCard,
  SimilarOutcomesCard,
  SimilarTop3Card,
  SimilarContextCard,
  TakeawayCard,
  WatchCard,
  WhatNextCard,
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
  today,
  width = 900,
  height = 520,
}: {
  lines: ChartLine[];
  yTicks?: { label: string; frac: number }[];
  today?: { x: number; y: number };
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
      {/* "You are here" — a vertical guide + dot at today's position. */}
      {today && (
        <>
          <line x1={today.x * width} y1={0} x2={today.x * width} y2={height} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
          <circle cx={today.x * width} cy={(1 - today.y) * height} r={11} fill="#ffffff" stroke="#070a0f" strokeWidth={4} />
        </>
      )}
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
      <Chart lines={c.lines} yTicks={c.yTicks} today={c.today} />
      <Legend items={[...c.lines.map((l) => ({ label: l.label, color: l.color })), ...(c.today ? [{ label: "Today", color: "#ffffff" }] : [])]} />
    </div>
  );
}

// ── Every Cycle Compared: current position stat grid ─────────────────────────
const CYCLES_TONE: Record<string, string> = { accent: ACCENT, green: "#3ddc97", amber: "#f5b942", red: "#ff5d5d", default: INK };
function CyclesPosition({ c }: { c: CyclesPositionCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Where Bitcoin sits today</Kicker>
      <div style={{ display: "flex", fontSize: 30, color: INK_DIM, marginTop: 14, marginBottom: 30, maxWidth: 900, lineHeight: 1.3 }}>
        {c.subtitle}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {c.stats.map((st) => (
          <div key={st.label} style={{ display: "flex", flexDirection: "column", gap: 10, width: "50%", marginBottom: 40 }}>
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase" }}>{st.label}</div>
            <div style={{ display: "flex", fontSize: 52, fontWeight: 700, color: CYCLES_TONE[st.tone ?? "default"] }}>{st.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Every Cycle Compared: observation lists (similarities / differences) ─────
function ObservationList({ kicker, title, items }: { kicker: string; title: string; items: { label: string; detail: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>{kicker}</Kicker>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 48, fontWeight: 700, color: INK, marginTop: 14, marginBottom: 30, lineHeight: 1.1 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, borderLeft: `5px solid ${ACCENT}`, paddingLeft: 26 }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: INK }}>{it.label}</div>
            <div style={{ display: "flex", fontSize: 26, color: INK_DIM, lineHeight: 1.35, maxWidth: 860 }}>{it.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function CyclesSimilarities({ c }: { c: CyclesSimilaritiesCard }) {
  return <ObservationList kicker="Biggest similarities" title="How this cycle rhymes with history" items={c.items} />;
}
function CyclesDifferences({ c }: { c: CyclesDifferencesCard }) {
  return <ObservationList kicker="Biggest differences" title="What makes this cycle different" items={c.items} />;
}

// ── Every Cycle Compared: history tells us / doesn't ─────────────────────────
function CyclesContext({ c }: { c: CyclesContextCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Historical context</Kicker>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 26, marginBottom: 30 }}>
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 2, color: "#3ddc97", textTransform: "uppercase" }}>What history tells us</div>
        <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 42, fontWeight: 600, color: INK, lineHeight: 1.25, maxWidth: 900 }}>{c.tells}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 2, color: "#f5b942", textTransform: "uppercase" }}>What it can&apos;t</div>
        <div style={{ display: "flex", fontSize: 30, color: INK_DIM, lineHeight: 1.35, maxWidth: 900 }}>{c.doesnt}</div>
      </div>
    </div>
  );
}

// ── This Week in the Bitcoin Cycle: cover ────────────────────────────────────
function WeekCover({ c }: { c: WeekCoverCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <div style={{ display: "flex", fontSize: 26, letterSpacing: 3, color: ACCENT, textTransform: "uppercase" }}>
        {c.edition != null ? `Weekly · Edition ${c.edition}` : "Weekly edition"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", fontFamily: DISPLAY, fontSize: 92, fontWeight: 700, letterSpacing: -2, lineHeight: 1.02, marginTop: 24 }}>
        <div style={{ display: "flex" }}>This Week</div>
        <div style={{ display: "flex" }}>in the</div>
        <div style={{ display: "flex", color: ACCENT }}>Bitcoin Cycle</div>
      </div>
      <div style={{ display: "flex", fontSize: 34, color: INK_DIM, marginTop: 40 }}>Week ending {c.weekEnding}</div>
      <div style={{ display: "flex", fontSize: 24, color: INK_FAINT, marginTop: 12 }}>Where the market stands — historical context, not prediction.</div>
    </div>
  );
}

// ── This Week: market snapshot (dashboard grid) ──────────────────────────────
function WeekSnapshot({ c }: { c: WeekSnapshotCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Market snapshot</Kicker>
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: 24 }}>
        {c.stats.map((st) => (
          <div key={st.label} style={{ display: "flex", flexDirection: "column", gap: 8, width: "50%", marginBottom: 34 }}>
            <div style={{ display: "flex", fontSize: 21, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase" }}>{st.label}</div>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: CYCLES_TONE[st.tone ?? "default"] }}>{st.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── This Week: what changed this week ────────────────────────────────────────
function WeekChanged({ c }: { c: WeekChangedCard }) {
  if (!c.available) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        <Kicker>What changed this week</Kicker>
        <div style={{ display: "flex", fontSize: 44, fontWeight: 600, marginTop: 24, maxWidth: 820, lineHeight: 1.25 }}>
          Not enough archived history yet — weekly changes fill in as the daily brief accumulates.
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>What changed this week</Kicker>
      <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 28 }}>
        {c.items.map((it, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, borderLeft: `5px solid ${DIR_COLOR[it.dir]}`, paddingLeft: 26 }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: INK }}>{it.label}</div>
            <div style={{ display: "flex", fontSize: 27, color: INK_DIM, lineHeight: 1.35, maxWidth: 860 }}>{it.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chart of the Week: why this chart ────────────────────────────────────────
function CotwWhy({ c }: { c: CotwWhyCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Why this chart</Kicker>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 52, fontWeight: 700, color: INK, marginTop: 14, marginBottom: 34, lineHeight: 1.08, maxWidth: 920 }}>
        {c.title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        {c.points.map((pt, i) => (
          <div key={i} style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
            <div style={{ display: "flex", width: 14, height: 14, borderRadius: 7, background: ACCENT, marginTop: 12, flexShrink: 0 }} />
            <div style={{ display: "flex", fontSize: 30, color: INK_DIM, lineHeight: 1.4, maxWidth: 880 }}>{pt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chart of the Week: historical context ────────────────────────────────────
function CotwContext({ c }: { c: CotwContextCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>{c.heading}</Kicker>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 42, fontWeight: 500, color: INK, marginTop: 30, lineHeight: 1.32, maxWidth: 920 }}>
        {c.text}
      </div>
    </div>
  );
}

// ── Chart of the Week: the one-line takeaway ─────────────────────────────────
function CotwTakeaway({ c }: { c: CotwTakeawayCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>The takeaway</Kicker>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 54, fontWeight: 600, lineHeight: 1.3, marginTop: 30, maxWidth: 900 }}>
        {c.text}
      </div>
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

// ── Historical drawdowns — "Is this drop normal?" ────────────────────────────
function ddText(n: number): string {
  return `${Math.round(n)}%`; // n is ≤ 0, so this yields e.g. "-24%" or "0%"
}
function Drawdowns({ c }: { c: DrawdownsCard }) {
  const maxMag = Math.max(1, ...c.rows.map((r) => Math.abs(r.stage)));
  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "33.33%" }}>
      <div style={{ display: "flex", fontSize: 20, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: "#ff7a7a" }}>{value}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Historical drawdowns</Kicker>
      <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: INK, marginTop: 12, marginBottom: 26, fontFamily: DISPLAY }}>
        Is this drop normal?
      </div>
      <div style={{ display: "flex", marginBottom: 34 }}>
        <Stat label="Current" value={ddText(c.current)} />
        <Stat label="Largest this cycle" value={ddText(c.largestThisCycle)} />
        <Stat label={`Avg at day ${c.cycleDay}`} value={ddText(c.avgAtStage)} />
      </div>
      <div style={{ display: "flex", fontSize: 20, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase", marginBottom: 16 }}>
        Drawdown at day {c.cycleDay} of each cycle
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {c.rows.map((r) => {
          const w = Math.max(5, (Math.abs(r.stage) / maxMag) * 100);
          return (
            <div key={r.label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", width: 14, height: 14, borderRadius: 7, background: r.color }} />
                  <div style={{ display: "flex", fontSize: 28, color: r.current ? INK : INK_DIM, fontWeight: r.current ? 700 : 400 }}>
                    {r.label}
                  </div>
                </div>
                <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: r.current ? ACCENT : INK_DIM }}>
                  {ddText(r.stage)}
                </div>
              </div>
              <div style={{ display: "flex", height: 14, borderRadius: 7, background: "rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", width: `${w}%`, height: 14, borderRadius: 7, background: r.current ? ACCENT : r.color, opacity: r.current ? 1 : 0.55 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", fontSize: 27, color: INK, marginTop: 30, lineHeight: 1.4, maxWidth: 920 }}>
        {c.takeaway}
      </div>
    </div>
  );
}

// ── Current position in cycle — "Where are we now?" ──────────────────────────
function CyclePosition({ c }: { c: CyclePositionCard }) {
  const TL_W = 920;
  const frac = (d: number) => Math.max(0, Math.min(1, d / c.axisMax));
  const px = (d: number) => frac(d) * TL_W;
  const peakX = px(c.peakStart);
  const peakW = Math.max(8, px(c.peakEnd) - px(c.peakStart));
  const lowX = px(c.lowStart);
  const lowW = Math.max(8, px(c.lowEnd) - px(c.lowStart));
  const pinX = px(c.todayDay);
  const chipLeft = Math.max(0, Math.min(TL_W - 250, pinX - 125));
  const Tag = ({ color, label }: { color: string; label: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", width: 22, height: 14, borderRadius: 4, background: color }} />
      <div style={{ display: "flex", fontSize: 23, color: INK_DIM }}>{label}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Current position in cycle</Kicker>
      <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: INK, marginTop: 12, marginBottom: 30, fontFamily: DISPLAY }}>
        Where are we now?
      </div>

      {/* Timeline (days since halving, 0 → axisMax) */}
      <div style={{ display: "flex", position: "relative", width: TL_W, height: 230 }}>
        {/* base track */}
        <div style={{ display: "flex", position: "absolute", left: 0, top: 138, width: TL_W, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.08)" }} />
        {/* historical top window */}
        <div style={{ display: "flex", position: "absolute", left: peakX, top: 132, width: peakW, height: 26, borderRadius: 6, background: "rgba(94,234,212,0.30)", border: `2px solid ${ACCENT}` }} />
        {/* historical low window */}
        <div style={{ display: "flex", position: "absolute", left: lowX, top: 132, width: lowW, height: 26, borderRadius: 6, background: "rgba(245,185,66,0.28)", border: "2px solid #f5b942" }} />
        {/* halving origin marker */}
        <div style={{ display: "flex", position: "absolute", left: 0, top: 120, width: 4, height: 50, background: "#e4e9f0" }} />
        {/* YOU ARE HERE marker line */}
        <div style={{ display: "flex", position: "absolute", left: pinX, top: 110, width: 4, height: 74, background: ACCENT }} />
        <div style={{ display: "flex", position: "absolute", left: pinX - 9, top: 100, width: 22, height: 22, borderRadius: 11, background: ACCENT }} />
        {/* YOU ARE HERE chip */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "absolute", left: chipLeft, top: 30, width: 250 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, fontWeight: 700, color: "#07110f", background: ACCENT, padding: "8px 16px", borderRadius: 8, textTransform: "uppercase" }}>
            You are here
          </div>
          <div style={{ display: "flex", fontSize: 26, color: INK, fontWeight: 700, marginTop: 8 }}>{c.todayLabel}</div>
        </div>
        {/* halving label */}
        <div style={{ display: "flex", position: "absolute", left: 0, top: 178, fontSize: 22, color: INK_FAINT }}>Halving · Day 0</div>
      </div>

      <div style={{ display: "flex", gap: 40, marginTop: 6 }}>
        <Tag color={ACCENT} label={`Bull-top window · ${c.peakLabel}`} />
        <Tag color="#f5b942" label={`Bear-low window · ${c.lowLabel}`} />
      </div>

      <div style={{ display: "flex", fontSize: 28, color: INK, marginTop: 30, lineHeight: 1.4, maxWidth: 920 }}>{c.position}</div>
      <div style={{ display: "flex", fontSize: 21, color: INK_FAINT, marginTop: 14, maxWidth: 920 }}>{c.note}</div>
    </div>
  );
}

// ── What happened next? — 30/60/90-day history at this cycle day ─────────────
function nextText(n: number | null): string {
  return n == null ? "—" : `${n >= 0 ? "+" : ""}${n}%`;
}
function nextColor(n: number | null): string {
  if (n == null) return INK_FAINT;
  return n > 0 ? DIR_COLOR.up : n < 0 ? DIR_COLOR.down : INK_DIM;
}
function WhatNext({ c }: { c: WhatNextCard }) {
  const Cell = ({ v, head, bold }: { v: string; head?: boolean; bold?: boolean }) => (
    <div style={{ display: "flex", width: "22%", justifyContent: "flex-end", fontSize: head ? 22 : 34, fontWeight: bold ? 700 : 600, color: head ? INK_FAINT : undefined, letterSpacing: head ? 1 : 0 }}>
      {v}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>What happened next?</Kicker>
      <div style={{ display: "flex", fontSize: 30, color: INK_DIM, marginTop: 14, marginBottom: 24 }}>
        Day {c.cycleDay} comparison · price change after this point in prior cycles
      </div>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", paddingBottom: 14, borderBottom: `1px solid ${HAIRLINE}` }}>
        <div style={{ display: "flex", width: "34%", fontSize: 22, letterSpacing: 1, color: INK_FAINT, textTransform: "uppercase" }}>Cycle</div>
        <Cell v="30d" head />
        <Cell v="60d" head />
        <Cell v="90d" head />
      </div>
      {c.rows.map((r) => (
        <div key={r.year} style={{ display: "flex", alignItems: "center", padding: "22px 0", borderBottom: `1px solid ${HAIRLINE}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, width: "34%" }}>
            <div style={{ display: "flex", width: 14, height: 14, borderRadius: 7, background: r.color }} />
            <div style={{ display: "flex", fontSize: 30, color: INK }}>{r.year} cycle</div>
          </div>
          <div style={{ display: "flex", width: "22%", justifyContent: "flex-end", fontSize: 34, fontWeight: 600, color: nextColor(r.d30) }}>{nextText(r.d30)}</div>
          <div style={{ display: "flex", width: "22%", justifyContent: "flex-end", fontSize: 34, fontWeight: 600, color: nextColor(r.d60) }}>{nextText(r.d60)}</div>
          <div style={{ display: "flex", width: "22%", justifyContent: "flex-end", fontSize: 34, fontWeight: 600, color: nextColor(r.d90) }}>{nextText(r.d90)}</div>
        </div>
      ))}
      {/* average */}
      <div style={{ display: "flex", alignItems: "center", padding: "24px 0" }}>
        <div style={{ display: "flex", width: "34%", fontSize: 30, fontWeight: 700, color: ACCENT }}>Average</div>
        <div style={{ display: "flex", width: "22%", justifyContent: "flex-end", fontSize: 34, fontWeight: 700, color: ACCENT }}>{nextText(c.avg30)}</div>
        <div style={{ display: "flex", width: "22%", justifyContent: "flex-end", fontSize: 34, fontWeight: 700, color: ACCENT }}>{nextText(c.avg60)}</div>
        <div style={{ display: "flex", width: "22%", justifyContent: "flex-end", fontSize: 34, fontWeight: 700, color: ACCENT }}>{nextText(c.avg90)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 18 }}>
        <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: INK }}>Historical context only. Not predictive.</div>
        <div style={{ display: "flex", fontSize: 22, color: INK_FAINT }}>Past cycles are not a forecast of this one.</div>
      </div>
    </div>
  );
}

// ── Similar moments (Slide 1) ────────────────────────────────────────────────
function SimilarMoments({ c }: { c: SimilarMomentsCard }) {
  const Cond = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "33.33%" }}>
      <div style={{ display: "flex", fontSize: 20, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: INK }}>{value}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Most similar historical moment</Kicker>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 50, fontWeight: 700, color: INK, marginTop: 12, marginBottom: 30, letterSpacing: -1 }}>
        Have we seen this before?
      </div>

      <div style={{ display: "flex", fontSize: 20, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase", marginBottom: 16 }}>
        Current conditions
      </div>
      <div style={{ display: "flex", marginBottom: 46 }}>
        <Cond label="Cycle day" value={String(c.cycleDay)} />
        <Cond label="Drawdown" value={`${Math.round(c.drawdown)}%`} />
        <Cond label="Fear & Greed" value={c.fearGreed != null ? String(c.fearGreed) : "—"} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 36, borderRadius: 18, background: "rgba(94,234,212,0.06)", border: "1px solid rgba(94,234,212,0.22)" }}>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, color: ACCENT, textTransform: "uppercase" }}>Closest historical match</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 78, fontWeight: 700, color: INK, letterSpacing: -1 }}>{c.matchLabel}</div>
          <div style={{ display: "flex", fontSize: 30, color: INK_DIM }}>{c.matchYear} cycle</div>
        </div>
        <div style={{ display: "flex", fontSize: 52, fontWeight: 700, color: ACCENT }}>{c.similarity}% similar</div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 30, fontSize: 26, color: INK_DIM }}>Swipe →</div>
    </div>
  );
}

// ── Similar moments — what happened next (Slide 2) ───────────────────────────
function SimilarOutcomes({ c }: { c: SimilarOutcomesCard }) {
  const txt = (n: number | null) => (n == null ? "—" : `${n >= 0 ? "+" : ""}${n}%`);
  const col = (n: number | null) => (n == null ? INK_FAINT : n > 0 ? DIR_COLOR.up : n < 0 ? DIR_COLOR.down : INK_DIM);
  const Row = ({ label, v }: { label: string; v: number | null }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "30px 0", borderBottom: `1px solid ${HAIRLINE}` }}>
      <div style={{ display: "flex", fontSize: 40, color: INK }}>{label}</div>
      <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: col(v) }}>{txt(v)}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>What happened next?</Kicker>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 50, fontWeight: 700, color: INK, marginTop: 12, marginBottom: 8, letterSpacing: -1 }}>
        After {c.matchLabel}
      </div>
      <div style={{ display: "flex", fontSize: 28, color: INK_DIM, marginBottom: 24 }}>
        How the {c.matchYear} cycle moved from that point
      </div>
      <Row label="Next 30 days" v={c.d30} />
      <Row label="Next 60 days" v={c.d60} />
      <Row label="Next 90 days" v={c.d90} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 34 }}>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: INK }}>Historical context only. Not predictive.</div>
        <div style={{ display: "flex", fontSize: 22, color: INK_FAINT }}>Past performance does not predict future results.</div>
      </div>
    </div>
  );
}

// ── Top 3 similar moments (Slide 2) ──────────────────────────────────────────
function SimilarTop3({ c }: { c: SimilarTop3Card }) {
  const max = Math.max(1, ...c.rows.map((r) => r.similarity));
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Similar moments</Kicker>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 50, fontWeight: 700, color: INK, marginTop: 12, marginBottom: 36, letterSpacing: -1 }}>
        Top 3 similar historical moments
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        {c.rows.map((r) => (
          <div key={r.rank} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: INK_FAINT, width: 40 }}>{r.rank}</div>
                <div style={{ display: "flex", width: 16, height: 16, borderRadius: 8, background: r.color }} />
                <div style={{ display: "flex", fontSize: 44, fontWeight: 600, color: INK }}>{r.label}</div>
                <div style={{ display: "flex", fontSize: 26, color: INK_DIM, marginLeft: 4 }}>{r.year} cycle</div>
              </div>
              <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: ACCENT }}>{r.similarity}%</div>
            </div>
            <div style={{ display: "flex", height: 14, borderRadius: 7, background: "rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", width: `${(r.similarity / max) * 100}%`, height: 14, borderRadius: 7, background: ACCENT }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", fontSize: 22, color: INK_FAINT, marginTop: 40 }}>
        Matched on cycle day, drawdown, price heat &amp; gain since halving · not sentiment.
      </div>
    </div>
  );
}

// ── Historical context (Slide 3) ─────────────────────────────────────────────
function SimilarContext({ c }: { c: SimilarContextCard }) {
  const Stat = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "50%", marginBottom: 32 }}>
      <div style={{ display: "flex", fontSize: 20, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: INK }}>{value}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Historical context</Kicker>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 50, fontWeight: 700, color: INK, marginTop: 12, marginBottom: 8, letterSpacing: -1 }}>
        {c.matchLabel}
      </div>
      <div style={{ display: "flex", fontSize: 28, color: INK_DIM, marginBottom: 30, maxWidth: 880, lineHeight: 1.4 }}>
        {c.context}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <Stat label="Price then" value={c.price} />
        <Stat label="Drawdown" value={`${Math.round(c.drawdown)}%`} />
        <Stat label="Mayer multiple" value={c.mayer.toFixed(2)} />
        <Stat label="Fear & Greed" value={c.fearGreed != null ? String(c.fearGreed) : "n/a (pre-2018)"} />
      </div>
    </div>
  );
}

// ── Accumulation Index — today's historical accumulation environment ─────────
function Accumulation({ c }: { c: AccumulationCardView }) {
  const score = Math.max(0, Math.min(100, c.score));
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Accumulation Index</Kicker>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 46, fontWeight: 700, color: INK, marginTop: 12, letterSpacing: -1 }}>
        Bitcoin Accumulation Index
      </div>

      {/* Score + band */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 28 }}>
        <div style={{ display: "flex", fontSize: 150, fontWeight: 700, color: c.bandColor, lineHeight: 1, fontFamily: DISPLAY }}>
          {c.score}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 30, color: INK_DIM }}>/ 100</div>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 700, color: c.bandColor }}>{c.bandLabel}</div>
        </div>
      </div>

      {/* Five-band meter with marker */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
        <div style={{ display: "flex", position: "relative", width: "100%" }}>
          <div style={{ display: "flex", width: "100%", height: 24, borderRadius: 12, overflow: "hidden" }}>
            {ACCUMULATION_BANDS.map((b) => (
              <div key={b.key} style={{ display: "flex", flex: 1, background: b.color, opacity: 0.88 }} />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: `${score}%`,
              top: -8,
              marginLeft: -20,
              width: 40,
              height: 40,
              borderRadius: 20,
              background: "#ffffff",
              border: "5px solid #070a0f",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 20, color: INK_FAINT, textTransform: "uppercase", letterSpacing: 1 }}>
          <div style={{ display: "flex" }}>Deep value</div>
          <div style={{ display: "flex" }}>Neutral</div>
          <div style={{ display: "flex" }}>Overheated</div>
        </div>
      </div>

      {/* Factor readings */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: 44 }}>
        {c.factors.map((f) => (
          <div
            key={f.label}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", borderBottom: `1px solid ${HAIRLINE}` }}
          >
            <div style={{ display: "flex", fontSize: 28, color: INK_DIM }}>{f.label}</div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: INK }}>{f.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", fontSize: 27, color: INK, marginTop: 36, lineHeight: 1.4, maxWidth: 920 }}>
        {c.takeaway}
      </div>
    </div>
  );
}

// ── Accumulation outcomes — "what happened when Bitcoin looked like this?" ───
function pctText(n: number | null): string {
  return n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toLocaleString()}%`;
}
function AccumulationOutcomes({ c }: { c: AccumulationOutcomesCardView }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Accumulation Index</Kicker>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 44, fontWeight: 700, color: INK, marginTop: 12, marginBottom: 8, letterSpacing: -1, lineHeight: 1.1 }}>
        What happened when Bitcoin looked like this?
      </div>
      <div style={{ display: "flex", fontSize: 26, color: INK_DIM, marginBottom: 26 }}>
        Median forward return by environment, across every cycle since 2012
      </div>

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", paddingBottom: 14, borderBottom: `1px solid ${HAIRLINE}` }}>
        <div style={{ display: "flex", width: "44%", fontSize: 21, letterSpacing: 1, color: INK_FAINT, textTransform: "uppercase" }}>Environment</div>
        <div style={{ display: "flex", width: "28%", justifyContent: "flex-end", fontSize: 21, letterSpacing: 1, color: INK_FAINT, textTransform: "uppercase" }}>1 year</div>
        <div style={{ display: "flex", width: "28%", justifyContent: "flex-end", fontSize: 21, letterSpacing: 1, color: INK_FAINT, textTransform: "uppercase" }}>2 years</div>
      </div>
      {c.rows.map((r) => (
        <div key={r.label} style={{ display: "flex", alignItems: "center", padding: "22px 0", borderBottom: `1px solid ${HAIRLINE}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, width: "44%" }}>
            <div style={{ display: "flex", width: 16, height: 16, borderRadius: 8, background: r.color }} />
            <div style={{ display: "flex", fontSize: 30, fontWeight: r.current ? 700 : 500, color: r.current ? INK : INK_DIM }}>{r.label}</div>
          </div>
          <div style={{ display: "flex", width: "28%", justifyContent: "flex-end", fontSize: 32, fontWeight: 600, color: r.current ? r.color : INK }}>{pctText(r.median1y)}</div>
          <div style={{ display: "flex", width: "28%", justifyContent: "flex-end", fontSize: 32, fontWeight: 600, color: r.current ? r.color : INK }}>{pctText(r.median2y)}</div>
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 30 }}>
        <div style={{ display: "flex", fontSize: 24, color: INK_DIM }}>Today:</div>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: c.todayBandColor }}>{c.todayBandLabel}</div>
      </div>
      <div style={{ display: "flex", fontSize: 23, color: INK_FAINT, marginTop: 16, lineHeight: 1.4, maxWidth: 920 }}>{c.takeaway}</div>
    </div>
  );
}

// ── Market Health pack (flagship) ────────────────────────────────────────────
function MarketHealth({ c }: { c: MarketHealthCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <div style={{ display: "flex", fontSize: 26, letterSpacing: 3, color: INK_FAINT, textTransform: "uppercase", marginBottom: 12 }}>
        Bitcoin Market Health
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
        <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 250, fontWeight: 700, letterSpacing: -6, lineHeight: 0.9, color: c.color }}>
          {c.score}
        </div>
        <div style={{ display: "flex", fontSize: 46, color: INK_DIM }}>/ 100</div>
      </div>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 68, fontWeight: 600, color: c.color, marginTop: 4 }}>{c.label}</div>
      <div style={{ display: "flex", width: "100%", height: 22, borderRadius: 11, background: "rgba(255,255,255,0.06)", marginTop: 42 }}>
        <div style={{ display: "flex", width: `${Math.max(2, Math.min(100, c.score))}%`, height: 22, borderRadius: 11, background: c.color }} />
      </div>
      <div style={{ display: "flex", fontSize: 30, color: INK_DIM, lineHeight: 1.4, marginTop: 40, maxWidth: 900 }}>{c.interpretation}</div>
    </div>
  );
}

function HealthFactors({ c }: { c: HealthFactorsCard }) {
  const color = DIR_COLOR[c.tone];
  const arrow = c.tone === "up" ? "▲" : "▼";
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>{c.heading}</Kicker>
      {c.rows.length === 0 ? (
        <div style={{ display: "flex", fontSize: 40, color: INK_DIM, marginTop: 28, maxWidth: 860, lineHeight: 1.3 }}>{c.empty}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
          {c.rows.map((r) => (
            <div key={r.label} style={{ display: "flex", flexDirection: "column", padding: "22px 0", borderBottom: `1px solid ${HAIRLINE}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "flex", fontSize: 30, color }}>{arrow}</div>
                  <div style={{ display: "flex", fontSize: 40, fontWeight: 600, color: INK }}>{r.label}</div>
                </div>
                <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color }}>{r.status}</div>
              </div>
              <div style={{ display: "flex", fontSize: 24, color: INK_DIM, marginTop: 8, maxWidth: 900, lineHeight: 1.35 }}>{r.explanation}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HealthHistory({ c }: { c: HealthHistoryCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Where today sits</Kicker>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 22 }}>
        <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 96, fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.score}</div>
        <div style={{ display: "flex", fontSize: 34, color: INK_DIM }}>/ 100 · {c.label}</div>
      </div>
      {/* Labelled 0-100 band scale; the active band is highlighted. */}
      <div style={{ display: "flex", width: "100%", marginTop: 48, borderRadius: 8, overflow: "hidden" }}>
        {c.bands.map((b) => (
          <div key={b.label} style={{ display: "flex", flexGrow: b.hi - b.lo + 1, height: 34, background: b.color, opacity: b.label === c.label ? 1 : 0.32 }} />
        ))}
      </div>
      {/* Marker at today's score across the full 0-100 width. */}
      <div style={{ display: "flex", position: "relative", width: "100%", height: 34, marginTop: 6 }}>
        <div style={{ position: "absolute", left: `${Math.max(0, Math.min(100, c.score))}%`, marginLeft: -3, display: "flex", width: 6, height: 34, background: "#ffffff", borderRadius: 3 }} />
      </div>
      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", marginTop: 8 }}>
        {c.bands.map((b) => (
          <div key={b.label} style={{ display: "flex", fontSize: 20, color: b.label === c.label ? INK : INK_FAINT }}>{b.label}</div>
        ))}
      </div>
      <div style={{ display: "flex", fontSize: 28, color: INK_DIM, lineHeight: 1.4, marginTop: 42, maxWidth: 900 }}>{c.note}</div>
    </div>
  );
}

function HealthInterpretation({ c }: { c: HealthInterpretationCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Interpretation</Kicker>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 54, fontWeight: 600, lineHeight: 1.3, marginTop: 30, maxWidth: 900 }}>{c.text}</div>
    </div>
  );
}

// ── ETF Flow pack ─────────────────────────────────────────────────────────────
function EtfHero({ c }: { c: EtfHeroCard }) {
  const color = c.dir === "up" ? DIR_COLOR.up : c.dir === "down" ? DIR_COLOR.down : INK;
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <div style={{ display: "flex", fontSize: 26, letterSpacing: 3, color: INK_FAINT, textTransform: "uppercase", marginBottom: 10 }}>
        Bitcoin ETF Flows
      </div>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 52, fontWeight: 600, color: INK, marginBottom: 34 }}>
        Today&apos;s institutional demand
      </div>
      <div style={{ display: "flex", fontSize: 30, color: INK_DIM, marginBottom: 10 }}>{c.dateLabel} · {c.headline}</div>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 148, fontWeight: 700, letterSpacing: -4, lineHeight: 0.95, color }}>
        {c.netFlow}
      </div>
      <div style={{ display: "flex", fontSize: 28, color: INK_DIM, marginTop: 28 }}>{c.cumulative}</div>
    </div>
  );
}

function EtfToday({ c }: { c: EtfTodayCard }) {
  const color = c.todayDir === "up" ? DIR_COLOR.up : c.todayDir === "down" ? DIR_COLOR.down : INK;
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Today&apos;s flows</Kicker>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 20 }}>
        <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 108, fontWeight: 700, letterSpacing: -3, lineHeight: 1, color }}>{c.today}</div>
        <div style={{ display: "flex", fontSize: 30, color: INK_DIM }}>net today</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 46 }}>
        {c.stats.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 0", borderBottom: `1px solid ${HAIRLINE}` }}>
            <div style={{ display: "flex", fontSize: 29, color: INK_DIM, maxWidth: 620 }}>{s.label}</div>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: DIR_COLOR[s.dir] }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EtfTrend({ c }: { c: EtfTrendCard }) {
  const Stat = ({ label, value, dir }: { label: string; value: string; dir: keyof typeof DIR_COLOR }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "50%" }}>
      <div style={{ display: "flex", fontSize: 24, letterSpacing: 2, color: INK_FAINT, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", fontSize: 54, fontWeight: 700, color: DIR_COLOR[dir] }}>{value}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Trend</Kicker>
      <div style={{ display: "flex", marginTop: 24, marginBottom: 32 }}>
        <Stat label="7-day net" value={c.week} dir={c.weekDir} />
        <Stat label="30-day net" value={c.month} dir={c.monthDir} />
      </div>
      <Chart lines={[c.line]} width={900} height={360} />
      <div style={{ display: "flex", fontSize: 24, color: INK_DIM, marginTop: 18 }}>{c.note}</div>
    </div>
  );
}

function EtfContext({ c }: { c: EtfContextCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Historical context</Kicker>
      <div style={{ display: "flex", flexDirection: "column", gap: 30, marginTop: 32, width: "100%" }}>
        {c.bars.map((b) => (
          <div key={b.label} style={{ display: "flex", flexDirection: "column", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <div style={{ display: "flex", fontSize: 27, color: b.highlight ? INK : INK_DIM }}>{b.label}</div>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: b.color }}>{b.value}</div>
            </div>
            <div style={{ display: "flex", width: "100%", height: 20, background: "rgba(255,255,255,0.06)", borderRadius: 10, marginTop: 10 }}>
              <div style={{ display: "flex", width: `${Math.max(2, Math.min(100, b.pct))}%`, height: 20, background: b.color, borderRadius: 10, opacity: b.highlight ? 1 : 0.7 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", fontSize: 30, color: ACCENT, marginTop: 44, maxWidth: 900, lineHeight: 1.35 }}>{c.note}</div>
    </div>
  );
}

function EtfWhy({ c }: { c: EtfWhyCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Why it matters</Kicker>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 60, fontWeight: 600, lineHeight: 1.15, marginTop: 24, maxWidth: 900, color: INK }}>
        {c.headline}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 42 }}>
        {c.points.map((p) => (
          <div key={p} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: 5, background: ACCENT }} />
            <div style={{ display: "flex", fontSize: 30, color: INK_DIM, maxWidth: 860 }}>{p}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Metric Deep Dive pack ─────────────────────────────────────────────────────
function MetricIntro({ c }: { c: MetricIntroCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <div style={{ display: "flex", alignSelf: "flex-start", fontSize: 22, fontWeight: 600, letterSpacing: 3, color: ACCENT, textTransform: "uppercase", border: `1px solid ${ACCENT}`, borderRadius: 8, padding: "8px 18px", marginBottom: 34 }}>
        {c.group} metric
      </div>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 96, fontWeight: 700, letterSpacing: -2, lineHeight: 1.02, color: INK }}>
        {c.question}
      </div>
      <div style={{ display: "flex", fontSize: 30, color: INK_DIM, marginTop: 28 }}>A HalvingLens metric deep dive · {c.short}</div>
    </div>
  );
}

function MetricText({ c }: { c: MetricTextCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>{c.heading}</Kicker>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 50, fontWeight: 600, lineHeight: 1.32, marginTop: 30, maxWidth: 920, color: INK }}>
        {c.text}
      </div>
    </div>
  );
}

function MetricReading({ c }: { c: MetricReadingCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>{c.name} · today</Kicker>
      <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 22 }}>
        <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 190, fontWeight: 700, letterSpacing: -5, lineHeight: 0.9, color: c.color }}>{c.value}</div>
      </div>
      <div style={{ display: "flex", fontFamily: DISPLAY, fontSize: 56, fontWeight: 600, color: c.color, marginTop: 8 }}>{c.zoneLabel}</div>
      <div style={{ display: "flex", fontSize: 30, color: INK_DIM, lineHeight: 1.4, marginTop: 38, maxWidth: 920 }}>{c.read}</div>
    </div>
  );
}

function MetricHistory({ c }: { c: MetricHistoryCard }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
      <Kicker>Historical zones · {c.valueLabel}</Kicker>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 22 }}>
        {c.rows.map((r) => (
          <div key={r.label + r.range} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0", borderBottom: `1px solid ${HAIRLINE}`, opacity: r.current ? 1 : 0.62 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", width: 16, height: 16, borderRadius: 8, background: r.color }} />
              <div style={{ display: "flex", fontSize: 34, fontWeight: r.current ? 700 : 500, color: r.current ? INK : INK_DIM }}>{r.label}</div>
              {r.current && <div style={{ display: "flex", fontSize: 20, color: ACCENT, letterSpacing: 2, textTransform: "uppercase" }}>· today</div>}
            </div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: r.current ? INK : INK_FAINT }}>{r.range}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", fontSize: 24, color: INK_DIM, marginTop: 30, maxWidth: 920, lineHeight: 1.35 }}>{c.note}</div>
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
      case "drawdowns":
        return card.body.available ? <Drawdowns c={card.body} /> : <Unavailable what="Historical drawdowns" />;
      case "cycle_position":
        return card.body.available ? <CyclePosition c={card.body} /> : <Unavailable what="Current position in cycle" />;
      case "what_next":
        return card.body.available ? <WhatNext c={card.body} /> : <Unavailable what="What happened next" />;
      case "similar_moments":
        return card.body.available ? <SimilarMoments c={card.body} /> : <Unavailable what="Similar moments" />;
      case "similar_outcomes":
        return card.body.available ? <SimilarOutcomes c={card.body} /> : <Unavailable what="Historical outcomes" />;
      case "similar_top3":
        return card.body.available ? <SimilarTop3 c={card.body} /> : <Unavailable what="Similar moments" />;
      case "similar_context":
        return card.body.available ? <SimilarContext c={card.body} /> : <Unavailable what="Historical context" />;
      case "accumulation":
        return <Accumulation c={card.body} />;
      case "accumulation_outcomes":
        return <AccumulationOutcomes c={card.body} />;
      case "market_health":
        return <MarketHealth c={card.body} />;
      case "health_strengths":
      case "health_watch":
        return <HealthFactors c={card.body} />;
      case "health_history":
        return <HealthHistory c={card.body} />;
      case "health_interpretation":
        return <HealthInterpretation c={card.body} />;
      case "etf_hero":
        return card.body.available ? <EtfHero c={card.body} /> : <Unavailable what="ETF flows" />;
      case "etf_today":
        return card.body.available ? <EtfToday c={card.body} /> : <Unavailable what="ETF flows" />;
      case "etf_trend":
        return card.body.available ? <EtfTrend c={card.body} /> : <Unavailable what="ETF flow trend" />;
      case "etf_context":
        return card.body.available ? <EtfContext c={card.body} /> : <Unavailable what="ETF flow history" />;
      case "etf_why":
        return card.body.available ? <EtfWhy c={card.body} /> : <Unavailable what="ETF flows" />;
      case "metric_intro":
        return <MetricIntro c={card.body} />;
      case "metric_definition":
      case "metric_why":
        return <MetricText c={card.body} />;
      case "metric_reading":
        return <MetricReading c={card.body} />;
      case "metric_history":
        return <MetricHistory c={card.body} />;
      case "cycles_position":
        return <CyclesPosition c={card.body} />;
      case "cycles_similarities":
        return <CyclesSimilarities c={card.body} />;
      case "cycles_differences":
        return <CyclesDifferences c={card.body} />;
      case "cycles_context":
        return <CyclesContext c={card.body} />;
      case "week_cover":
        return <WeekCover c={card.body} />;
      case "week_snapshot":
        return <WeekSnapshot c={card.body} />;
      case "week_changed":
        return <WeekChanged c={card.body} />;
      case "week_context":
        return <ObservationList kicker="Historical context" title="Where this week sits in history" items={card.body.items} />;
      case "cotw_why":
        return <CotwWhy c={card.body} />;
      case "cotw_context":
        return <CotwContext c={card.body} />;
      case "cotw_takeaway":
        return <CotwTakeaway c={card.body} />;
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
