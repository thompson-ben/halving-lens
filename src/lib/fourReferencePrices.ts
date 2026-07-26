// Bitcoin's Four Reference Prices — Framework Phase A (no UI in this PR).
//
// The weekly-cadence configuration engine behind the framework: where the
// market price sits relative to its three reference prices — the trend
// (200-day moving average), the holders (Realised Price) and the miners
// (Estimated Mining Cost) — described, counted and compared historically.
// Weekly cadence is canonical (decision after PR141): the Mayer-recovered
// 200DMA reaches back through the whole realised-price archive, giving the
// widest honest comparison window.
//
// Evidence discipline:
//   - every historical row is built only from series the observed-window
//     registry vouches for; realised price before its archive floor and
//     mining cost outside its model window are simply absent, never filled;
//   - statistics are computed per availability tier and always carry their
//     window, so no claim outruns its evidence;
//   - all output language is descriptive of the past and present — never
//     support/floor/target vocabulary, never a forecast.

import { CYCLES, ONCHAIN, SPOT } from "./btcData";
import { metricStatus } from "./cycleIntel";
import { miningCostDailyPoints, referencePrices } from "./productionCost";
import { priceContext } from "./priceContext";
import { fmtUsd } from "./format";

const MS_DAY = 86_400_000;
const MS_WEEK = 7 * MS_DAY;
// A reference value joined to a weekly sample must be at most this stale.
const JOIN_MAX_DAYS = 14;
// |gap| below this reads as "near" in narrative (never affects the counts).
const NEAR_PCT = 10;

// ── Weekly configuration table ──────────────────────────────────────────────

export interface WeeklyRow {
  ts: number;
  date: string; // ISO
  price: number;
  ma200: number;
  realised: number | null; // null before the observed archive floor
  mining: number | null; // null outside the model window / when withheld
  aboveTrend: boolean;
  aboveHolders: boolean | null;
  aboveMiners: boolean | null;
}

interface RefPoint {
  ts: number;
  value: number;
}

function datedSeries(pts: Array<{ date: string; value: number }> | undefined | null): RefPoint[] {
  return (pts ?? [])
    .map((p) => ({ ts: Date.parse(`${p.date}T00:00:00Z`), value: p.value }))
    .filter((p) => Number.isFinite(p.ts) && p.value > 0)
    .sort((a, b) => a.ts - b.ts);
}

function valueAt(series: RefPoint[], ts: number): number | null {
  let lo = 0,
    hi = series.length - 1,
    best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].ts <= ts) {
      best = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (best < 0) return null;
  return ts - series[best].ts > JOIN_MAX_DAYS * MS_DAY ? null : series[best].value;
}

let tableCache: WeeklyRow[] | null = null;

export function weeklyConfigurationTable(): WeeklyRow[] {
  if (tableCache) return tableCache;
  const realisedLive = metricStatus("realized-price") !== "coming-soon";
  const realised = realisedLive ? datedSeries(ONCHAIN?.series?.realizedPrice) : [];
  const mining = datedSeries(miningCostDailyPoints()?.map((p) => ({ date: new Date(p.ts).toISOString().slice(0, 10), value: p.value })));
  const out: WeeklyRow[] = [];
  for (const c of CYCLES) {
    const base = Date.parse(`${c.halvingDate}T00:00:00Z`);
    for (const s of c.samples) {
      if (s.price <= 0 || s.mayer <= 0) continue; // both needed for price + trend
      const ts = base + s.day * MS_DAY;
      const ma200 = s.price / s.mayer;
      const r = realised.length ? valueAt(realised, ts) : null;
      const m = mining.length ? valueAt(mining, ts) : null;
      out.push({
        ts,
        date: new Date(ts).toISOString().slice(0, 10),
        price: s.price,
        ma200,
        realised: r,
        mining: m,
        aboveTrend: s.price >= ma200,
        aboveHolders: r != null ? s.price >= r : null,
        aboveMiners: m != null ? s.price >= m : null,
      });
    }
  }
  tableCache = out.sort((a, b) => a.ts - b.ts);
  return tableCache;
}

// ── Configuration naming ────────────────────────────────────────────────────

