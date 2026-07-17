// Historical Upside engine — the companion to downside.ts. Answers, purely from
// history: "from today's point in the cycle, how much further did previous
// halving cycles go before their peak?" No models, no forecasts, no
// probabilities — just historical cycle alignment.
//
// Method: for each completed prior cycle, take its price at the same cycle day
// as today, then the highest price it reached from that day onward (its forward
// peak). The ratio is a multiple applied to today's price — "if Bitcoin behaved
// like that cycle from here." Future-proof by construction: as the current cycle
// passes prior peaks, those cycles show ~no remaining upside from this point,
// with zero code changes.

import { CYCLES, CURRENT_CYCLE, SPOT, TODAY, TODAY_DAY_IN_CYCLE } from "./btcData";
import type { Cycle, CycleSample } from "./data/types";

export interface CycleUpside {
  cycleId: number;
  short: string;
  label: string; // "2016 cycle"
  color: string;
  year: string;
  priceAtSameDay: number; // that cycle's price at today's cycle day
  forwardPeak: number; // highest price it reached from that day onward
  forwardPeakDay: number;
  multiple: number; // forwardPeak / priceAtSameDay (≥ 1)
  remainingUpsidePct: number; // (multiple − 1) × 100
  equivalentPrice: number; // today's price × multiple
  alreadyPeaked: boolean; // this cycle had essentially topped by this point
}

export interface UpsideScenarios {
  available: boolean;
  currentPrice: number;
  cycleDay: number;
  perCycle: CycleUpside[];
  conservativeMult: number | null; // weakest prior-cycle continuation (min)
  medianMult: number | null;
  strongMult: number | null; // strongest (max)
  averageMult: number | null;
  conservativePrice: number | null;
  medianPrice: number | null;
  strongPrice: number | null;
  averagePrice: number | null;
  generatedAt: string | null;
}

function nearestSample(c: Cycle, day: number): CycleSample {
  return c.samples.reduce((best, x) => (Math.abs(x.day - day) < Math.abs(best.day - day) ? x : best));
}

function median(sorted: number[]): number | null {
  const n = sorted.length;
  if (!n) return null;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

export function upsideScenarios(): UpsideScenarios {
  const currentPrice = SPOT?.price ?? TODAY.price;
  const cycleDay = TODAY_DAY_IN_CYCLE;
  const priors = CYCLES.filter((c) => c.id !== CURRENT_CYCLE.id);

  const perCycle: CycleUpside[] = [];
  for (const c of priors) {
    const at = nearestSample(c, cycleDay);
    if (at.price <= 0) continue;
    let forwardPeak = at.price;
    let forwardPeakDay = at.day;
    for (const s of c.samples) {
      if (s.day >= at.day && s.price > forwardPeak) {
        forwardPeak = s.price;
        forwardPeakDay = s.day;
      }
    }
    const multiple = forwardPeak / at.price;
    perCycle.push({
      cycleId: c.id,
      short: c.short,
      label: `${c.halvingDate.slice(0, 4)} cycle`,
      color: c.color,
      year: c.halvingDate.slice(0, 4),
      priceAtSameDay: at.price,
      forwardPeak,
      forwardPeakDay,
      multiple,
      remainingUpsidePct: (multiple - 1) * 100,
      equivalentPrice: currentPrice * multiple,
      alreadyPeaked: forwardPeakDay <= at.day + 20 || multiple < 1.03,
    });
  }

  const mults = perCycle.map((p) => p.multiple).sort((a, b) => a - b);
  const conservativeMult = mults.length ? mults[0] : null;
  const strongMult = mults.length ? mults[mults.length - 1] : null;
  const medianMult = median(mults);
  const averageMult = mults.length ? mults.reduce((a, b) => a + b, 0) / mults.length : null;
  const toPrice = (m: number | null) => (m == null ? null : currentPrice * m);

  return {
    available: perCycle.length > 0,
    currentPrice,
    cycleDay,
    perCycle,
    conservativeMult,
    medianMult,
    strongMult,
    averageMult,
    conservativePrice: toPrice(conservativeMult),
    medianPrice: toPrice(medianMult),
    strongPrice: toPrice(strongMult),
    averagePrice: toPrice(averageMult),
    generatedAt: SPOT ? new Date(SPOT.ts).toISOString() : null,
  };
}
