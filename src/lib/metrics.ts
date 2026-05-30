import { CURRENT_CYCLE, TODAY, type Cycle, type CycleSample } from "./btcData";
import { fmtUsd } from "./format";

// "Zone" classification for top/mid/bottom oscillators.
export type Zone = "bottom" | "accumulation" | "neutral" | "bullish" | "euphoria" | "top";

export const ZONE_TONE: Record<Zone, "red" | "amber" | "green" | "blue" | "violet" | "muted"> = {
  bottom: "blue",
  accumulation: "green",
  neutral: "muted",
  bullish: "green",
  euphoria: "amber",
  top: "red",
};

export const ZONE_LABEL: Record<Zone, string> = {
  bottom: "Bottom",
  accumulation: "Accumulation",
  neutral: "Neutral",
  bullish: "Bullish",
  euphoria: "Euphoria",
  top: "Top zone",
};

type SamplePicker = (s: CycleSample) => number;

interface Band {
  // Inclusive lower bound; -Infinity for "below everything".
  min: number;
  max: number;
  zone: Zone;
  label: string;
}

export interface MetricDef {
  slug: string;
  name: string;
  short: string;
  group: "valuation" | "cycle" | "behaviour" | "miner" | "price";
  paidAt: string; // who currently charges for it
  unit: "x" | "z" | "%" | "$" | "band" | "ratio";
  decimals: number;
  description: string;
  why: string;
  bands: Band[]; // ordered; first match wins
  pick: SamplePicker;
  // For chart Y-axis scaling (optional)
  yMin?: number;
  yMax?: number;
}

