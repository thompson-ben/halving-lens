// Honest, beginner-facing cycle intelligence. Everything in here is derived
// ONLY from data we can stand behind — live price and the live-derived price
// models (Mayer, Puell, Rainbow). Nothing here depends on the synthetic /
// modelled on-chain metrics (MVRV, NUPL, SOPR, RHODL, Reserve Risk, Realised
// Price), which are hidden from the user-facing product until a live data
// source is connected.

import {
  CURRENT_CYCLE,
  CYCLES,
  CYCLE_PROGRESS_PCT,
  SOURCE,
  SPOT,
  TODAY,
  TODAY_DAY_IN_CYCLE,
  type Cycle,
  type CycleSample,
} from "./btcData";

// ── Data status ────────────────────────────────────────────────────────────
// Single source of truth for "can we show this to a user as real?". Driven by
// the snapshot's per-metric source strings so it tracks reality automatically.

export type DataStatus = "live" | "live-derived" | "coming-soon";

// Metric slug → the snapshot source key it is fed by.
const SLUG_TO_SOURCE_KEY: Record<string, keyof typeof SOURCE.sources> = {
  "mvrv-z-score": "mvrv",
  nupl: "nupl",
  "mayer-multiple": "mayer",
  "puell-multiple": "puell",
  "reserve-risk": "reserveRisk",
  rainbow: "rainbow",
  sopr: "sopr",
  "realized-price": "realizedPrice",
  rhodl: "rhodl",
};

export function classifySource(source: string | undefined): DataStatus {
  if (!source) return "coming-soon";
  const s = source.toLowerCase();
  if (s.includes("synthetic") || s.includes("modelled")) return "coming-soon";
  if (s.startsWith("derived")) return "live-derived";
  return "live";
}

export function metricStatus(slug: string): DataStatus {
  const key = SLUG_TO_SOURCE_KEY[slug];
  return classifySource(key ? SOURCE.sources[key] : undefined);
}

export function metricSource(slug: string): string {
  const key = SLUG_TO_SOURCE_KEY[slug];
  return (key ? SOURCE.sources[key] : undefined) ?? "Not yet wired to a source";
}

// True for on-chain metrics fed by the ~4-year BGeometrics window: their data
// is real for the current cycle only, so their pages drop the cross-cycle view.
export function metricCurrentCycleOnly(slug: string): boolean {
  return metricSource(slug).includes("current cycle");
}

// Why a coming-soon metric isn't live yet — plain English.
export function comingSoonReason(slug: string): string {
  const src = metricSource(slug).toLowerCase();
  if (src.includes("no free public source")) {
    return "No free public data source is available for this metric yet.";
  }
  // The synthetic on-chain metrics all depend on realised cap.
  return "Requires realised-cap / on-chain cost-basis data, which isn't available from the free data source.";
}

export const STATUS_LABEL: Record<DataStatus, string> = {
  live: "Live",
  "live-derived": "Live-derived",
  "coming-soon": "Coming soon",
};

// ── Cycle phase (live-derived) ──────────────────────────────────────────────
// A simple, plain-English read of where the cycle is, from how far through the
// halving cycle we are (pure calendar) modulated by price heat (Mayer Multiple,
// which is live-derived from real price).

export type PhaseTone = "blue" | "green" | "teal" | "amber" | "red";

export interface CyclePhase {
  label: string;
  tone: PhaseTone;
  /** One-line description of what this phase tends to mean. */
  blurb: string;
}