// A configuration is the above/below pattern vs whichever references are
// available. Each has a STABLE machine identifier (for analytics, tests,
// historical tables and any future API) and a human-readable name generated
// from the same flags — id and description can never disagree. The id grammar
// composes, so partial-availability tiers produce valid ids of the same form:
//   "above-trend_above-holders_above-miners"  (full)
//   "below-trend_above-miners"                (with-mining tier)
//   "above-trend"                             (trend-only tier)
export function configurationId(
  aboveTrend: boolean,
  aboveHolders: boolean | null,
  aboveMiners: boolean | null,
): string {
  const parts = [`${aboveTrend ? "above" : "below"}-trend`];
  if (aboveHolders != null) parts.push(`${aboveHolders ? "above" : "below"}-holders`);
  if (aboveMiners != null) parts.push(`${aboveMiners ? "above" : "below"}-miners`);
  return parts.join("_");
}

export function configurationName(
  aboveTrend: boolean,
  aboveHolders: boolean | null,
  aboveMiners: boolean | null,
): string {
  const refs: Array<[string, boolean]> = [["trend", aboveTrend]];
  if (aboveHolders != null) refs.push(["holder cost basis", aboveHolders]);
  if (aboveMiners != null) refs.push(["mining-cost estimate", aboveMiners]);
  const above = refs.filter(([, v]) => v).map(([n]) => n);
  const below = refs.filter(([, v]) => !v).map(([n]) => n);
  const list = (xs: string[]) =>
    xs.length === 1 ? xs[0] : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
  if (below.length === 0) return refs.length === 1 ? "Above trend" : `Above ${refs.length === 3 ? "all three references" : "both references"}`;
  if (above.length === 0) return refs.length === 1 ? "Below trend" : `Below ${refs.length === 3 ? "all three references" : "both references"}`;
  return `Above the ${list(above)}, below the ${list(below)}`;
}

// ── Historical statistics (per availability tier) ───────────────────────────

export interface TierStats {
  /** Which references this tier includes. */
  tier: "full" | "trend-miners" | "trend-only";
  windowFirst: string;
  windowLast: string;
  weeks: number;
  /** Share of weeks above every reference in the tier, 0..100. */
  aboveAllPct: number;
  /** Share of weeks below every reference in the tier, 0..100. */
  belowAllPct: number;
  /** Weeks matching TODAY's configuration (on this tier's references). */
  matchingTodayPct: number | null;
  /** Consecutive weeks (ending now) in today's configuration. */
  currentSpellWeeks: number | null;
}

function rowsForTier(tier: TierStats["tier"]): WeeklyRow[] {
  const t = weeklyConfigurationTable();
  if (tier === "full") return t.filter((r) => r.aboveHolders != null && r.aboveMiners != null);
  if (tier === "trend-miners") return t.filter((r) => r.aboveMiners != null);
  return t;
}

// A row's stable configuration id ON a tier — references outside the tier
// are masked so counting compares like with like.
function rowKey(r: WeeklyRow, tier: TierStats["tier"]): string {
  return configurationId(
    r.aboveTrend,
    tier === "full" ? r.aboveHolders : null,
    tier !== "trend-only" ? r.aboveMiners : null,
  );
}

export function tierStats(tier: TierStats["tier"]): TierStats | null {
  const rows = rowsForTier(tier);
  if (rows.length < 8) return null; // too few weeks for any honest statistic
  const last = rows[rows.length - 1];
  const todayKey = rowKey(last, tier);
  const aboveAll = rows.filter((r) => !rowKey(r, tier).includes("below-"));
  const belowAll = rows.filter((r) => !rowKey(r, tier).includes("above-"));
  const matching = rows.filter((r) => rowKey(r, tier) === todayKey);
  let spell = 0;
  for (let i = rows.length - 1; i >= 0 && rowKey(rows[i], tier) === todayKey; i--) spell++;
  const pct = (n: number) => Math.round((n / rows.length) * 1000) / 10;
  return {
    tier,
    windowFirst: rows[0].date,
    windowLast: last.date,
    weeks: rows.length,
    aboveAllPct: pct(aboveAll.length),
    belowAllPct: pct(belowAll.length),
    matchingTodayPct: pct(matching.length),
    currentSpellWeeks: spell,
  };
}

/** The most recent PRIOR week (outside the current unbroken spell) sharing
 *  today's configuration on the fullest available tier. */
