import { ACCUMULATION_BANDS } from "@/lib/accumulation";

// Presentational meter for the Accumulation Index: a five-segment opportunity→risk
// bar with a marker at today's score, plus the big number and environment label.
// Pure / server-renderable. Score direction: 0 = deep value, 100 = overheated.
export function AccumulationGauge({
  score,
  bandLabel,
  bandColor,
  percentile,
}: {
  score: number;
  bandLabel: string;
  bandColor: string;
  percentile: number;
}) {
  return (
    <div>
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[64px] leading-none font-medium tracking-tightest" style={{ color: bandColor }}>
            {score}
          </span>
          <span className="text-[18px] text-ink-500 font-display">/100</span>
        </div>
        <div className="pb-2">
          <div className="text-[18px] font-medium text-ink-50 leading-tight">{bandLabel}</div>
          <div className="text-[12px] text-ink-400 mt-0.5">
            Lower in its history than {100 - percentile}% of all weeks since 2012
          </div>
        </div>
      </div>

      {/* Five-segment meter */}
      <div className="mt-6 relative">
        <div className="flex h-2.5 rounded-full overflow-hidden">
          {ACCUMULATION_BANDS.map((b) => (
            <div key={b.key} className="flex-1" style={{ backgroundColor: b.color, opacity: 0.85 }} />
          ))}
        </div>
        {/* Marker at the score position */}
        <div className="absolute -top-1.5" style={{ left: `calc(${Math.min(100, Math.max(0, score))}% - 7px)` }}>
          <div
            className="w-3.5 h-3.5 rounded-full border-2 border-ink-950 shadow"
            style={{ backgroundColor: "#fff" }}
            aria-hidden
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-500">
          <span>Deep value</span>
          <span>Neutral</span>
          <span>Overheated</span>
        </div>
      </div>
    </div>
  );
}
