// This Week in Five — the twelve candidate rules (SoB 2.0, PR-SB3).
//
// Every rule is deterministic and assembles its strings from engine values.
// A rule returns null when it has nothing honest to say. No rule may make a
// forward-looking claim, assert causation, or use emphatic language: the
// most that is ever said is what happened and how it compares with the
// record. Deep links are chosen per rule so the rail guides readers around
// the platform rather than always landing in one place.

import { marketMovers, formatMovement, formatValue, periodAdjective, metricById, type Movement } from "../marketMovers";
import { MATERIAL_SIGNIFICANCE } from "../marketMovers/distribution";
import { lastWeekWatch } from "../weekComparison";
import { seasonalityData } from "../seasonality";
import { currentCyclePosition } from "../cycleSeasonality";
import { snapshotCyclePosition } from "../snapshot";
import { PRICE_ARCHIVE } from "../data/priceArchiveData";
import { CURRENT_CYCLE, DAYS_TO_NEXT_HALVING } from "../btcData";
import type { PointRule, PointState, PointTier, PointTopic, TalkingPoint } from "./types";

export interface Candidate extends Omit<TalkingPoint, "rank"> {}

const SNAPSHOT_ANCHOR = "#movers";

function mk(
  rule: PointRule,
  tier: PointTier,
  topic: PointTopic,
  score: number,
  headline: string,
  expanded: string,
  opts: { metricIds?: string[]; href?: string; anchor?: string; evidence?: Candidate["evidence"]; state?: PointState } = {},
): Candidate {
  return {
    id: `${rule}:${(opts.metricIds ?? []).join("+") || topic}`,
    rule,
    tier,
    topic,
    score: Math.max(0, Math.min(100, score)),
    headline,
    expanded,
    metricIds: opts.metricIds ?? [],
    href: opts.href ?? "/state-of-bitcoin",
    anchor: opts.anchor ?? SNAPSHOT_ANCHOR,
    evidence: opts.evidence ?? null,
    state: opts.state ?? "new",
  };
}

const evidenceOf = (m: Movement) =>
  m.rarityState === "available" ? { observations: m.observations, window: `since ${m.window.first}` } : null;

/** Rules 1–5 · Tier A — major market developments ─────────────────────── */

export function tierACandidates(period: 7 = 7): Candidate[] {
  const out: Candidate[] = [];
  const r = marketMovers(period);
  const material = r.movements.filter((m) => m.significance >= MATERIAL_SIGNIFICANCE);

  // R1 largest significant rise · R2 largest significant fall
  for (const [dir, rule, verb] of [
    ["up", "largest-rise", "rose"],
    ["down", "largest-fall", "fell"],
  ] as const) {
    const best = material.filter((m) => m.direction === dir)[0];
    if (!best) continue;
    const rarity =
      best.rarityState === "available"
        ? ` — larger than ${best.rarityPercentile}% of its ${periodAdjective(period)} moves`
        : "";
    out.push(
      mk(rule, "A", best.metricId === "etf_flows" ? "flows" : "movement", best.significance,
        `${best.label} ${verb} ${formatMovement(best).replace(/^[+−]/, "")}${rarity}.`,
        `${best.label} ${verb} ${formatMovement(best)} over the last ${period} days${
          best.previous != null ? `, from ${formatValue(best, best.previous)} to ${formatValue(best)}` : ""
        }.${best.rarityState === "available" ? ` That is larger than ${best.rarityPercentile}% of its ${periodAdjective(period)} moves across ${best.observations.toLocaleString("en-US")} observations.` : " Its historical comparison is still maturing."}${
          best.broaderContext ? ` ${best.broaderContext.text}` : ""
        }`,
        { metricIds: [best.metricId], href: best.href, evidence: evidenceOf(best) }),
    );
  }

  // R3 most unusual move — only where a rarity claim is permitted at all.
  const unusual = material.filter((m) => m.rarityState === "available").sort((a, b) => (b.rarityPercentile ?? 0) - (a.rarityPercentile ?? 0))[0];
  if (unusual && (unusual.rarityPercentile ?? 0) >= 90) {
    out.push(
      mk("most-unusual", "A", "movement", (unusual.rarityPercentile ?? 0) + 2,
        `${unusual.label} recorded one of its largest ${periodAdjective(period)} moves on record.`,
        `At ${formatMovement(unusual)}, ${unusual.label}'s move is larger than ${unusual.rarityPercentile}% of the ${unusual.observations.toLocaleString("en-US")} ${periodAdjective(period)} moves observed since ${unusual.window.first}.${unusual.broaderContext ? ` ${unusual.broaderContext.text}` : ""}`,
        { metricIds: [unusual.metricId], href: unusual.href, evidence: evidenceOf(unusual) }),
    );
  }

  // R4 band crossing · R5 reference-price crossover
  for (const m of [...r.movements, ...r.steady]) {
    if (!m.crossing) continue;
    const isRef = m.crossing.kind === "reference";
    out.push(
      mk(isRef ? "reference-crossover" : "band-crossing", "A", isRef ? "positioning" : m.metricId === "fear_greed" ? "sentiment" : "positioning",
        m.significance + (isRef ? 3 : 1),
        `${m.crossing.label}.`,
        `${m.crossing.label}, moving from ${m.crossing.from} to ${m.crossing.to}. ${
          isRef
            ? "A change in the relationship between the market price and one of its reference prices — either side can move, so this describes the relationship rather than attributing it."
            : `${m.label} now reads ${formatValue(m)}${m.state ? ` (${m.state})` : ""}.`
        }`,
        {
          metricIds: [m.metricId],
          href: isRef ? "/four-reference-prices" : m.href,
          evidence: evidenceOf(m),
        }),
    );
  }
  return out;
}

