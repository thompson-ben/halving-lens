import { forwardReturnByBand, pricedSentimentSeries, type SentimentBand } from "@/lib/sentiment";

// Live evidence for HL-R002. For every day in the Fear & Greed record, the
// average forward BTC return 1 month / 3 months / 1 year later, grouped by the
// sentiment band that day fell in. Recomputes from source so the figures stay
// current. Server component — no interactivity. Descriptive history, not advice.

const HORIZONS = [
  { d: 30, label: "1 month" },
  { d: 90, label: "3 months" },
  { d: 365, label: "1 year" },
];

const ORDER: SentimentBand[] = ["extreme-fear", "fear", "neutral", "greed", "extreme-greed"];

function pctR(n: number): string {
  return `${n >= 0 ? "+" : ""}${Math.round(n)}%`;
}

export function FearForwardEvidence() {
  const series = pricedSentimentSeries();
  const byH = HORIZONS.map((h) => ({ ...h, rows: forwardReturnByBand(h.d) }));

  // Merge into band -> { label, perHorizon: { d: {avg, n} } }
  const bands = new Map<SentimentBand, { label: string; per: Record<number, { avg: number; n: number }> }>();
  for (const h of byH) {
    for (const r of h.rows) {
      const e = bands.get(r.band) ?? { label: r.label, per: {} };
      e.per[h.d] = { avg: r.avgReturn, n: r.count };
      bands.set(r.band, e);
    }
  }
  const rows = ORDER.filter((b) => bands.has(b)).map((b) => ({ band: b, ...bands.get(b)! }));

  const fromYear = series.length ? new Date(series[0].ts).getFullYear() : 2018;
  const toYear = series.length ? new Date(series[series.length - 1].ts).getFullYear() : new Date().getUTCFullYear();

  const ef = bands.get("extreme-fear")?.per;
  const eg = bands.get("extreme-greed")?.per;
  const maxYear = Math.max(...rows.map((r) => r.per[365]?.avg ?? -Infinity));

  return (
    <div className="not-prose">
      <div className="text-[11px] text-ink-500 mb-3">
        Fear &amp; Greed Index · daily · {fromYear}–{toYear} · {series.length.toLocaleString()} readings · average forward
        BTC return by sentiment band
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[520px]">
          <thead>
            <tr className="text-ink-500 text-[10.5px] uppercase tracking-[0.12em]">
              <th className="text-left font-normal pb-2">Sentiment that day</th>
              {HORIZONS.map((h) => (
                <th key={h.d} className="text-right font-normal pb-2">{h.label} later</th>
              ))}
              <th className="text-right font-normal pb-2">Days</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isFear = r.band === "extreme-fear";
              const n = r.per[90]?.n ?? r.per[30]?.n ?? 0;
              return (
                <tr key={r.band} className={`border-t border-white/[0.06] ${isFear ? "bg-accent/[0.06]" : ""}`}>
                  <td className="py-2.5">
                    <span className={isFear ? "text-ink-50 font-medium" : "text-ink-200"}>{r.label}</span>
                    {isFear && <span className="ml-2 text-[10px] uppercase tracking-wide text-accent">· focus</span>}
                  </td>
                  {HORIZONS.map((h) => {
                    const cell = r.per[h.d];
                    const best = h.d === 365 && cell && cell.avg === maxYear;
                    return (
                      <td key={h.d} className={`py-2.5 text-right font-mono ${best ? "text-accent font-medium" : "text-ink-100"}`}>
                        {cell ? pctR(cell.avg) : "—"}
                      </td>
                    );
                  })}
                  <td className="py-2.5 text-right font-mono text-ink-400">{n.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-[12.5px] text-ink-300 leading-relaxed">
        Over the <span className="text-ink-100">year</span> following an extreme-fear reading, Bitcoin returned an
        average of <span className="text-ink-50 font-medium">{ef?.[365] ? pctR(ef[365].avg) : "—"}</span> — versus{" "}
        <span className="text-ink-50 font-medium">{eg?.[365] ? pctR(eg[365].avg) : "—"}</span> after extreme greed. Yet
        over the next <span className="text-ink-100">1–3 months</span>, fearful periods{" "}
        <span className="text-ink-50 font-medium">lagged</span> greedy ones ({ef?.[90] ? pctR(ef[90].avg) : "—"} vs{" "}
        {eg?.[90] ? pctR(eg[90].avg) : "—"} at three months) — the edge in fear was a long-horizon one, not an instant
        bounce. Forward windows that run past the latest data are excluded, so longer horizons have fewer observations.
      </p>
    </div>
  );
}
