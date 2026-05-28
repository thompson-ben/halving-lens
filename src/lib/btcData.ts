// Bitcoin halving cycle data — synthesised but anchored to real prices so the
// concept demo feels true. Each cycle has weekly samples for price + key
// on-chain metrics so we can overlay them in the cycle-comparison chart.

export type CycleId = 1 | 2 | 3 | 4 | 5;

export interface CycleAnchor {
  day: number; // days since halving
  price: number;
}

export interface CycleSample {
  day: number; // days since halving
  price: number;
  mvrv: number; // market cap / realised cap
  mvrvZ: number; // (mvrv - mean) / std; cycle top oscillator
  nupl: number; // net unrealised P&L; -0.3..0.9
  mayer: number; // price / 200d MA
  puell: number; // miner issuance / 365d MA
  reserveRisk: number; // 0.001 .. 0.02
  rainbow: number; // 0..8 band index (0 = fire sale, 8 = maximum bubble)
}

export interface Cycle {
  id: CycleId;
  label: string;
  short: string;
  color: string;
  halvingDate: string; // ISO date
  endDate: string | null; // null = current cycle, still running
  endLabel: string;
  rewardBtc: number; // block reward after this halving
  peakPrice: number;
  peakDay: number;
  troughPrice: number;
  troughDay: number;
  samples: CycleSample[];
}

const HALVINGS = {
  1: "2009-01-03", // genesis (cycle 1 not used as overlay; here for reference)
  2: "2012-11-28",
  3: "2016-07-09",
  4: "2020-05-11",
  5: "2024-04-19",
  6: "2028-04-17", // projected
} as const;

// Anchor points (day, price) — based on remembered historical highs/lows.
const ANCHORS: Record<Exclude<CycleId, 1>, CycleAnchor[]> = {
  2: [
    { day: 0, price: 12.5 },
    { day: 40, price: 18 },
    { day: 90, price: 28 },
    { day: 140, price: 75 },
    { day: 200, price: 120 },
    { day: 260, price: 135 },
    { day: 330, price: 220 },
    { day: 380, price: 1150 }, // Nov 2013 peak
    { day: 440, price: 700 },
    { day: 540, price: 580 },
    { day: 660, price: 380 },
    { day: 780, price: 240 },
    { day: 870, price: 210 }, // Jan 2015 bottom
    { day: 980, price: 270 },
    { day: 1100, price: 450 },
    { day: 1240, price: 430 },
    { day: 1335, price: 660 }, // approaches halving 3
  ],
  3: [
    { day: 0, price: 650 },
    { day: 60, price: 620 },
    { day: 120, price: 730 },
    { day: 200, price: 1100 },
    { day: 280, price: 2700 },
    { day: 340, price: 4500 },
    { day: 400, price: 8500 },
    { day: 510, price: 19400 }, // Dec 2017 peak
    { day: 580, price: 9300 },
    { day: 680, price: 7400 },
    { day: 760, price: 6400 },
    { day: 870, price: 3300 }, // Dec 2018 bottom
    { day: 980, price: 5100 },
    { day: 1080, price: 9200 },
    { day: 1180, price: 10100 },
    { day: 1280, price: 7400 },
    { day: 1380, price: 8800 }, // approaches halving 4
  ],
  4: [
    { day: 0, price: 8800 },
    { day: 60, price: 9400 },
    { day: 130, price: 10800 },
    { day: 210, price: 18800 },
    { day: 280, price: 35000 },
    { day: 360, price: 58000 },
    { day: 430, price: 41000 },
    { day: 540, price: 64500 },
    { day: 560, price: 69000 }, // Nov 2021 peak
    { day: 620, price: 47000 },
    { day: 700, price: 40000 },
    { day: 770, price: 31000 },
    { day: 800, price: 20000 }, // Jun 2022
    { day: 920, price: 16500 }, // Nov 2022 FTX bottom
    { day: 1000, price: 22500 },
    { day: 1100, price: 27000 },
    { day: 1200, price: 35000 },
    { day: 1300, price: 42000 },
    { day: 1380, price: 52000 },
    { day: 1435, price: 64000 }, // approaches halving 5
  ],
  5: [
    { day: 0, price: 64500 },
    { day: 30, price: 60000 },
    { day: 80, price: 58000 },
    { day: 140, price: 66000 },
    { day: 200, price: 71500 },
    { day: 260, price: 88000 },
    { day: 310, price: 99500 }, // Dec 2024 break-out
    { day: 360, price: 105000 },
    { day: 420, price: 112000 }, // Mar 2025 peak (so far)
    { day: 480, price: 96000 },
    { day: 540, price: 104000 },
    { day: 600, price: 92000 },
    { day: 680, price: 101000 },
    { day: 740, price: 96500 },
    { day: 770, price: 97842 }, // ~ today (2026-05-28)
  ],
};