/** Rules 6–9 · Tier B — context that changes interpretation ───────────── */

/** Pairs worth reporting when they move apart. Stated as concurrence only —
 *  never "because", never an expectation that they should track. */
const DIVERGENCE_PAIRS: Array<[string, string]> = [
  ["price", "etf_flows"],
  ["price", "market_health"],
  ["price", "accumulation"],
  ["fear_greed", "market_health"],
  ["price", "realized_price"],
];

export function tierBCandidates(period: 7 = 7): Candidate[] {
  const out: Candidate[] = [];
  const r = marketMovers(period);
  const byId = new Map([...r.movements, ...r.steady].map((m) => [m.metricId, m]));

  // R6 divergence
  for (const [a, b] of DIVERGENCE_PAIRS) {
    const ma = byId.get(a);
    const mb = byId.get(b);
    if (!ma || !mb) continue;
    if (ma.direction === "flat" || mb.direction === "flat" || ma.direction === mb.direction) continue;
    const strength = Math.max(ma.significance, mb.significance);
    if (strength < MATERIAL_SIGNIFICANCE) continue;
    out.push(
      mk("divergence", "B", "positioning", strength,
        `${ma.label} and ${mb.label} moved in opposite directions this week.`,
        `${ma.label} ${ma.direction === "up" ? "rose" : "fell"} ${formatMovement(ma).replace(/^[+−]/, "")} while ${mb.label} ${mb.direction === "up" ? "rose" : "fell"} ${formatMovement(mb).replace(/^[+−]/, "")}. The two moved apart this week; this records what happened together, not one causing the other.`,
        { metricIds: [ma.metricId, mb.metricId], href: ma.href }),
    );
  }

  // R7 approaching an observed extreme — within 5% of a one-year extreme.
  // Only the SINGLE closest reading earns a place — six near-extreme cards
  // would be noise, and proximity is scored so a marginal 3% gap ranks below
  // a genuine cycle or seasonality insight.
  const extremes = [...r.movements, ...r.steady]
    .filter((m) => m.kind !== "flow" && m.rarityState === "available")
    .map((m) => ({ m, near: nearExtreme(m) }))
    .filter((x): x is { m: Movement; near: NonNullable<ReturnType<typeof nearExtreme>> } => x.near != null)
    .sort((a, b) => a.near.gapPct - b.near.gapPct);
  const closest = extremes[0];
  if (closest) {
    const { m, near } = closest;
    out.push(
      mk("approaching-extreme", "B", "positioning", 50 + (EXTREME_NEAR_PCT - near.gapPct) * 8,
        `${m.label} is ${near.gapPct === 0 ? "at" : `within ${near.gapPct}% of`} its ${near.side === "high" ? "highest" : "lowest"} reading of the last year.`,
        `${m.label} reads ${formatValue(m)}, ${near.gapPct === 0 ? "matching" : `within ${near.gapPct}% of`} its ${near.side === "high" ? "highest" : "lowest"} level over the last 365 days (${near.extremeLabel}, ${near.date}). A description of where the reading sits in its own recent range, not a signal.`,
        { metricIds: [m.metricId], href: m.href, evidence: evidenceOf(m) }),
    );
  }

  // R8 cycle milestone
  const cyc = cycleMilestone();
  if (cyc) out.push(cyc);

  // R9 seasonality context
  const sea = seasonalityContext();
  if (sea) out.push(sea);

  return out;
}

