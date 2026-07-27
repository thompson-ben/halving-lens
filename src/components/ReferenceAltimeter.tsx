// Today's Configuration — the Four Reference Prices signature visual
// ("altimeter" is the internal design name only; user-facing language is
// "Today's Configuration"). A vertical scale with a horizontal level line per
// reference price and the market price as the marker between them. Colours
// and dash patterns match the Price in Context chart exactly — the estimated
// line is violet AND dotted, so its status never rests on colour alone.
// Server component: pure layout from today's values, no interactivity.

interface Level {
  key: "trend" | "holders" | "miners";
  label: string;
  value: number;
  estimated?: boolean;
}

const STYLE: Record<Level["key"], { color: string; dash: string }> = {
  trend: { color: "#8893a4", dash: "6 4" },
  holders: { color: "#f5b942", dash: "" },
  miners: { color: "#a78bfa", dash: "2 4" },
};

const fmt = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(0)}`;

// Nudge sorted positions apart so labels never overlap; lines stay truthful.
function spread(positions: number[], minGap: number): number[] {
  const out = [...positions];
  for (let i = 1; i < out.length; i++) if (out[i] - out[i - 1] < minGap) out[i] = out[i - 1] + minGap;
  for (let i = out.length - 1; i >= 0; i--) {
    if (out[i] > 94) out[i] = 94;
    if (i < out.length - 1 && out[i + 1] - out[i] < minGap) out[i] = out[i + 1] - minGap;
  }
  return out;
}

export function ReferenceAltimeter({
  price,
  levels,
}: {
  price: number;
  levels: Level[];
}) {
  if (!levels.length || price <= 0) return null;
  const values = [price, ...levels.map((l) => l.value)];
  const max = Math.max(...values) * 1.04;
  const min = Math.min(...values) * 0.96;
  const pos = (v: number) => Math.min(94, Math.max(6, ((max - v) / (max - min)) * 100));

  const linePos = levels.map((l) => pos(l.value));
  const labelPos = spread([...linePos].sort((a, b) => a - b), 13);
  const labelFor = new Map<number, number>();
  [...linePos].sort((a, b) => a - b).forEach((p, i) => labelFor.set(p, labelPos[i]));

  const pricePos = pos(price);

  return (
    <div className="relative h-[300px]" role="img" aria-label={`Market price ${fmt(price)} shown against ${levels.map((l) => `${l.label} at ${fmt(l.value)}`).join(", ")}`}>
      {/* Reference level lines + left labels */}
      {levels.map((l) => {
        const lp = pos(l.value);
        const tp = labelFor.get(lp) ?? lp;
        const s = STYLE[l.key];
        return (
          <div key={l.key}>
            <svg className="absolute left-0 right-0 w-full" style={{ top: `${lp}%` }} height="2" aria-hidden>
              <line x1="0" y1="1" x2="100%" y2="1" stroke={s.color} strokeWidth="1.5" strokeDasharray={s.dash || undefined} strokeOpacity="0.85" />
            </svg>
            <div className="absolute left-0 -translate-y-1/2 bg-ink-950/85 pr-2 rounded" style={{ top: `${tp}%` }}>
              <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: s.color }}>
                {l.label}
                {l.estimated && (
                  <span className="ml-1.5 text-[8.5px] px-1 py-px rounded-full border border-signal-violet/30 text-signal-violet normal-case tracking-normal align-middle">
                    Estimated
                  </span>
                )}
              </span>
              <span className="ml-2 font-mono text-[11px] tabular-nums text-ink-200">{fmt(l.value)}</span>
            </div>
          </div>
        );
      })}

      {/* Market price marker, right-aligned at its true position */}
      <div className="absolute right-0 -translate-y-1/2 flex items-center gap-2" style={{ top: `${pricePos}%` }}>
        <span className="text-[10px] uppercase tracking-[0.14em] text-ink-400">Market price</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/30">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="font-mono text-[12.5px] tabular-nums text-ink-50">{fmt(price)}</span>
        </span>
      </div>
    </div>
  );
}