export function lastSimilarWeek(): { date: string; name: string } | null {
  const tier: TierStats["tier"] = rowsForTier("full").length >= 8 ? "full" : rowsForTier("trend-miners").length >= 8 ? "trend-miners" : "trend-only";
  const rows = rowsForTier(tier);
  if (rows.length < 8) return null;
  const todayKey = rowKey(rows[rows.length - 1], tier);
  let i = rows.length - 1;
  while (i >= 0 && rowKey(rows[i], tier) === todayKey) i--; // skip the current spell
  for (; i >= 0; i--) {
    if (rowKey(rows[i], tier) === todayKey) {
      const r = rows[i];
      return { date: r.date, name: configurationName(r.aboveTrend, r.aboveHolders, r.aboveMiners) };
    }
  }
  return null;
}

// ── Today's read + deterministic interpretation ─────────────────────────────

export interface FrameworkToday {
  price: number | null;
  /** Stable machine id of today's configuration (see configurationId). */
  configurationId: string | null;
  configuration: string | null;
  /** The reference nearest to today's price, with its signed gap. */
  nearest: { label: string; gapPct: number } | null;
  paragraph: string | null;
}

const label = (k: "trend" | "holders" | "miners"): string =>
  k === "trend" ? "200-day moving average" : k === "holders" ? "Realised Price" : "Estimated Mining Cost";

export function frameworkToday(): FrameworkToday {
  const ctx = priceContext();
  const r = referencePrices({ ma200: ctx.ma200 });
  const price = r.marketPrice ?? SPOT?.price ?? null;
  if (price == null || ctx.vsMa200Pct == null) {
    return { price, configurationId: null, configuration: null, nearest: null, paragraph: null };
  }
  const gaps: Array<{ k: "trend" | "holders" | "miners"; pct: number }> = [{ k: "trend", pct: ctx.vsMa200Pct }];
  if (r.vsRealisedPct != null) gaps.push({ k: "holders", pct: r.vsRealisedPct });
  if (r.productionAvailable && r.vsProductionPct != null) gaps.push({ k: "miners", pct: r.vsProductionPct });

  const flags: [boolean, boolean | null, boolean | null] = [
    ctx.vsMa200Pct >= 0,
    r.vsRealisedPct != null ? r.vsRealisedPct >= 0 : null,
    r.productionAvailable && r.vsProductionPct != null ? r.vsProductionPct >= 0 : null,
  ];
  const configuration = configurationName(...flags);
  const nearestGap = [...gaps].sort((a, b) => Math.abs(a.pct) - Math.abs(b.pct))[0];
  const nearest = { label: label(nearestGap.k), gapPct: nearestGap.pct };

  // Clause 1 — the configuration, with values.
  const clauses = gaps.map(({ k, pct }) => {
    const near = Math.abs(pct) < NEAR_PCT;
    const rel = near ? "near" : pct >= 0 ? "above" : "below";
    return `${rel} its ${label(k)} (${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(0)}%)`;
  });
  const joined =
    clauses.length === 1 ? clauses[0] : clauses.length === 2 ? `${clauses[0]} and ${clauses[1]}` : `${clauses.slice(0, -1).join(", ")}, and ${clauses[clauses.length - 1]}`;

  // Clause 2 — the nearest reference.
  const nearSentence = `The nearest reference price is the ${nearest.label}, ${Math.abs(nearest.gapPct).toFixed(0)}% ${nearest.gapPct >= 0 ? "below" : "above"} the market.`;

  // Clause 3 — historical frequency on the fullest tier that supports it.
  const stats = tierStats("full") ?? tierStats("trend-miners") ?? tierStats("trend-only");
  const freqSentence = stats?.matchingTodayPct != null
    ? `Since ${stats.windowFirst.slice(0, 7)}, Bitcoin has spent ${stats.matchingTodayPct}% of weeks in this configuration${stats.currentSpellWeeks && stats.currentSpellWeeks > 1 ? `, including the last ${stats.currentSpellWeeks} weeks` : ""}.`
    : null;

  const paragraph = [
    `Bitcoin trades at ${fmtUsd(price, { compact: true })} — ${joined}.`,
    nearSentence,
    freqSentence,
    "Historical context, not a prediction.",
  ]
    .filter(Boolean)
    .join(" ");

  return { price, configurationId: configurationId(...flags), configuration, nearest, paragraph };
}

// Internal — exposed for the deterministic test-suite only.
export const _internals = { valueAt, rowKey, rowsForTier, NEAR_PCT, JOIN_MAX_DAYS, MS_WEEK };