const EXTREME_WINDOW_DAYS = 365;
const EXTREME_NEAR_PCT = 3;

/** Proximity to a genuine 365-day extreme, read from the metric's OWN
 *  series — never from the short sparkline, which would make a "last year"
 *  claim from four weeks of data. Requires the window to be fully covered. */
function nearExtreme(m: Movement): { side: "high" | "low"; gapPct: number; date: string; extremeLabel: string } | null {
  const meta = metricById(m.metricId);
  if (!meta) return null;
  const series = meta.series();
  if (series.length < 30) return null;
  const cutoff = new Date(Date.parse(`${m.asOf}T00:00:00Z`) - EXTREME_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  if (series[0].date > cutoff) return null; // the record does not cover a year
  const win = series.filter((p) => p.date >= cutoff && p.date <= m.asOf && Number.isFinite(p.value));
  if (win.length < 30) return null;
  const hi = win.reduce((a, b) => (b.value > a.value ? b : a));
  const lo = win.reduce((a, b) => (b.value < a.value ? b : a));
  if (hi.value <= 0 || hi.value === lo.value) return null;
  const toHigh = Math.abs(m.current / hi.value - 1) * 100;
  const toLow = Math.abs(m.current / lo.value - 1) * 100;
  if (toHigh <= EXTREME_NEAR_PCT) return { side: "high", gapPct: Math.round(toHigh), date: hi.date, extremeLabel: formatValue(m, hi.value) };
  if (toLow <= EXTREME_NEAR_PCT) return { side: "low", gapPct: Math.round(toLow), date: lo.date, extremeLabel: formatValue(m, lo.value) };
  return null;
}

export function cycleMilestone(): Candidate | null {
  const pos = snapshotCyclePosition();
  const cyc = currentCyclePosition();
  if (!pos || !cyc) return null;
  const day = pos.cycleDay;
  const monthsIn = cyc.month;
  // A milestone is a round day count crossed this week, or the cycle month
  // having just advanced — otherwise the plain position still earns a place
  // as context, at a lower score.
  const crossedHundred = Math.floor(day / 100) > Math.floor((day - 7) / 100);
  const score = crossedHundred ? 78 : 55;
  const headline = crossedHundred
    ? `Bitcoin passed day ${Math.floor(day / 100) * 100} of cycle ${CURRENT_CYCLE.id} this week.`
    : `Bitcoin is ${monthsIn} months into cycle ${CURRENT_CYCLE.id}, ${pos.progressPct}% of the way to the next halving.`;
  return mk("cycle-milestone", "B", "cycle", score, headline,
    `Day ${day.toLocaleString("en-US")} since the ${CURRENT_CYCLE.halvingDate.slice(0, 4)} halving — ${monthsIn} anchored months in, ${pos.progressPct}% of the way to the next halving, which is projected for ${cyc.projectedNextHalving} (projected). The current phase reads ${pos.phaseLabel.toLowerCase()}, and price sits ${Math.abs(Math.round(pos.drawdownFromAth))}% below its running high. Where previous cycles went from a comparable point is on the cycle pages — historical context, not a projection.`,
    { href: "/cycles", anchor: "#matters", metricIds: [], state: "continuing" });
}

export function seasonalityContext(): Candidate | null {
  const today = PRICE_ARCHIVE.length ? PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1].date : null;
  if (!today) return null;
  const s = seasonalityData({ mode: "returns", series: "market", filter: "all" }, today);
  const cur = s.current;
  if (!cur?.stat || cur.mtdPct == null) return null;
  const n = cur.stat.n;
  if (n < 8) return null; // the platform's insight floor — no claim below it
  const avg = cur.stat.avg;
  return mk("seasonality", "B", "seasonality", 62,
    `${cur.label} has averaged ${avg > 0 ? "+" : ""}${avg}% across ${n} observed years; this one is running ${cur.mtdPct > 0 ? "+" : ""}${cur.mtdPct}% so far.`,
    `Across ${n} observed ${cur.label}s, the market's monthly change has averaged ${avg > 0 ? "+" : ""}${avg}% with ${cur.stat.positivePct}% of them positive. This ${cur.label} is running ${cur.mtdPct > 0 ? "+" : ""}${cur.mtdPct}% month to date${cur.rank ? `, ranking ${cur.rank.position} of ${cur.rank.of} so far` : ""}. A record of what has happened in this calendar month, never a prediction for the rest of it.`,
    { href: "/price/seasonality", anchor: "#matters", metricIds: [], evidence: { observations: n, window: `observed ${cur.label}s` } });
}