export const METRICS: MetricDef[] = [
  {
    slug: "mvrv-z-score",
    name: "MVRV Z-Score",
    short: "MVRV-Z",
    group: "valuation",
    paidAt: "Glassnode Advanced ($39/mo)",
    unit: "z",
    decimals: 2,
    description:
      "Standardised difference between market cap and realised cap. Reads how far Bitcoin trades above or below the aggregate cost basis of every coin.",
    why:
      "Has called every cycle top within a week (z > 7) and every bottom (z < 0). The single most quoted on-chain valuation oscillator.",
    bands: [
      { min: -Infinity, max: 0, zone: "bottom", label: "Generational buy" },
      { min: 0, max: 1, zone: "accumulation", label: "Accumulation" },
      { min: 1, max: 3, zone: "neutral", label: "Mid-cycle" },
      { min: 3, max: 5, zone: "bullish", label: "Bullish" },
      { min: 5, max: 7, zone: "euphoria", label: "Euphoria" },
      { min: 7, max: Infinity, zone: "top", label: "Cycle top zone" },
    ],
    pick: (s) => s.mvrvZ,
    yMin: -1,
    yMax: 12,
  },
  {
    slug: "nupl",
    name: "NUPL",
    short: "NUPL",
    group: "behaviour",
    paidAt: "Glassnode Advanced",
    unit: "ratio",
    decimals: 3,
    description:
      "Net Unrealised Profit/Loss. Share of the network's market cap currently held in profit vs. loss — a thermometer for collective greed and fear.",
    why:
      "Crosses 0.75 only in cycle peaks (2013, 2017, 2021). Drops below 0 in capitulation. Smooth and intuitive.",
    bands: [
      { min: -Infinity, max: 0, zone: "bottom", label: "Capitulation" },
      { min: 0, max: 0.25, zone: "accumulation", label: "Hope / fear" },
      { min: 0.25, max: 0.5, zone: "neutral", label: "Optimism" },
      { min: 0.5, max: 0.75, zone: "bullish", label: "Belief" },
      { min: 0.75, max: Infinity, zone: "top", label: "Euphoria" },
    ],
    pick: (s) => s.nupl,
    yMin: -0.3,
    yMax: 0.9,
  },
  {
    slug: "mayer-multiple",
    name: "Mayer Multiple",
    short: "Mayer",
    group: "price",
    paidAt: "Free, but no cycle overlay anywhere",
    unit: "x",
    decimals: 2,
    description:
      "Spot price divided by the 200-day moving average. The simplest cycle gauge — coined by Trace Mayer.",
    why:
      "Historical tops cluster around 2.4–3.5×. Sub-1× has been a generational buy every time. Falls out of vogue, comes back every cycle.",
    bands: [
      { min: -Infinity, max: 0.8, zone: "bottom", label: "Deep value" },
      { min: 0.8, max: 1, zone: "accumulation", label: "Below trend" },
      { min: 1, max: 1.5, zone: "neutral", label: "Above trend" },
      { min: 1.5, max: 2.4, zone: "bullish", label: "Hot" },
      { min: 2.4, max: Infinity, zone: "top", label: "Overheated" },
    ],
    pick: (s) => s.mayer,
    yMin: 0.4,
    yMax: 4,
  },
  {
    slug: "puell-multiple",
    name: "Puell Multiple",
    short: "Puell",
    group: "miner",
    paidAt: "Glassnode Advanced",
    unit: "x",
    decimals: 2,
    description:
      "Daily USD value of miner issuance divided by its 365-day MA. Reads miner revenue pressure relative to recent history.",
    why:
      "Spikes >4× have only happened at cycle tops. Sub-0.5× has historically marked the right zone to buy.",
    bands: [
      { min: -Infinity, max: 0.5, zone: "bottom", label: "Miner capitulation" },
      { min: 0.5, max: 1, zone: "accumulation", label: "Suppressed" },
      { min: 1, max: 2, zone: "neutral", label: "Normal" },
      { min: 2, max: 4, zone: "bullish", label: "Elevated" },
      { min: 4, max: Infinity, zone: "top", label: "Top zone" },
    ],
    pick: (s) => s.puell,
    yMin: 0,
    yMax: 8,
  },
  {
    slug: "reserve-risk",
    name: "Reserve Risk",
    short: "RR",
    group: "behaviour",
    paidAt: "Glassnode Advanced",
    unit: "ratio",
    decimals: 4,
    description:
      "Balances long-term holder confidence (HODL conviction) against the cost of acquiring Bitcoin today. Low = asymmetric reward.",
    why:
      "Sub-0.002 is rare — only seen at the absolute lows of 2015, 2018, 2022. >0.02 marks tops.",
    bands: [
      { min: -Infinity, max: 0.002, zone: "bottom", label: "Generational buy" },
      { min: 0.002, max: 0.005, zone: "accumulation", label: "Asymmetric" },
      { min: 0.005, max: 0.01, zone: "neutral", label: "Fair" },
      { min: 0.01, max: 0.02, zone: "bullish", label: "Stretched" },
      { min: 0.02, max: Infinity, zone: "top", label: "Top zone" },
    ],
    pick: (s) => s.reserveRisk,
    yMin: 0.001,
    yMax: 0.025,
  },
  {
    slug: "rainbow",
    name: "Rainbow band",
    short: "Rainbow",
    group: "cycle",
    paidAt: "Free, but only as a single chart",
    unit: "band",
    decimals: 1,
    description:
      "Where price sits relative to the long-term power-law trend. Bands run from 'Fire sale' to 'Maximum bubble territory'.",
    why:
      "The most-shared single chart in Bitcoin culture. Used as a sentiment thermometer at every dinner-table conversation.",
    bands: [
      { min: -Infinity, max: 1, zone: "bottom", label: "Fire sale" },
      { min: 1, max: 3, zone: "accumulation", label: "Accumulate" },
      { min: 3, max: 5, zone: "neutral", label: "HODL" },
      { min: 5, max: 7, zone: "bullish", label: "FOMO" },
      { min: 7, max: Infinity, zone: "top", label: "Maximum bubble" },
    ],
    pick: (s) => s.rainbow,
    yMin: 0,
    yMax: 9,
  },
  {
    slug: "sopr",
    name: "SOPR",
    short: "SOPR",
    group: "behaviour",
    paidAt: "Glassnode Advanced",
    unit: "ratio",
    decimals: 3,
    description:
      "Spent Output Profit Ratio. The aggregate ratio between sell price and acquisition cost of every coin moved on-chain. >1 means the network is realising profit; <1 means realising loss.",
    why:
      "Sustained SOPR < 1 has marked every major bottom — the network can no longer realise a profit. Spikes above 1.10 cluster around tops.",
    bands: [
      { min: -Infinity, max: 0.97, zone: "bottom", label: "Capitulation" },
      { min: 0.97, max: 1.0, zone: "accumulation", label: "Realising losses" },
      { min: 1.0, max: 1.05, zone: "neutral", label: "Mild profit" },
      { min: 1.05, max: 1.1, zone: "bullish", label: "Strong profit" },
      { min: 1.1, max: Infinity, zone: "top", label: "Top zone" },
    ],
    pick: (s) => s.sopr,
    yMin: 0.88,
    yMax: 1.5,
  },
  {
    slug: "realized-price",
    name: "Realised price",
    short: "RP",
    group: "valuation",
    paidAt: "Glassnode Advanced",
    unit: "$",
    decimals: 0,
    description:
      "The aggregate cost-basis of every coin in circulation. Spot price minus realised price tells you whether the network is in profit or in loss on average.",
    why:
      "Spot crossing below realised price is the textbook capitulation event — has marked every bear-market bottom (2015, 2018, 2022).",
    bands: [],
    pick: (s) => s.realizedPrice,
    yMin: 0,
  },
  {
    slug: "rhodl",
    name: "RHODL Ratio",
    short: "RHODL",
    group: "cycle",
    paidAt: "Glassnode Advanced",
    unit: "ratio",
    decimals: 0,
    description:
      "Ratio of 1-week realised value to 1–2-year realised value, multiplied by network age. Reads the imbalance between fresh hands and seasoned holders.",
    why:
      "Crosses into the red zone only at cycle tops (2013, 2017, 2021). One of the cleanest cycle-top signals on record.",
    bands: [
      { min: -Infinity, max: 1000, zone: "bottom", label: "Generational buy" },
      { min: 1000, max: 5000, zone: "accumulation", label: "Accumulation" },
      { min: 5000, max: 15000, zone: "neutral", label: "Mid-cycle" },
      { min: 15000, max: 30000, zone: "bullish", label: "Late expansion" },
      { min: 30000, max: Infinity, zone: "top", label: "Cycle top zone" },
    ],
    pick: (s) => s.rhodl,
    yMin: 200,
    yMax: 70000,
  },
];

