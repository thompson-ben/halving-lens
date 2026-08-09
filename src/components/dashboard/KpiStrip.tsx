import { SCORE_BANDS, type ScoreBand } from "@/lib/scoreBand";
import { fmtPct, fmtUsd } from "@/lib/format";
import { BandScale, type ScaleSegment } from "./BandScale";

// The orientation KPI strip (CD4) — one shared instrument surface, four
// cells, hairline-divided. Presentation only: every fact and every word
// is exactly what the CD2/CD3 header <dl> showed; the engine reads stay
// in the page and arrive here as props. The two micro-scales visualise
// existing canonical values (progressPct; the scorecard overall against
// its own SCORE_BANDS) — no thresholds live in this component.

/** SCORE_BANDS is descending by min; the scale wants ascending segments
 *  whose widths are the bands' own published ranges. */
function healthSegments(): ScaleSegment[] {
  const asc = [...SCORE_BANDS].sort((a, b) => a.min - b.min);
  return asc.map((b, i) => ({
    width: (i + 1 < asc.length ? asc[i + 1].min : 100) - b.min,
    color: b.color,
  }));
}

export interface KpiStripProps {
  spot: { price: number; pct: number | null; label: string };
  cycleDay: number;
  progressPct: number;
  cycleDayAsOf: string;
  phaseLabel: string;
  health: { overall: number; band: ScoreBand };
}

const CELL = "p-4 sm:p-5 min-w-0";
const HAIR = "border-white/[0.05]";

export function KpiStrip({ spot, cycleDay, progressPct, cycleDayAsOf, phaseLabel, health }: KpiStripProps) {
  return (
    <dl className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <div className={CELL}>
        <dt className="eyebrow text-ink-500">BTC price</dt>
        <dd className="mt-2">
          <span className="font-display text-stat leading-none tabular-nums text-ink-50">{fmtUsd(spot.price)}</span>
          {spot.pct != null && (
            <span className={`block mt-2 text-caption tabular-nums ${spot.pct >= 0 ? "text-signal-green" : "text-signal-red"}`}>
              {fmtPct(spot.pct, 1)} · {spot.label}
            </span>
          )}
        </dd>
      </div>

      <div className={`${CELL} border-l ${HAIR}`}>
        <dt className="eyebrow text-ink-500">Cycle day</dt>
        <dd className="mt-2">
          <span className="font-display text-stat leading-none tabular-nums text-ink-50">{cycleDay}</span>
          <div className="mt-2.5 max-w-[9.5rem]">
            <BandScale value={progressPct} mode="fill" />
          </div>
          <span className="block mt-1.5 text-caption text-ink-400">
            {progressPct}% through · to {cycleDayAsOf}
          </span>
        </dd>
      </div>

      <div className={`${CELL} border-t lg:border-t-0 lg:border-l ${HAIR}`}>
        <dt className="eyebrow text-ink-500">Phase</dt>
        <dd className="mt-2 font-display text-headline leading-tight text-ink-50">{phaseLabel}</dd>
      </div>

      <div className={`${CELL} border-t border-l lg:border-t-0 ${HAIR}`}>
        <dt className="eyebrow text-ink-500">Market health</dt>
        <dd className="mt-2">
          <span className="font-display text-stat leading-none tabular-nums text-ink-50">{health.overall}</span>
          <span className="ml-1 text-caption text-ink-500">/100</span>
          <div className="mt-2.5 max-w-[9.5rem]">
            <BandScale value={health.overall} segments={healthSegments()} />
          </div>
          <span className="block mt-1.5 text-caption" style={{ color: health.band.color }}>
            {health.band.label}
          </span>
        </dd>
      </div>
    </dl>
  );
}
