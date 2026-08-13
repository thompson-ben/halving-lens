// MW2-B — Satori templates for the Metric Content Pack.
//
// Layout only: every string and number arrives on the MW2-A payload, which
// quotes the canonical V2.1 authorities — nothing here computes, ranks or
// interprets. 1080×1350 (the studio's Instagram-portrait standard), the
// cardSystem tokens, and the standing creative law the type scale encodes:
// ONE dominant hook per card. Per the founder's amendment that hook is the
// selected-period MOVEMENT — the story that made the card deserve
// attention — with the current value + canonical state word as support.
//
// Standalone-first: no pagination dots (cards work alone or in any
// cherry-picked carousel order; position treatment is an MW2-C decision).
// Emphasis follows SIGNIFICANCE, never direction: the movement prints in
// neutral ink with its sign; only the band word carries the editorial
// gold, and only at Unusual/Exceptional.

import { T } from "./cardSystem";
import type { AnyCardPayload, EtfCardPayload, MetricCardPayload } from "./metricCards";

export const METRIC_CARD_W = 1080;
export const METRIC_CARD_H = 1350;

/** The site's editorial colour (SB6a) — significance accent only. */
const EDITORIAL = "#d9b96a";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** MW2 chrome — the studio Frame's header/footer treatment without
 *  pagination dots (standalone-first). */
function Mw2Frame({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: T.bg,
        padding: 80,
        fontFamily: T.sans,
        color: T.ink,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: T.accent }} />
          <div style={{ display: "flex", fontSize: 27, fontWeight: 600, color: "#e4e9f0" }}>halvinglens.com</div>
        </div>
        <div style={{ display: "flex", fontSize: 21, letterSpacing: 3, textTransform: "uppercase", color: T.inkFaint }}>{kicker}</div>
      </div>
      <div style={{ display: "flex", height: 1, background: T.hairline, marginTop: 28 }} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>{children}</div>
      <div style={{ display: "flex", height: 1, background: T.hairline, marginBottom: 24 }} />
      <div style={{ display: "flex", fontSize: 19, color: T.inkFaint }}>Historical context · not financial advice</div>
    </div>
  );
}