export function metricBySlug(slug: string): MetricDef | undefined {
  return METRICS.find((m) => m.slug === slug);
}

export function zoneFor(metric: MetricDef, value: number): { zone: Zone; label: string } {
  if (!metric.bands.length) return { zone: "neutral", label: "Tracked" };
  for (const b of metric.bands) {
    if (value >= b.min && value < b.max) return { zone: b.zone, label: b.label };
  }
  const last = metric.bands[metric.bands.length - 1];
  return { zone: last.zone, label: last.label };
}

// Plain-English, beginner-facing read of what a metric's current value means.
// Zone-based, so it's truthful — it describes the band the value falls in, not
// a fabricated precision.
const ZONE_TODAY: Record<Zone, string> = {
  bottom: "Historically a deeply discounted, late-bear range.",
  accumulation: "Historically an accumulation range, where longer-term value has tended to build.",
  neutral: "A middle-of-the-road range — neither cheap nor stretched.",
  bullish: "An expansion range: above long-term averages, but not yet euphoric.",
  euphoria: "Running hot — historically a late-cycle, elevated-risk range.",
  top: "Stretched into territory historically associated with cycle tops.",
};

export function metricTodayRead(metric: MetricDef, value: number): string {
  const { zone, label } = zoneFor(metric, value);
  const num =
    metric.unit === "$"
      ? fmtUsd(value, { compact: true })
      : metric.unit === "%"
        ? `${value.toFixed(metric.decimals)}%`
        : `${value.toFixed(metric.decimals)}${metric.unit === "x" ? "×" : ""}`;
  return `${metric.short} currently reads ${num} — ${label}. ${ZONE_TODAY[zone]}`;
}

// Composite cycle index 0–100 — rolls the major metrics into a single read.
export function compositeCycleIndex(sample = TODAY): { value: number; zone: Zone; label: string } {
  // Normalise each metric to 0..100, then average. Higher = closer to top.
  const components = [
    norm(sample.mvrvZ, -1, 10),
    norm(sample.nupl, -0.3, 0.85),
    norm(sample.mayer, 0.5, 3.0),
    norm(sample.rainbow, 0, 8),
    norm(sample.reserveRisk, 0.001, 0.022),
  ];
  const value = Math.round(components.reduce((a, b) => a + b, 0) / components.length);
  let zone: Zone = "neutral";
  let label = "Mid-cycle";
  if (value < 10) { zone = "bottom"; label = "Capitulation"; }
  else if (value < 25) { zone = "accumulation"; label = "Accumulation"; }
  else if (value < 50) { zone = "neutral"; label = "Mid-cycle"; }
  else if (value < 70) { zone = "bullish"; label = "Bullish phase"; }
  else if (value < 85) { zone = "euphoria"; label = "Late-cycle"; }
  else { zone = "top"; label = "Top zone"; }
  return { value, zone, label };
}

function norm(v: number, lo: number, hi: number): number {
  return Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
}

// Pi Cycle Top — 111-day MA crossing above 2 × 350-day MA. We simulate this
// from the current cycle's price series.
export function piCycleStatus(): { triggered: boolean; ratio: number; daysSinceCross: number | null } {
  // With weekly samples we approximate: short MA = last ~16 samples (≈111d),
  // long MA = last ~50 samples (≈350d), then * 2.
  const s = CURRENT_CYCLE.samples;
  const shortN = 16;
  const longN = 50;
  if (s.length < longN) return { triggered: false, ratio: 0, daysSinceCross: null };
  const last = s.slice(-shortN);
  const longTail = s.slice(-longN);
  const shortMA = last.reduce((a, b) => a + b.price, 0) / last.length;
  const longMA = (longTail.reduce((a, b) => a + b.price, 0) / longTail.length) * 2;
  const ratio = shortMA / longMA;
  return { triggered: ratio >= 1, ratio, daysSinceCross: null };
}

export function valueAtDay(cycle: Cycle, metric: MetricDef, day: number): number {
  // Find closest sample by day.
  const s = cycle.samples.reduce((best, cur) =>
    Math.abs(cur.day - day) < Math.abs(best.day - day) ? cur : best,
  );
  return metric.pick(s);
}
