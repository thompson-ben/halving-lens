import { CYCLE_PROGRESS_PCT, DAYS_TO_NEXT_HALVING, TODAY_DAY_IN_CYCLE } from "@/lib/btcData";

/**
 * Radial gauge showing position within the current halving cycle.
 * Pure SVG so it renders on the server.
 */
export function CycleClock({ size = 220 }: { size?: number }) {
  const r = (size - 28) / 2;
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
          <radialGradient id="cyclockGlow" cx="50%" cy="50%" r="50%">
            <stop offset="60%" stopColor="rgba(94,234,212,0)" />
            <stop offset="100%" stopColor="rgba(94,234,212,0.10)" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r + 14} fill="url(#cyclockGlow)" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="url(#cyclock)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {[0, 0.25, 0.5, 0.75].map((p) => {
          const a = -Math.PI / 2 + p * 2 * Math.PI;
          const x1 = cx + Math.cos(a) * (r - 12);
          const y1 = cy + Math.sin(a) * (r - 12);
          const x2 = cx + Math.cos(a) * (r + 2);
          const y2 = cy + Math.sin(a) * (r + 2);
          return (
            <line
              key={p}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.10)"
              strokeWidth="1"
            />
          );
        })}
        <text
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          fontFamily="var(--font-fraunces), serif"
          fontSize={size * 0.21}
          fontWeight="500"
          letterSpacing="-0.04em"
          fill="#f1f4f8"
        >
          {Math.round(CYCLE_PROGRESS_PCT * 100)}%
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontFamily="var(--font-mono), monospace"
          fontSize="10"
          letterSpacing="0.16em"
          fill="#8893a4"
        >
          THROUGH CYCLE 5
        </text>
        <text
          x={cx}
          y={cy + 30}
          textAnchor="middle"
          fontFamily="var(--font-mono), monospace"
          fontSize="10"
          letterSpacing="0.04em"
          fill="#586475"
        >
          day {TODAY_DAY_IN_CYCLE} of 1458
        </text>
      </svg>
      <div className="mt-3 text-[11px] text-ink-400 text-center">
        Next halving in <span className="text-ink-100 font-mono">{DAYS_TO_NEXT_HALVING}</span> days
        <span className="text-ink-500"> · Apr 2028</span>
      </div>
    </div>
  );
}
