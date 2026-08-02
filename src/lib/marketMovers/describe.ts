// Market Movers — shared presentation strings (SoB 2.0).
//
// Pure formatters over the Movement contract, kept in the engine layer so
// every consumer (the State of Bitcoin section today; the Daily Brief,
// weekly email, presenter HUD and content packs later) renders the same
// numbers the same way. No React, no markup — strings only.
//
// The rarity line is the honesty-critical one: it never states a rarity
// claim unless the metric's state permits it, and it always carries the
// observation count and the window the claim is drawn from.

import type { Movement } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthYear = (iso: string): string => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

const compactUsd = (n: number): string => {
  const a = Math.abs(n);
  const s = n < 0 ? "−" : "";
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(1)}K`;
  return `${s}$${a.toFixed(0)}`;
};

const withCommas = (n: number, decimals: number): string =>
  n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** A level, in the metric's own units. Flows have no level — the period's
 *  net IS the figure, so callers show `formatMovement` instead. */
export function formatValue(m: Movement, value: number | null = m.current): string {
  if (value == null) return "—";
  if (m.unit === "usd") return compactUsd(value);
  if (m.unit === "pct") return m.metricId === "price" || m.metricId === "ma200" || m.metricId === "realized_price" || m.metricId === "mining_cost"
    ? `$${withCommas(value, 0)}`
    : withCommas(value, m.decimals);
  return withCommas(value, m.decimals);
}

/** The signed movement, always with an explicit sign and unit. */
export function formatMovement(m: Movement): string {
  const sign = m.movement > 0 ? "+" : m.movement < 0 ? "−" : "";
  const a = Math.abs(m.movement);
  if (m.unit === "usd") return `${sign}${compactUsd(a).replace("−", "")}`;
  if (m.unit === "pct") return `${sign}${a.toFixed(a >= 10 ? 1 : 2)}%`;
  const d = a >= 100 ? 0 : m.decimals;
  return `${sign}${a.toFixed(d)} ${a.toFixed(d) === "1" ? "point" : "points"}`;
}

export function periodLabel(period: number): string {
  return period === 1 ? "24 hours" : `${period} days`;
}

/** Adjectival form — "7-day moves", never "7 days moves". */
export function periodAdjective(period: number): string {
  return period === 1 ? "24-hour" : `${period}-day`;
}

/** Evidence line — a rarity claim ONLY where the state permits one, always
 *  with its observation count and window. */
export function rarityLine(m: Movement): string {
  const since = `since ${monthYear(m.window.first)}`;
  const n = m.observations.toLocaleString("en-US");
  if (m.rarityState === "available" && m.rarityPercentile != null) {
    return `Larger than ${m.rarityPercentile}% of ${periodAdjective(m.period)} moves · ${n} observations ${since}`;
  }
  if (m.rarityState === "maturing") {
    return `Historical comparison still maturing · ${n} equivalent observations ${since}`;
  }
  return "No historical comparison available yet";
}

/** One deterministic sentence on what the movement amounts to. A categorical
 *  crossing speaks for itself and takes precedence over any size wording. */
export function meaningLine(m: Movement): string {
  if (m.crossing) return `${m.crossing.label}.`;
  if (m.rarityState !== "available") return "Movement recorded; its historical comparison is still maturing.";
  switch (m.band) {
    case "exceptional":
      return `One of the largest ${periodAdjective(m.period)} moves in its observed record.`;
    case "unusual":
      return `A larger ${periodAdjective(m.period)} move than most in its own record.`;
    case "notable":
      return `A moderate move by this reading's own record.`;
    default:
      return `An ordinary move within this reading's own record.`;
  }
}

/** "was 638.18 → now 986.75" for levels; the prior period's net for flows. */
export function thenNowLine(m: Movement): string | null {
  if (m.kind === "flow") {
    return m.previousPeriodFlow != null
      ? `Previous ${periodLabel(m.period)}: ${formatValue(m, m.previousPeriodFlow)}`
      : null;
  }
  if (m.previous == null) return null;
  return `${formatValue(m, m.previous)} → ${formatValue(m, m.current)}`;
}

/** The stability summary for readings that did not move materially. */
export function steadySummary(steady: Movement[]): string | null {
  if (steady.length === 0) return null;
  const names = steady.map((s) => s.label);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const verb = steady.length === 1 ? "reading held" : "readings held";
  return `${steady.length} ${verb} steady — ${list} all moved within their own ordinary range.`;
}