/** Quiet spark — Satori polyline over the payload's 28-point array. */
function Spark({ data, width = 920, height = 150 }: { data: readonly number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * width).toFixed(1)},${(height - 6 - ((v - min) / span) * (height - 12)).toFixed(1)}`)
    .join(" ");
  const last = data[data.length - 1];
  const lx = width;
  const ly = height - 6 - ((last - min) / span) * (height - 12);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts} fill="none" stroke={T.accent} strokeWidth="4" opacity="0.85" />
      <circle cx={lx - 2} cy={ly} r="7" fill={T.accent} />
    </svg>
  );
}

/** Hero movement sizing — one dominant numeral, adaptive so long unit
 *  strings ("−0.01 points") still dominate without clipping. */
const heroSize = (s: string): number => (s.length <= 7 ? 210 : s.length <= 11 ? 150 : 112);

export function MetricSocialCard({ card, showStateWord = true }: { card: MetricCardPayload; showStateWord?: boolean }) {
  const gold = card.bandTone === "gold";
  return (
    <Mw2Frame kicker={`Metric watch · ${prettyDate(card.asOf)}`}>
      {/* WHAT we are discussing */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: 56 }}>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, fontFamily: T.display, color: T.ink }}>{card.label}</div>
        <div style={{ display: "flex", fontSize: T.type.meta, color: T.inkFaint, marginTop: 10 }}>{card.what}</div>
      </div>

      {/* HERO — the story: the selected-period movement */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: 64 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 30 }}>
          <div style={{ display: "flex", fontSize: heroSize(card.heroMovement), fontWeight: 700, fontFamily: T.display, color: T.ink, letterSpacing: -3 }}>
            {card.heroMovement}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 14 }}>
          <div style={{ display: "flex", fontSize: T.type.body, letterSpacing: 4, textTransform: "uppercase", color: T.inkDim }}>{card.heroPeriodLabel}</div>
          {card.bandWord && (
            <div
              style={{
                display: "flex",
                fontSize: T.type.body,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: gold ? EDITORIAL : T.inkFaint,
                fontWeight: 600,
              }}
            >
              {card.bandWord}
            </div>
          )}
        </div>
      </div>

      {/* SUPPORT — where it is now */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 52 }}>
        <div style={{ display: "flex", fontSize: T.type.insight, fontWeight: 600, color: T.ink }}>{card.valueLabel}</div>
        {showStateWord && card.stateWord && (
          <div style={{ display: "flex", fontSize: T.type.insight, color: T.inkDim }}>· {card.stateWord}</div>
        )}
      </div>

      {/* WHY it surfaced — canonical meaning + evidence (or the maturing
          note). A real flex-column wrapper, never a fragment: Satori
          stacks fragment children on top of each other. */}
      {card.reasonForAttention ? (
        <div style={{ display: "flex", flexDirection: "column", marginTop: 34, gap: 12 }}>
          <div style={{ display: "flex", fontSize: T.type.insight, color: "#cdd6e0", lineHeight: 1.35 }}>{card.reasonForAttention.meaning}</div>
          <div style={{ display: "flex", fontSize: T.type.meta, color: T.inkFaint }}>{card.reasonForAttention.evidence}</div>
        </div>
      ) : card.maturingNote ? (
        <div style={{ display: "flex", marginTop: 34, fontSize: T.type.meta, color: T.inkFaint }}>{card.maturingNote}</div>
      ) : null}

      {/* Spark + context tail */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 16 }}>
        <Spark data={card.spark} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ display: "flex", fontSize: T.type.meta, color: T.inkFaint }}>
            {card.otherPeriods.map((o) => `${o.period === 1 ? "1D" : o.period === 7 ? "7D" : "30D"} ${o.movement}`).join(" · ")}
          </div>
          {card.honestyTail && <div style={{ display: "flex", fontSize: 19, color: T.inkFaint }}>{card.honestyTail}</div>}
        </div>
      </div>
    </Mw2Frame>
  );
}

/** ETF — Route B: the canonical flow grammar, trading-day language, no
 *  band word (no invented flow thresholds). */
export function EtfSocialCard({ card }: { card: EtfCardPayload }) {
  const maxAbs = Math.max(...card.bars.map((b) => Math.abs(b.netFlow)), 1);
  const chartH = 240;
  const zero = chartH / 2;
  return (
    <Mw2Frame kicker={`Metric watch · ${card.asOf ? prettyDate(card.asOf) : ""}`}>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 56 }}>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 700, fontFamily: T.display, color: T.ink }}>ETF demand</div>
        <div style={{ display: "flex", fontSize: T.type.meta, color: T.inkFaint, marginTop: 10 }}>{card.what}</div>
      </div>

      {/* HERO — the trading-day net */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: 60 }}>
        <div style={{ display: "flex", fontSize: heroSize(card.heroNetLabel), fontWeight: 700, fontFamily: T.display, color: T.ink, letterSpacing: -3 }}>
          {card.heroNetLabel}
        </div>
        <div style={{ display: "flex", fontSize: T.type.body, letterSpacing: 4, textTransform: "uppercase", color: T.inkDim, marginTop: 14 }}>
          {card.heroPeriodLabel}
        </div>
      </div>

      {/* CHANGE */}
      {card.prevNetLabel && card.deltaLabel && (
        <div style={{ display: "flex", flexDirection: "column", marginTop: 44, gap: 8 }}>
          <div style={{ display: "flex", fontSize: T.type.insight, color: "#cdd6e0" }}>Previous 7 trading days: {card.prevNetLabel}</div>
          <div style={{ display: "flex", fontSize: T.type.insight, color: "#cdd6e0" }}>Change: {card.deltaLabel}</div>
        </div>
      )}

      {/* COMPOSITION — diverging daily bars around a zero line */}
      <div style={{ display: "flex", marginTop: 48 }}>
        <svg width={920} height={chartH} viewBox={`0 0 920 ${chartH}`}>
          <line x1="0" y1={zero} x2="920" y2={zero} stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
          {card.bars.map((b, i) => {
            const bw = Math.floor(920 / card.bars.length) - 18;
            const x = i * Math.floor(920 / card.bars.length) + 9;
            const mag = (Math.abs(b.netFlow) / maxAbs) * (zero - 8);
            const y = b.netFlow >= 0 ? zero - mag : zero;
            return <rect key={b.date} x={x} y={y} width={bw} height={Math.max(3, mag)} rx="3" fill={b.netFlow >= 0 ? T.green : T.red} fillOpacity="0.85" />;
          })}
        </svg>
      </div>

      {/* CONCENTRATION + CONTEXT — verbatim */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 12 }}>
        {card.concentrationLine && <div style={{ display: "flex", fontSize: T.type.insight, color: "#cdd6e0", lineHeight: 1.35 }}>{card.concentrationLine}</div>}
        {card.contextLine && <div style={{ display: "flex", fontSize: T.type.meta, color: T.inkFaint }}>{card.contextLine}</div>}
      </div>
    </Mw2Frame>
  );
}

export function renderMetricSocialCard(card: AnyCardPayload, opts: { showStateWord?: boolean } = {}) {
  return card.kind === "etf" ? <EtfSocialCard card={card} /> : <MetricSocialCard card={card} showStateWord={opts.showStateWord} />;
}