// Per-cycle peak metric values (rough — declines each cycle).
const PEAK_METRICS: Record<Exclude<CycleId, 1>, { mvrv: number; mvrvZ: number; nupl: number; mayer: number; puell: number; reserveRisk: number }> = {
  2: { mvrv: 5.8, mvrvZ: 11.2, nupl: 0.85, mayer: 3.5, puell: 7.2, reserveRisk: 0.020 },
  3: { mvrv: 4.6, mvrvZ: 8.7, nupl: 0.78, mayer: 3.4, puell: 4.4, reserveRisk: 0.013 },
  4: { mvrv: 3.8, mvrvZ: 7.0, nupl: 0.75, mayer: 2.8, puell: 3.1, reserveRisk: 0.008 },
  5: { mvrv: 3.1, mvrvZ: 3.6, nupl: 0.68, mayer: 2.05, puell: 2.4, reserveRisk: 0.0044 },
};

// Bottom metric values per cycle.
const TROUGH_METRICS: Record<Exclude<CycleId, 1>, { mvrv: number; mvrvZ: number; nupl: number; mayer: number; puell: number; reserveRisk: number }> = {
  2: { mvrv: 0.70, mvrvZ: -0.4, nupl: -0.2, mayer: 0.55, puell: 0.40, reserveRisk: 0.0015 },
  3: { mvrv: 0.80, mvrvZ: -0.3, nupl: -0.18, mayer: 0.58, puell: 0.45, reserveRisk: 0.0017 },
  4: { mvrv: 0.85, mvrvZ: -0.2, nupl: -0.15, mayer: 0.62, puell: 0.30, reserveRisk: 0.0019 },
  5: { mvrv: 0.95, mvrvZ: 0.05, nupl: 0.08, mayer: 0.78, puell: 0.55, reserveRisk: 0.0024 },
};

function pseudoRand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function interpolatePrice(anchors: CycleAnchor[], day: number): number {
  if (day <= anchors[0].day) return anchors[0].price;
  const last = anchors[anchors.length - 1];
  if (day >= last.day) return last.price;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (day >= a.day && day <= b.day) {
      // Log-interp for visual smoothness in price space.
      const t = (day - a.day) / (b.day - a.day);
      const logA = Math.log(a.price);
      const logB = Math.log(b.price);
      // Ease for less linear corners.
      const eased = t * t * (3 - 2 * t);
      return Math.exp(logA + (logB - logA) * eased);
    }
  }
  return anchors[anchors.length - 1].price;
}

// Per-cycle anchor: cycle peak price + the rainbow band that peak hit on the
// canonical Bitcoin Rainbow chart. Each cycle has gotten progressively cooler
// relative to the power-law trend, so peak bands decline.
const RAINBOW_PEAK: Record<Exclude<CycleId, 1>, { peak: number; peakBand: number }> = {
  2: { peak: 1150, peakBand: 8.0 },
  3: { peak: 19400, peakBand: 8.0 },
  4: { peak: 69000, peakBand: 7.6 },
  5: { peak: 112000, peakBand: 6.8 },
};

function rainbowBand(price: number, cycleId: Exclude<CycleId, 1>): number {
  const cfg = RAINBOW_PEAK[cycleId];
  // Each 10× price move from the cycle peak shifts ~7 bands.
  const band = cfg.peakBand + 7 * Math.log10(price / cfg.peak);
  return Math.max(0, Math.min(8, band));
}

