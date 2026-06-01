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
  CtaCard,
  HeroCard,
  HistoryCard,
  TakeawayCard,
  WatchCard,
} from "./contentCards";

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

export function renderCard(card: Card): React.ReactElement {
  const body = (() => {
    switch (card.body.kind) {
      case "hero":
        return <Hero c={card.body} />;
      case "changed":
        return <Changed c={card.body} />;
      case "history":
        return <History c={card.body} />;
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