export function cyclePhase(): CyclePhase {
  const progress = CYCLE_PROGRESS_PCT; // 0..1
  const mayer = TODAY.mayer; // price / 200d MA — live-derived

  // Heat extremes override the calendar read.
  if (mayer >= 2.4) {
    return {
      label: "Overheated / euphoria zone",
      tone: "red",
      blurb: "Price is stretched far above its 200-day average — historically a late, high-risk part of the cycle.",
    };
  }
  if (mayer < 0.85) {
    return progress < 0.25
      ? {
          label: "Early accumulation",
          tone: "blue",
          blurb: "Price sits below its 200-day average early in the cycle — historically a quiet accumulation phase.",
        }
      : {
          label: "Bear market / reset phase",
          tone: "blue",
          blurb: "Price is below its 200-day average — historically a cooldown or reset rather than an expansion.",
        };
  }

  // Otherwise, read by how far through the cycle we are.
  if (progress < 0.2) {
    return {
      label: "Post-halving accumulation",
      tone: "green",
      blurb: "Early in the cycle, before the historical expansion phase typically gathers pace.",
    };
  }
  if (progress < 0.45) {
    return {
      label: "Post-halving expansion",
      tone: "green",
      blurb: "The part of past cycles where price expansion has typically built after the halving.",
    };
  }
  if (progress < 0.7) {
    return {
      label: mayer >= 1.5 ? "Mid-cycle bull phase" : "Mid-cycle expansion",
      tone: "teal",
      blurb: "Historically a mid-cycle expansion period rather than a late-cycle euphoria zone.",
    };
  }
  if (progress < 0.9) {
    return {
      label: mayer >= 1.5 ? "Late-cycle risk zone" : "Late-cycle",
      tone: "amber",
      blurb: "The later part of the cycle, where past cycles have tended to run hotter and more volatile.",
    };
  }
  return {
    label: "Late-cycle / pre-halving",
    tone: "amber",
    blurb: "Approaching the next halving — the tail end of the historical cycle.",
  };
}

// ── Recent change (live-derived) ────────────────────────────────────────────
// We only have weekly samples, so we report the most recent sample-to-sample
// change and label it with its true span rather than faking a 24h figure.
//
// FOLLOW-UP TASK: source a true 24h BTC change from the live price API (e.g.
// CoinGecko /simple/price?include_24hr_change, or CoinMetrics) during sync and
// store it on the snapshot. Once available we can show both 24h and 7d change.
// Until then we only ever show the real 7d change — never a fabricated 24h one.

export function recentChange(): { pct: number; days: number } | null {
  const s = CURRENT_CYCLE.samples;
  if (s.length < 2) return null;
  const last = s[s.length - 1];
  const prev = s[s.length - 2];
  const days = Math.max(1, Math.round(last.day - prev.day));
  return { pct: (last.price / prev.price - 1) * 100, days };
}

// Headline price + change for the hero/top bar. Prefers the fresh daily spot
// (real 24h change); falls back to the most recent weekly sample change.
export function headlineSpot(): { price: number; pct: number | null; label: string } {
  if (SPOT) return { price: SPOT.price, pct: SPOT.change24h, label: "24h" };
  const rc = recentChange();
  return { price: TODAY.price, pct: rc?.pct ?? null, label: rc ? `${rc.days}d` : "" };
}

// ── Today vs prior cycles (real price) ──────────────────────────────────────

function sampleNearestDay(cycle: Cycle, day: number): CycleSample {
  return cycle.samples.reduce((best, cur) =>
    Math.abs(cur.day - day) < Math.abs(best.day - day) ? cur : best,
  );
}

export interface CycleAtSameDay {
  cycle: Cycle;
  sample: CycleSample;
  gainFromHalving: number; // % price change since this cycle's halving
}

export function currentGainFromHalving(): number {
  return (TODAY.price / CURRENT_CYCLE.samples[0].price - 1) * 100;
}

export function priorCyclesAtSameDay(): CycleAtSameDay[] {
  return CYCLES.filter((c) => c.id !== 5).map((c) => {
    const sample = sampleNearestDay(c, TODAY_DAY_IN_CYCLE);
    return {
      cycle: c,
      sample,
      gainFromHalving: (sample.price / c.samples[0].price - 1) * 100,
    };
  });
}

// Plain-English read of how hot the current cycle is vs prior cycles at the
// same day from halving — based purely on price change since halving.
export function relativeHeat(): { label: string; detail: string } {
  const current = currentGainFromHalving();
  const priors = priorCyclesAtSameDay().map((p) => p.gainFromHalving);
  const min = Math.min(...priors);
  const max = Math.max(...priors);
  if (current < min) {
    return {
      label: "cooler than every previous cycle",
      detail: "running below all prior cycles at the same point after the halving",
    };
  }
  if (current > max) {
    return {
      label: "hotter than every previous cycle",
      detail: "running above all prior cycles at the same point after the halving",
    };
  }
  return {
    label: "broadly in line with previous cycles",
    detail: "tracking within the range of prior cycles at the same point after the halving",
  };
}