function buildCycle(
  id: Exclude<CycleId, 1>,
  label: string,
  short: string,
  color: string,
  rewardBtc: number,
  endDate: string | null,
  endLabel: string,
  // Cap cycle 5 at current day; others run to next halving.
  capDay?: number,
): Cycle {
  const anchors = ANCHORS[id];
  const peak = PEAK_METRICS[id];
  const trough = TROUGH_METRICS[id];
  const totalDays = capDay ?? anchors[anchors.length - 1].day;
  const step = 7; // weekly samples
  const rand = pseudoRand(id * 7919);

  let peakPrice = 0;
  let peakDay = 0;
  let troughPrice = Infinity;
  let troughDay = 0;

  const samples: CycleSample[] = [];
  for (let d = 0; d <= totalDays; d += step) {
    const basePrice = interpolatePrice(anchors, d);
    // Tiny relative noise so the lines aren't synthetic-smooth.
    const noise = 1 + (rand() - 0.5) * 0.04;
    const price = basePrice * noise;

    if (price > peakPrice) {
      peakPrice = price;
      peakDay = d;
    }
    if (price < troughPrice) {
      troughPrice = price;
      troughDay = d;
    }

    // Position in cycle (0..1) relative to peak/trough for metric scaling.
    // Use a simple "ratio of (price / peak) and (price / trough)" mix.
    const peakRatio = price / interpolatePrice(anchors, anchors.find((a) => a.price === Math.max(...anchors.map((x) => x.price)))?.day ?? 0);
    // Smooth scale from trough metrics → peak metrics by price percentile within cycle.
    const pct = Math.max(0, Math.min(1, peakRatio));
    // Curve so mid-cycle reads bullish but not topping.
    const k = Math.pow(pct, 1.2);

    const mvrv = trough.mvrv + (peak.mvrv - trough.mvrv) * k + (rand() - 0.5) * 0.04;
    const mvrvZ = trough.mvrvZ + (peak.mvrvZ - trough.mvrvZ) * k + (rand() - 0.5) * 0.1;
    const nupl = trough.nupl + (peak.nupl - trough.nupl) * k + (rand() - 0.5) * 0.01;
    const mayer = trough.mayer + (peak.mayer - trough.mayer) * k + (rand() - 0.5) * 0.03;
    const puell = trough.puell + (peak.puell - trough.puell) * k + (rand() - 0.5) * 0.08;
    const reserveRisk = trough.reserveRisk + (peak.reserveRisk - trough.reserveRisk) * k + (rand() - 0.5) * 0.0003;
    const rainbow = rainbowBand(price, id);

    samples.push({
      day: d,
      price,
      mvrv: Math.max(0.4, mvrv),
      mvrvZ,
      nupl,
      mayer: Math.max(0.4, mayer),
      puell: Math.max(0.2, puell),
      reserveRisk: Math.max(0.001, reserveRisk),
      rainbow,
    });
  }

  return {
    id,
    label,
    short,
    color,
    halvingDate: HALVINGS[id],
    endDate,
    endLabel,
    rewardBtc,
    peakPrice,
    peakDay,
    troughPrice,
    troughDay,
    samples,
  };
}

// Today is 2026-05-28 (770 days after the Apr 2024 halving).
export const TODAY_DAY_IN_CYCLE = 770;

export const CYCLES: Cycle[] = [
  buildCycle(2, "Cycle 2 — first halving", "C2", "#f5b942", 25, HALVINGS[3], "→ 2016 halving"),
  buildCycle(3, "Cycle 3 — second halving", "C3", "#a78bfa", 12.5, HALVINGS[4], "→ 2020 halving"),
  buildCycle(4, "Cycle 4 — third halving", "C4", "#ff5d5d", 6.25, HALVINGS[5], "→ 2024 halving"),
  buildCycle(5, "Cycle 5 — fourth halving", "C5", "#5eead4", 3.125, null, "current cycle", TODAY_DAY_IN_CYCLE),
];

export const CURRENT_CYCLE = CYCLES[CYCLES.length - 1];

export function getCycle(id: CycleId): Cycle | undefined {
  return CYCLES.find((c) => c.id === id);
}

// Convenience: last sample of current cycle = "today"
export const TODAY = CURRENT_CYCLE.samples[CURRENT_CYCLE.samples.length - 1];

// Days remaining until projected next halving (Apr 2028 ≈ day 1458).
export const NEXT_HALVING_DATE = HALVINGS[6];
export const DAYS_PER_CYCLE = 1458;
export const DAYS_TO_NEXT_HALVING = DAYS_PER_CYCLE - TODAY_DAY_IN_CYCLE;
export const CYCLE_PROGRESS_PCT = TODAY_DAY_IN_CYCLE / DAYS_PER_CYCLE;

// "Where each prior cycle was at the same day-in-cycle as today" — the headline comparison.
export function comparativeSnapshot() {
  return CYCLES.filter((c) => c.id !== 5).map((c) => {
    const sample = c.samples.reduce((closest, s) =>
      Math.abs(s.day - TODAY_DAY_IN_CYCLE) < Math.abs(closest.day - TODAY_DAY_IN_CYCLE) ? s : closest,
    );
    const halvingPrice = c.samples[0].price;
    return {
      cycle: c,
      sample,
      gainFromHalving: (sample.price / halvingPrice - 1) * 100,
      gainToCyclePeak: (c.peakPrice / halvingPrice - 1) * 100,
      daysFromHereToPeak: c.peakDay - TODAY_DAY_IN_CYCLE,
    };
  });
}
