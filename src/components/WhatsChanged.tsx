import type { MetricChange, PeriodChange, DirectionStatus, Semantic } from "@/lib/metricChange";

// Standard "What's Changed?" panel — sits directly below a page's hero/current
// reading. Shows the current value, the 1-day / 7-day / 30-day movement, the
// historical context, a 30-day sparkline, a direction status and one factual
// sentence. Deterministic, mobile-first, and consistent across pages.
//
// Colour never carries meaning alone: every move also has an arrow, a sign and a
// period label. Cyan = constructive, muted red = deterioration, grey = neutral /
// unchanged — with the meaning of "constructive" defined per-metric in the
// service (a lower Accumulation Index is good; a deeper drawdown is not).

const TEXT_TONE: Record<Semantic, string> = {
  good: "text-accent",
  bad: "text-signal-red",
  neutral: "text-ink-300",
};
const ARROW: Record<PeriodChange["dir"], string> = { up: "↑", down: "↓", flat: "→" };
const SPARK_HEX: Record<"good" | "bad" | "neutral", string> = { good: "#5eead4", bad: "#ff5d5d", neutral: "#5a6677" };

const STATUS: Record<DirectionStatus, { label: string; cls: string }> = {
  improving: { label: "Improving", cls: "text-accent border-accent/30 bg-accent/[0.08]" },
  weakening: { label: "Weakening", cls: "text-signal-red border-signal-red/30 bg-signal-red/[0.08]" },
  stable: { label: "Stable", cls: "text-ink-300 border-white/10 bg-white/[0.03]" },
  mixed: { label: "Mixed", cls: "text-signal-amber border-signal-amber/30 bg-signal-amber/[0.08]" },
  insufficient: { label: "Insufficient data", cls: "text-ink-500 border-white/10 bg-white/[0.02]" },
};

function periodLabel(m: MetricChange, period: number): string {
  if (m.frequency === "trading-day") return period === 1 ? "Latest" : period === 7 ? "7-day net" : "30-day net";
  return period === 1 ? "1 day" : period === 7 ? "7 days" : "30 days";
}

function statusLabel(m: MetricChange): { label: string; cls: string } {
  // Neutral-semantic metrics (sentiment) shouldn't read as good/bad.
  if (m.id === "sentiment" && m.status === "mixed") return { label: "Notable move", cls: STATUS.mixed.cls };
  return STATUS[m.status];
}

function Sparkline({ values, tone }: { values: number[]; tone: "good" | "bad" | "neutral" }) {
  if (values.length < 2) return null;
  const w = 120,
    h = 34,
    pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rng = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y = pad + (1 - (v - min) / rng) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden>
      <polyline points={pts} fill="none" stroke={SPARK_HEX[tone]} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
    </svg>
  );
}

function Cell({ c, label }: { c: PeriodChange; label: string }) {
  return (
    <div className="min-w-0" title={c.available && c.asOfLabel ? `vs ${c.asOfLabel}` : undefined}>
      <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-500">{label}</div>
      {c.available ? (
        <>
          <div className={`mt-1 text-[15px] sm:text-[16px] font-medium tabular-nums ${TEXT_TONE[c.good]}`}>
            <span aria-hidden>{ARROW[c.dir]}</span> {c.absLabel}
          </div>
          {c.pctLabel && <div className="text-[11px] text-ink-500 tabular-nums">{c.pctLabel}</div>}
        </>
      ) : (
        <div className="mt-1 text-[15px] text-ink-600">—</div>
      )}
    </div>
  );
}

export function WhatsChanged({ metric, className = "" }: { metric: MetricChange; className?: string }) {
  const m = metric;
  const sparkTone: "good" | "bad" | "neutral" = m.status === "improving" ? "good" : m.status === "weakening" ? "bad" : "neutral";
  const st = statusLabel(m);

  if (!m.available) {
    return (
      <div className={`card p-4 sm:p-5 ${className}`}>
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">{m.name} · what&rsquo;s changed</div>
        <p className="mt-2 text-[13px] text-ink-400">{m.summary}</p>
      </div>
    );
  }

  return (
    <div className={`card p-4 sm:p-5 ${className}`}>
      {/* Header: name, current reading, band + status */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">{m.name} · what&rsquo;s changed</div>
          <div className="mt-1 flex items-baseline gap-2.5 flex-wrap">
            <span className="font-display text-[26px] sm:text-[30px] leading-none text-ink-50 tabular-nums">{m.currentLabel}</span>
            {m.band && (
              <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-ink-200">{m.band.label}</span>
            )}
          </div>
        </div>
        <span className={`text-[10.5px] px-2.5 py-1 rounded-full border ${st.cls} shrink-0`}>{st.label}</span>
      </div>

      {/* Change grid: periods + historical context */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4 border-t border-white/[0.06] pt-4">
        {m.changes.map((c) => (
          <Cell key={c.period} c={c} label={periodLabel(m, c.period)} />
        ))}
        <div className="min-w-0">
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-500">Historical</div>
          <div className="mt-1 text-[13px] text-ink-200 leading-tight">
            {m.percentile != null ? `${m.percentile}th pct` : m.band ? m.band.label : "—"}
          </div>
          {m.percentileLabel && <div className="text-[10.5px] text-ink-500 leading-tight mt-0.5">{m.percentileLabel}</div>}
        </div>
      </div>

      {/* Band-crossing flag */}
      {m.bandChanged && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-signal-amber">
          <span aria-hidden>◆</span> Crossed into {m.bandChanged.to} <span className="text-ink-500">(from {m.bandChanged.from})</span>
        </div>
      )}

      {/* Sparkline + summary */}
      <div className="mt-3.5 flex items-center gap-4 border-t border-white/[0.06] pt-3.5">
        <Sparkline values={m.spark} tone={sparkTone} />
        <p className="flex-1 text-[12.5px] sm:text-[13px] text-ink-300 leading-snug">{m.summary}</p>
      </div>

      {/* Drivers */}
      {m.drivers.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.14em] text-ink-600">Driver</span>
          {m.drivers.slice(0, 2).map((d) => (
            <span key={d} className="text-[11px] px-2 py-0.5 rounded-full border border-white/[0.08] text-ink-300">{d}</span>
          ))}
        </div>
      )}

      <div className="mt-3 text-[10px] text-ink-600">
        Latest: {m.asOfLabel}
        {m.frequency !== "daily" && <span> · {m.frequency === "weekly" ? "weekly cadence" : "US trading days"}</span>}
        {" · Historical context, not prediction."}
      </div>
    </div>
  );
}
