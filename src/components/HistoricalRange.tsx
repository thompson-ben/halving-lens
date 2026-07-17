import type { UpsideScenarios } from "@/lib/upside";
import type { DownsideScenarios } from "@/lib/downside";
import { fmtUsd } from "@/lib/format";

// The unified "historical range of outcomes" ladder — the centrepiece of
// Historical Price Paths. Upside continuations rise above today's price; the
// existing downside scenarios sit below; today is the bright anchor between
// them. One glance says: "here is the range of paths Bitcoin has taken from
// comparable points in previous halving cycles." Not forecasts, not
// probabilities — historical paths only.

interface Rung {
  kind: "up" | "today" | "down";
  label: string;
  price: number;
  pctFromToday: number; // signed
}

function pctLabel(p: number): string {
  return `${p >= 0 ? "+" : ""}${Math.round(p)}%`;
}

export function HistoricalRange({ up, down }: { up: UpsideScenarios; down: DownsideScenarios }) {
  const current = up.currentPrice;
  const upRungs: Rung[] = [];
  if (up.strongPrice != null && up.strongMult != null) upRungs.push({ kind: "up", label: "Strong historical continuation", price: up.strongPrice, pctFromToday: (up.strongMult - 1) * 100 });
  if (up.medianPrice != null && up.medianMult != null) upRungs.push({ kind: "up", label: "Median historical continuation", price: up.medianPrice, pctFromToday: (up.medianMult - 1) * 100 });
  if (up.conservativePrice != null && up.conservativeMult != null) upRungs.push({ kind: "up", label: "Conservative historical continuation", price: up.conservativePrice, pctFromToday: (up.conservativeMult - 1) * 100 });

  const ddLevels = down.levels.filter((l) => l.category === "drawdown");
  const byKey = (k: string) => ddLevels.find((l) => l.key === k);
  const downRungs: Rung[] = [];
  for (const [key, label] of [["mild", "Mild historical correction"], ["average", "Typical historical correction"], ["severe", "Severe historical correction"]] as const) {
    const lvl = byKey(key);
    if (lvl) downRungs.push({ kind: "down", label, price: lvl.price, pctFromToday: lvl.dropPctFromCurrent });
  }

  const rungs: Rung[] = [...upRungs, { kind: "today", label: "Today", price: current, pctFromToday: 0 }, ...downRungs];
  const rangeLow = down.severePct != null ? byKey("severe")?.price ?? null : downRungs.length ? downRungs[downRungs.length - 1].price : null;
  const rangeHigh = up.strongPrice ?? null;

  return (
    <div className="card-glow p-5 sm:p-7">
      <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">The historical range from here</div>
      {rangeLow != null && rangeHigh != null && (
        <p className="text-[15px] sm:text-[16px] text-ink-100 leading-relaxed max-w-3xl mb-6">
          From this point in the cycle, previous Bitcoin halving cycles have ranged from{" "}
          <span className="text-signal-red font-medium">{fmtUsd(rangeLow, { compact: true })}</span> to{" "}
          <span className="text-accent font-medium">{fmtUsd(rangeHigh, { compact: true })}</span>. These are historical paths, not forecasts.
        </p>
      )}

      <div className="relative">
        {/* spine */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-accent/40 via-white/10 to-signal-red/40" aria-hidden />
        <ul className="space-y-2.5">
          {rungs.map((r, i) => {
            const isToday = r.kind === "today";
            const tone = r.kind === "up" ? "text-accent" : r.kind === "down" ? "text-signal-red" : "text-ink-50";
            const dot = r.kind === "up" ? "bg-accent" : r.kind === "down" ? "bg-signal-red" : "bg-ink-50";
            const arrow = r.kind === "up" ? "↑" : r.kind === "down" ? "↓" : "▶";
            return (
              <li
                key={i}
                className={`relative flex items-center gap-3 rounded-lg pl-6 pr-3.5 py-2.5 ${
                  isToday ? "bg-white/[0.05] border border-white/[0.12]" : "hover:bg-white/[0.02]"
                }`}
              >
                <span className={`absolute left-[3px] w-2.5 h-2.5 rounded-full ${dot} ${isToday ? "ring-2 ring-white/20" : ""}`} aria-hidden />
                <span className={`text-[13px] w-4 shrink-0 ${tone}`} aria-hidden>{arrow}</span>
                <span className={`flex-1 min-w-0 text-[13.5px] ${isToday ? "text-ink-50 font-medium uppercase tracking-[0.14em] text-[11.5px]" : "text-ink-200"}`}>{r.label}</span>
                <span className={`text-[15px] tabular-nums font-display ${isToday ? "text-ink-50" : "text-ink-100"}`}>{fmtUsd(r.price, { compact: true })}</span>
                {!isToday && <span className={`text-[12px] tabular-nums w-14 text-right ${tone}`}>{pctLabel(r.pctFromToday)}</span>}
                {isToday && <span className="text-[11px] text-ink-500 w-14 text-right">now</span>}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-6 pt-4 border-t border-white/[0.06] text-[11.5px] text-ink-500 leading-relaxed max-w-3xl">
        These are not forecasts. They illustrate how previous Bitcoin halving cycles behaved from comparable points in history. History never repeats
        exactly, but understanding the historical range of outcomes provides context. Not a prediction, not a price target, not financial advice.
      </p>
    </div>
  );
}
