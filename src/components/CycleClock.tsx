import { CYCLE_PROGRESS_PCT, DAYS_TO_NEXT_HALVING, TODAY_DAY_IN_CYCLE } from "@/lib/btcData";

/**
 * Radial gauge showing position within the current halving cycle.
 * Pure SVG so it renders on the server.
 */
export function CycleClock({ size = 220 }: { size?: number }) {
  const r = (size - 24) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - CYCLE_PROGRESS_PCT);

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="cyclock" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5eead4" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="none" />
        {/* Progress */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="url(#cyclock)"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* Tick marks at past halvings on the loop (4 quadrants) */}
        {[0, 0.25, 0.5, 0.75].map((p) => {
          const a = -Math.PI / 2 + p * 2 * Math.PI;
          const x1 = cx + Math.cos(a) * (r - 8);
          const y1 = cy + Math.sin(a) * (r - 8);
          const x2 = cx + Math.cos(a) * (r + 4);
          const y2 = cy + Math.sin(a) * (r + 4);
          return (
            <line
              key={p}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="1"
            />
          );
        })}
        {/* Center text */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="34"
          fontWeight="600"
          fill="#e4e9f0"
        >
          {Math.round(CYCLE_PROGRESS_PCT * 100)}%
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="11"
          fill="#8893a4"
        >
          through cycle 5
        </text>
        <text
          x={cx}
          y={cy + 32}
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="10"
          fill="#586475"
        >
          day {TODAY_DAY_IN_CYCLE} / 1458
        </text>
      </svg>
      <div className="mt-2 text-[11px] text-ink-400">
        Next halving in <span className="text-ink-100 font-mono">{DAYS_TO_NEXT_HALVING}</span> days
        (~Apr 2028)
      </div>
    </div>
  );
}