// ── What happened next (real price, prior cycles only) ──────────────────────
// From the same day-from-halving, what did each completed prior cycle do over
// the following months. History, not a forecast.

export interface ForwardHorizon {
  label: string;
  days: number;
  perCycle: Array<{ cycleId: number; short: string; color: string; pct: number }>;
  avg: number;
}

export interface ForwardOutcomes {
  horizons: ForwardHorizon[];
  daysToPeak: { short: string; color: string; days: number }[];
  avgDaysToPeak: number | null;
}

const HORIZONS: Array<{ label: string; days: number }> = [
  { label: "3 months later", days: 91 },
  { label: "6 months later", days: 182 },
  { label: "12 months later", days: 365 },
];

export function forwardOutcomes(): ForwardOutcomes {
  const priors = CYCLES.filter((c) => c.id !== 5);

  const horizons: ForwardHorizon[] = HORIZONS.map(({ label, days }) => {
    const perCycle = priors
      .map((c) => {
        const base = sampleNearestDay(c, TODAY_DAY_IN_CYCLE);
        const targetDay = base.day + days;
        // Only count it if the cycle actually has data out to ~that day.
        const lastDay = c.samples[c.samples.length - 1].day;
        if (targetDay > lastDay + 30) return null;
        const future = sampleNearestDay(c, targetDay);
        return {
          cycleId: c.id,
          short: c.short,
          color: c.color,
          pct: (future.price / base.price - 1) * 100,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const avg =
      perCycle.length > 0 ? perCycle.reduce((a, b) => a + b.pct, 0) / perCycle.length : 0;
    return { label, days, perCycle, avg };
  });

  const daysToPeak = priors
    .map((c) => {
      const base = sampleNearestDay(c, TODAY_DAY_IN_CYCLE);
      const ahead = c.peakDay - base.day;
      return ahead > 0
        ? { short: c.short, color: c.color, days: Math.round(ahead) }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const avgDaysToPeak =
    daysToPeak.length > 0
      ? Math.round(daysToPeak.reduce((a, b) => a + b.days, 0) / daysToPeak.length)
      : null;

  return { horizons, daysToPeak, avgDaysToPeak };
}

// ── What happened next — 30 / 60 / 90 days (real price, prior cycles) ────────
// From today's day-from-halving, what did each completed prior cycle do over
// the next 30, 60 and 90 days. Strict historical context — not a forecast,
// no expected returns. Weekly samples, read at the nearest day to each target.

export interface WhatNextRow {
  cycleId: number;
  short: string;
  color: string;
  year: string; // halving year (2012 / 2016 / 2020)
  d30: number | null; // % change over the next 30 days
  d60: number | null;
  d90: number | null;
}

export interface WhatHappenedNext {
  cycleDay: number;
  rows: WhatNextRow[];
  avg30: number | null;
  avg60: number | null;
  avg90: number | null;
}

export function whatHappenedNext(): WhatHappenedNext {
  const priors = CYCLES.filter((c) => c.id !== 5);

  // Forward % at +days from the sample nearest today's day-in-cycle. Returns
  // null when the cycle lacks data out to roughly that day (weekly tolerance).
  const fwd = (c: Cycle, days: number): number | null => {
    const base = sampleNearestDay(c, TODAY_DAY_IN_CYCLE);
    const targetDay = base.day + days;
    const lastDay = c.samples[c.samples.length - 1].day;
    if (targetDay > lastDay + 10) return null;
    const future = sampleNearestDay(c, targetDay);
    if (future.day === base.day) return null;
    return Math.round((future.price / base.price - 1) * 100);
  };

  const rows: WhatNextRow[] = priors.map((c) => ({
    cycleId: c.id,
    short: c.short,
    color: c.color,
    year: c.halvingDate.slice(0, 4),
    d30: fwd(c, 30),
    d60: fwd(c, 60),
    d90: fwd(c, 90),
  }));

  const avg = (pick: (r: WhatNextRow) => number | null): number | null => {
    const vals = rows.map(pick).filter((v): v is number => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };

  return {
    cycleDay: TODAY_DAY_IN_CYCLE,
    rows,
    avg30: avg((r) => r.d30),
    avg60: avg((r) => r.d60),
    avg90: avg((r) => r.d90),
  };
}

// ── Cycle divergence read (real price + peak timing) ────────────────────────
// Honest, carefully-worded interpretation of how this cycle compares with the
// classic four-year rhythm: later by calendar timing, but cooler by price.
// Computed from real data so it stays truthful as the cycle progresses.

export interface CycleDivergence {
  priorsPeakedByNow: number;
  priorCount: number;
  later: boolean; // most prior cycles had already peaked by this day
  cooler: boolean; // current price gain is below the prior average
  chip: string; // short, non-alarmist label
  keyInsight: string; // one-line takeaway
  summary: string; // careful paragraph for normal users
}

export function cycleDivergence(): CycleDivergence {
  const priors = CYCLES.filter((c) => c.id !== 5);
  const priorCount = priors.length;
  const priorsPeakedByNow = priors.filter((c) => c.peakDay < TODAY_DAY_IN_CYCLE).length;

  const currentGain = currentGainFromHalving();
  const priorGains = priorCyclesAtSameDay().map((p) => p.gainFromHalving);
  const priorAvg = priorGains.reduce((a, b) => a + b, 0) / (priorGains.length || 1);

  const later = priorsPeakedByNow >= Math.ceil(priorCount / 2);
  const cooler = currentGain < priorAvg;

  const chip = later && cooler ? "Later-running · cooler cycle" : later ? "Later-running cycle" : cooler ? "Cooler than prior cycles" : "Tracking prior cycles";

  const keyInsight =
    later && cooler
      ? "The cycle is later by calendar timing, but cooler by price behaviour."
      : later
        ? "By calendar timing, this is later in the cycle than the classic pattern."
        : cooler
          ? "Price is running cooler than previous cycles at this point."
          : "This cycle is broadly tracking previous cycles at this point.";

  const peakedPhrase =
    priorsPeakedByNow === priorCount
      ? `all ${numberWord(priorCount)} previous cycles had already reached their major peak by this point after the halving`
      : priorsPeakedByNow > 0
        ? `${numberWord(priorsPeakedByNow)} of the ${numberWord(priorCount)} previous cycles had already reached their major peak by this point after the halving`
        : "previous cycles had not yet peaked by this point after the halving";

  const summary = later
    ? `Historically, ${peakedPhrase}. The current cycle is behaving differently — flatter and slower, and potentially more structurally supported by ETF demand. This does not guarantee future upside, but it does suggest the current cycle is not following the classic four-year rhythm cleanly.`
    : `Compared with previous cycles at the same point after the halving, the current cycle is ${cooler ? "running cooler" : "broadly in line"}. This is historical context, not a forecast.`;

  return { priorsPeakedByNow, priorCount, later, cooler, chip, keyInsight, summary };
}

function numberWord(n: number): string {
  return ["zero", "one", "two", "three", "four", "five"][n] ?? String(n);
}

// ── Comparative tracking headline (real price) ──────────────────────────────
// Careful, factual statement of how the current cycle's price multiple (vs its
// own halving) compares with prior cycles at the same day from halving.

function multipleAtToday(cycle: Cycle): number {
  return sampleNearestDay(cycle, TODAY_DAY_IN_CYCLE).price / cycle.samples[0].price;
}

export function cycleTrackingHeadline(): string {
  const current = TODAY.price / CURRENT_CYCLE.samples[0].price;
  const priors = CYCLES.filter((c) => c.id !== 5).map((c) => ({
    year: c.halvingDate.slice(0, 4),
    mult: multipleAtToday(c),
  }));
  const below = priors.filter((p) => p.mult > current).map((p) => p.year); // current is below these
  const above = priors.filter((p) => p.mult <= current).map((p) => p.year);

  const list = (xs: string[]) =>
    xs.length <= 1 ? xs[0] ?? "" : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

  if (below.length === priors.length) {
    return "Bitcoin is currently tracking below every previous cycle at the same point after the halving.";
  }
  if (above.length === priors.length) {
    return "Bitcoin is currently tracking above every previous cycle at the same point after the halving.";
  }
  return `Bitcoin is currently tracking below the ${list(below)} cycle${
    below.length > 1 ? "s" : ""
  } but above the ${list(above)} cycle${above.length > 1 ? "s" : ""} at the same point after the halving.`;
}
