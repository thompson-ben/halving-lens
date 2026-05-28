// Synthetic cycle generation — anchor prices + deterministic walk. This is
// the offline fallback used when no live snapshot has been synced. It
// produces values shaped to the same Snapshot interface so callers don't
// know the difference.

import {
  CYCLE_META,
  type Cycle,
  type CycleId,
  type CycleSample,
  HALVINGS,
  type Snapshot,
} from "./types";

interface CycleAnchor {
  day: number;
  price: number;
}

const ANCHORS: Record<Exclude<CycleId, 1>, CycleAnchor[]> = {
  2: [
    { day: 0, price: 12.5 },
    { day: 40, price: 18 },
    { day: 90, price: 28 },
    { day: 140, price: 75 },
    { day: 200, price: 120 },
    { day: 260, price: 135 },
    { day: 330, price: 220 },
    { day: 380, price: 1150 },
    { day: 440, price: 700 },
    { day: 540, price: 580 },
    { day: 660, price: 380 },
    { day: 780, price: 240 },
    { day: 870, price: 210 },
    { day: 980, price: 270 },
    { day: 1100, price: 450 },
    { day: 1240, price: 430 },
    { day: 1335, price: 660 },
  ],
  3: [
    { day: 0, price: 650 },
    { day: 60, price: 620 },
    { day: 120, price: 730 },
    { day: 200, price: 1100 },
    { day: 280, price: 2700 },
    { day: 340, price: 4500 },
    { day: 400, price: 8500 },
    { day: 510, price: 19400 },
    { day: 580, price: 9300 },
    { day: 680, price: 7400 },
    { day: 760, price: 6400 },
    { day: 870, price: 3300 },
    { day: 980, price: 5100 },
    { day: 1080, price: 9200 },
    { day: 1180, price: 10100 },
    { day: 1280, price: 7400 },
    { day: 1380, price: 8800 },
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
    { day: 560, price: 69000 },
    { day: 620, price: 47000 },
    { day: 700, price: 40000 },
    { day: 770, price: 31000 },
    { day: 800, price: 20000 },
    { day: 920, price: 16500 },
    { day: 1000, price: 22500 },
    { day: 1100, price: 27000 },
    { day: 1200, price: 35000 },
    { day: 1300, price: 42000 },
    { day: 1380, price: 52000 },
    { day: 1435, price: 64000 },
  ],
  5: [
    { day: 0, price: 64500 },
    { day: 30, price: 60000 },
    { day: 80, price: 58000 },
    { day: 140, price: 66000 },
    { day: 200, price: 71500 },
    { day: 260, price: 88000 },
    { day: 310, price: 99500 },
    { day: 360, price: 105000 },
    { day: 420, price: 112000 },
    { day: 480, price: 96000 },
    { day: 540, price: 104000 },
    { day: 600, price: 92000 },
    { day: 680, price: 101000 },
    { day: 740, price: 96500 },
    { day: 770, price: 97842 },
  ],
};

const PEAK_METRICS: Record<
  Exclude<CycleId, 1>,
  { mvrv: number; mvrvZ: number; nupl: number; mayer: number; puell: number; reserveRisk: number; sopr: number; rhodl: number }
> = {
  2: { mvrv: 5.8, mvrvZ: 11.2, nupl: 0.85, mayer: 3.5, puell: 7.2, reserveRisk: 0.020, sopr: 1.45, rhodl: 67000 },
  3: { mvrv: 4.6, mvrvZ: 8.7, nupl: 0.78, mayer: 3.4, puell: 4.4, reserveRisk: 0.013, sopr: 1.28, rhodl: 41000 },
  4: { mvrv: 3.8, mvrvZ: 7.0, nupl: 0.75, mayer: 2.8, puell: 3.1, reserveRisk: 0.008, sopr: 1.20, rhodl: 29000 },
  5: { mvrv: 3.1, mvrvZ: 3.6, nupl: 0.68, mayer: 2.05, puell: 2.4, reserveRisk: 0.0044, sopr: 1.11, rhodl: 14000 },
};

const TROUGH_METRICS: Record<
  Exclude<CycleId, 1>,
  { mvrv: number; mvrvZ: number; nupl: number; mayer: number; puell: number; reserveRisk: number; sopr: number; rhodl: number }
> = {
  2: { mvrv: 0.70, mvrvZ: -0.4, nupl: -0.2, mayer: 0.55, puell: 0.40, reserveRisk: 0.0015, sopr: 0.91, rhodl: 280 },
  3: { mvrv: 0.80, mvrvZ: -0.3, nupl: -0.18, mayer: 0.58, puell: 0.45, reserveRisk: 0.0017, sopr: 0.92, rhodl: 420 },
  4: { mvrv: 0.85, mvrvZ: -0.2, nupl: -0.15, mayer: 0.62, puell: 0.30, reserveRisk: 0.0019, sopr: 0.94, rhodl: 590 },
  5: { mvrv: 0.95, mvrvZ: 0.05, nupl: 0.08, mayer: 0.78, puell: 0.55, reserveRisk: 0.0024, sopr: 0.98, rhodl: 1100 },
};