/** Rules 10–12 · Tier C — narrative continuity ────────────────────────── */

export function tierCCandidates(period: 7 = 7): Candidate[] {
  const out: Candidate[] = [];

  // R10 accountability — how last week's watch item resolved.
  const w = lastWeekWatch();
  if (w?.available && !w.firstEdition && w.signal) {
    const stateMap: Record<string, PointState> = { held: "stable", moved: "new", escalated: "escalated", eased: "eased", insufficient: "stable" };
    out.push(
      mk("accountability", "C", "continuity", 72,
        `Last week we were watching ${w.signal.charAt(0).toLowerCase()}${w.signal.slice(1)} — it ${w.outcome === "held" ? "held" : w.outcome === "eased" ? "eased" : w.outcome === "escalated" ? "became more notable" : "moved"}.`,
        `On ${w.dateLabel} the watch item was: ${w.signal}. ${w.why} Then: ${w.then}. Now: ${w.now}.`,
        { href: "/state-of-bitcoin", anchor: "#watching", state: stateMap[w.outcome] ?? "stable" }),
    );
  }

  // R11 directional streak — consecutive same-direction weeks on the
  // headline reading, where the record supports counting one.
  const r = marketMovers(period);
  const price = [...r.movements, ...r.steady].find((m) => m.metricId === "price");
  if (price) {
    const weeks = streakWeeks(price.spark, period);
    if (weeks >= 3) {
      out.push(
        mk("streak", "C", "movement", 50 + weeks * 3,
          `Market Price has moved in the same direction for ${weeks} consecutive weeks.`,
          `Market Price has ${price.direction === "up" ? "risen" : "fallen"} in each of the last ${weeks} weekly comparisons, currently reading ${formatValue(price)}. A run of consecutive weeks is a description of the record so far and carries no implication about the next one.`,
          { metricIds: ["price"], href: "/price" }),
      );
    }
  }

  // R12 stability — the quiet-week fallback. Always available, always last.
  const materialCount = r.movements.filter((m) => m.significance >= MATERIAL_SIGNIFICANCE).length;
  const total = r.movements.length + r.steady.length;
  out.push(
    mk("stability", "C", "continuity", materialCount === 0 ? 95 : 30,
      materialCount === 0
        ? `The notable feature this week was stability: no reading crossed a band or produced a historically unusual move.`
        : `${total - materialCount} of ${total} readings held within their ordinary range this week.`,
      materialCount === 0
        ? `All ${total} readings analysed moved within their own ordinary historical ranges, and none crossed a published band or reference price. An uneventful week is itself information: the broader picture is unchanged from last week.`
        : `Of the ${total} readings analysed, ${total - materialCount} moved within their own ordinary historical range. Stability across most of the market is part of the week's picture, not an absence of one.`,
      { anchor: "#matters", state: "stable" }),
  );

  return out;
}

/** Consecutive same-direction period-over-period steps at the end of a
 *  series. Conservative: needs enough points to count honestly. */
export function streakWeeks(spark: number[], period: number): number {
  if (!spark || spark.length < period * 3) return 0;
  const steps: number[] = [];
  for (let i = spark.length - 1; i - period >= 0; i -= period) steps.push(spark[i] - spark[i - period]);
  if (steps.length === 0 || steps[0] === 0) return 0;
  const sign = Math.sign(steps[0]);
  let n = 0;
  for (const s of steps) {
    if (Math.sign(s) !== sign || s === 0) break;
    n++;
  }
  return n;
}

export function allCandidates(): Candidate[] {
  return [...tierACandidates(), ...tierBCandidates(), ...tierCCandidates()];
}
