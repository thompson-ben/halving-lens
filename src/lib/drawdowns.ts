// Historical drawdown analysis — "Is this drop normal?"
//
// For each halving cycle we build a running-peak drawdown series: at every
// weekly sample, how far price sits below the highest level reached so far in
// that cycle. That lets us compare the current correction against the same
// stage of the 2012, 2016 and 2020 cycles — pure price history, no forecasts.
//
// Samples are weekly, so figures are read at the sample nearest the comparison
// day. Everything here is descriptive historical context, never a prediction.

import { CYCLES, CURRENT_CYCLE, TODAY_DAY_IN_CYCLE, type Cycle, type CycleSample } from "./btcData";

export interface CycleDrawdown {
  id: number;
  short: string;
  color: string;
  year: string; // halving year — 2012 / 2016 / 2020 / 2024
  isCurrent: boolean;
  /** Drawdown from the cycle's running peak, at the day nearest the comparison day. %, ≤ 0. */
  drawdownAtStage: number;
  /** Deepest running-peak drawdown reached by that comparison day. %, ≤ 0. */
  largestSoFar: number;
}

export interface DrawdownAnalysis {
  available: boolean;
  cycleDay: number;
  /** Current cycle's drawdown from its peak so far. %, ≤ 0. */
  current: number;
  /** Deepest drawdown the current cycle has seen so far. %, ≤ 0. */
  largestThisCycle: number;
  /** Average drawdown of the prior cycles at the equivalent cycle stage. %, ≤ 0. */
  avgAtStage: number;
  /** Per-cycle rows: 2012, 2016, 2020 (priors) + current. */
  rows: CycleDrawdown[];
  /** ≤ 2 sentences, mobile-first, no predictions. */
  takeaway: string;
}

// Index of the sample whose day is closest to `day`.
function nearestIdx(c: Cycle, day: number): number {
  let bestI = 0;
  let bestD = Infinity;
  c.samples.forEach((s, i) => {
    const d = Math.abs(s.day - day);
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  });
  return bestI;
}

// Running-peak drawdown (%) for each sample in order. ≤ 0 throughout.
function drawdownSeries(samples: CycleSample[]): number[] {
  let peak = 0;
  return samples.map((s) => {
    if (s.price > peak) peak = s.price;
    return peak > 0 ? (s.price / peak - 1) * 100 : 0;
  });
}

// Full per-cycle drawdown ("underwater") series, for the public chart: how far
// below its own running peak each cycle traded at every day after the halving.
export interface DrawdownSeriesCycle {
  id: number;
  short: string;
  label: string;
  color: string;
  isCurrent: boolean;
  points: { day: number; drawdown: number }[]; // drawdown ≤ 0
}

export function drawdownSeriesByCycle(): DrawdownSeriesCycle[] {
  return CYCLES.map((c) => {
    const series = drawdownSeries(c.samples);
    return {
      id: c.id,
      short: c.short,
      label: c.label,
      color: c.color,
      isCurrent: c.id === 5,
      points: c.samples.map((s, i) => ({ day: s.day, drawdown: Math.round(series[i] * 10) / 10 })),
    };
  });
}

// Drawdown read for one cycle up to (and including) the sample nearest `stageDay`.
function readCycle(c: Cycle, stageDay: number): { drawdownAtStage: number; largestSoFar: number } {
  const idx = nearestIdx(c, stageDay);
  const upto = c.samples.slice(0, idx + 1);
  const series = drawdownSeries(upto.length ? upto : [c.samples[0]]);
  return {
    drawdownAtStage: series[series.length - 1] ?? 0,
    largestSoFar: Math.min(0, ...series),
  };
}

export function drawdownAnalysis(): DrawdownAnalysis {
  const stageDay = TODAY_DAY_IN_CYCLE;
  const priors = CYCLES.filter((c) => c.id !== 5);

  const priorRows: CycleDrawdown[] = priors.map((c) => {
    const r = readCycle(c, stageDay);
    return {
      id: c.id,
      short: c.short,
      color: c.color,
      year: c.halvingDate.slice(0, 4),
      isCurrent: false,
      drawdownAtStage: r.drawdownAtStage,
      largestSoFar: r.largestSoFar,
    };
  });

  // Current cycle: read up to today (the last sample is "today").
  const curReadIdx = CURRENT_CYCLE.samples.length - 1;
  const curUpto = CURRENT_CYCLE.samples.slice(0, curReadIdx + 1);
  const curSeries = drawdownSeries(curUpto);
  const current = curSeries[curSeries.length - 1] ?? 0;
  const largestThisCycle = Math.min(0, ...curSeries);

  const currentRow: CycleDrawdown = {
    id: CURRENT_CYCLE.id,
    short: CURRENT_CYCLE.short,
    color: CURRENT_CYCLE.color,
    year: CURRENT_CYCLE.halvingDate.slice(0, 4),
    isCurrent: true,
    drawdownAtStage: current,
    largestSoFar: largestThisCycle,
  };

  const avgAtStage =
    priorRows.length > 0
      ? priorRows.reduce((a, r) => a + r.drawdownAtStage, 0) / priorRows.length
      : 0;

  const rows = [...priorRows, currentRow];

  return {
    available: priorRows.length > 0,
    cycleDay: stageDay,
    current,
    largestThisCycle,
    avgAtStage,
    rows,
    takeaway: buildTakeaway(current, avgAtStage),
  };
}

// ≤ 2 sentences. Factual, non-alarmist, no predictions or price targets. Frames
// the current drawdown against the average drawdown prior cycles showed at the
// SAME point after the halving — a like-for-like, stage-aware comparison.
function buildTakeaway(current: number, avgAtStage: number): string {
  const curMag = Math.abs(current);
  const avgMag = Math.abs(avgAtStage);

  if (curMag < 4) {
    return "Bitcoin is trading at or near its cycle high, with no meaningful drawdown right now. In past cycles, pullbacks of 20–40% were common along the way.";
  }

  const first = `Bitcoin is about ${Math.round(curMag)}% below its cycle high.`;
  const avgPhrase = `the 2012, 2016 and 2020 cycles averaged about ${Math.round(avgMag)}% below their highs`;
  let second: string;
  if (curMag < avgMag - 3) {
    second = `At the same point after the halving, ${avgPhrase} — so this drawdown is shallower than past cycles at the same stage.`;
  } else if (curMag > avgMag + 3) {
    second = `At the same point, ${avgPhrase} — this drawdown is deeper than that. Historical context, not a forecast.`;
  } else {
    second = `That's roughly in line with the ~${Math.round(avgMag)}% average drawdown seen at the same point in past cycles.`;
  }
  return `${first} ${second}`;
}