const RAINBOW_PEAK: Record<Exclude<CycleId, 1>, { peak: number; peakBand: number }> = {
  2: { peak: 1150, peakBand: 8.0 },
  3: { peak: 19400, peakBand: 8.0 },
  4: { peak: 69000, peakBand: 7.6 },
  5: { peak: 112000, peakBand: 6.8 },
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
      const t = (day - a.day) / (b.day - a.day);
      const logA = Math.log(a.price);
      const logB = Math.log(b.price);
      const eased = t * t * (3 - 2 * t);
      return Math.exp(logA + (logB - logA) * eased);
    }
  }
  return anchors[anchors.length - 1].price;
}

function rainbowBand(price: number, cycleId: Exclude<CycleId, 1>): number {
  const cfg = RAINBOW_PEAK[cycleId];
  const band = cfg.peakBand + 7 * Math.log10(price / cfg.peak);
  return Math.max(0, Math.min(8, band));
}

function buildCycle(id: Exclude<CycleId, 1>, capDay?: number): Cycle {
  const meta = CYCLE_META.find((c) => c.id === id)!;
  const anchors = ANCHORS[id];
  const peak = PEAK_METRICS[id];
  const trough = TROUGH_METRICS[id];
  const totalDays = capDay ?? anchors[anchors.length - 1].day;
  const step = 7;
  const rand = pseudoRand(id * 7919);

  let peakPrice = 0;
  let peakDay = 0;
  let troughPrice = Infinity;
  let troughDay = 0;

  const samples: CycleSample[] = [];
  for (let d = 0; d <= totalDays; d += step) {
    const basePrice = interpolatePrice(anchors, d);
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

    const anchorPeakDay = anchors.find((a) => a.price === Math.max(...anchors.map((x) => x.price)))?.day ?? 0;
    const peakRatio = price / interpolatePrice(anchors, anchorPeakDay);
    const pct = Math.max(0, Math.min(1, peakRatio));
    const k = Math.pow(pct, 1.2);

    const mvrv = trough.mvrv + (peak.mvrv - trough.mvrv) * k + (rand() - 0.5) * 0.04;
    const mvrvZ = trough.mvrvZ + (peak.mvrvZ - trough.mvrvZ) * k + (rand() - 0.5) * 0.1;
    const nupl = trough.nupl + (peak.nupl - trough.nupl) * k + (rand() - 0.5) * 0.01;
    const mayer = trough.mayer + (peak.mayer - trough.mayer) * k + (rand() - 0.5) * 0.03;
    const puell = trough.puell + (peak.puell - trough.puell) * k + (rand() - 0.5) * 0.08;
    const reserveRisk =
      trough.reserveRisk + (peak.reserveRisk - trough.reserveRisk) * k + (rand() - 0.5) * 0.0003;
    const rainbow = rainbowBand(price, id);
    const sopr = trough.sopr + (peak.sopr - trough.sopr) * k + (rand() - 0.5) * 0.008;
    const rhodl =
      Math.exp(Math.log(trough.rhodl) + (Math.log(peak.rhodl) - Math.log(trough.rhodl)) * k) *
      (1 + (rand() - 0.5) * 0.06);
    const realizedPrice = price / Math.max(0.4, mvrv);

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
      sopr: Math.max(0.85, sopr),
      rhodl: Math.max(100, rhodl),
      realizedPrice,
    });
  }

  return {
    id,
    label: meta.label,
    short: meta.short,
    color: meta.color,
    halvingDate: meta.startDate,
    endDate: meta.endDate,
    endLabel: meta.endLabel,
    rewardBtc: meta.rewardBtc,
    peakPrice,
    peakDay,
    troughPrice,
    troughDay,
    samples,
  };
}

// 770 = days between 2024-04-19 (cycle 5 halving) and ~2026-05-28.
export const SYNTHETIC_TODAY_DAY_IN_CYCLE = 770;

export function syntheticSnapshot(): Snapshot {
  return {
    source: {
      mode: "synthetic",
      fetchedAt: null,
      sources: {
        price: "synthetic — anchor prices + deterministic walk",
        mvrv: "synthetic",
        nupl: "synthetic",
        mayer: "synthetic",
        puell: "synthetic",
        reserveRisk: "synthetic",
        rainbow: "synthetic",
        sopr: "synthetic",
        rhodl: "synthetic",
        realizedPrice: "synthetic",
      },
    },
    cycles: [
      buildCycle(2),
      buildCycle(3),
      buildCycle(4),
      buildCycle(5, SYNTHETIC_TODAY_DAY_IN_CYCLE),
    ],
    todayDayInCycle: SYNTHETIC_TODAY_DAY_IN_CYCLE,
  };
}

export { HALVINGS };
