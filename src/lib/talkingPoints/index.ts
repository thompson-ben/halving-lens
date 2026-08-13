// This Week in Five — selection (SoB 2.0, PR-SB3).
//
// The engine picks the five most important things to UNDERSTAND this week,
// not the five largest metric movements. Two constraints do that work:
//
//   TIER PRIORITY   A (major developments) leads, then B (context that
//                   changes interpretation), then C (narrative continuity).
//
//   DIVERSITY       No two points may answer the same underlying question
//                   (`topic`) or concern the same metric (`subject`) unless
//                   there is genuinely no stronger alternative left. A
//                   reserved slot each for context and continuity stops
//                   five metric movements crowding out a cycle milestone or
//                   a seasonality insight.
//
// The result reads like an agenda for the week's episode. In a quiet week
// it says so plainly rather than manufacturing five dramatic headlines.
//
// Historical context. Not forecasts.

import { marketMovers } from "../marketMovers";
import { isQuietWeek, MATERIAL_SIGNIFICANCE } from "../marketMovers/distribution";
import { PRICE_ARCHIVE } from "../data/priceArchiveData";
import { allCandidates, type Candidate } from "./rules";
import type { TalkingPoint, WeekInFive } from "./types";

export * from "./types";
export { allCandidates, streakWeeks, cycleMilestone, seasonalityContext } from "./rules";

export const POINT_COUNT = 5;
/** At most this many of the five may come from the same topic family while
 *  any unused family remains — the anti-monoculture rule. */
export const MAX_PER_TOPIC = 2;
/** Tier A may claim at most this many of the five, so context and
 *  continuity always have room on the agenda. */
export const MAX_TIER_A = 3;

const TIER_ORDER = { A: 0, B: 1, C: 2 } as const;

/** Editorial reading order for the finished five: developments first,
 *  then interpretation, then continuity — the order an episode follows. */
function editorialOrder(a: Candidate, b: Candidate): number {
  return TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || b.score - a.score;
}

export function selectPoints(candidates: Candidate[], want = POINT_COUNT): Candidate[] {
  const pool = [...candidates].sort(editorialOrder);
  const chosen: Candidate[] = [];
  const topics = new Map<string, number>();
  const subjects = new Set<string>();

  const conflicts = (c: Candidate): boolean =>
    (topics.get(c.topic) ?? 0) >= MAX_PER_TOPIC || c.metricIds.some((id) => subjects.has(id));

  const take = (c: Candidate) => {
    chosen.push(c);
    topics.set(c.topic, (topics.get(c.topic) ?? 0) + 1);
    for (const id of c.metricIds) subjects.add(id);
  };

  // Phase 1 — the week's major developments, capped so that Tier A can
  // never fill every slot. This cap is what stops five metric movements
  // displacing a cycle milestone or a seasonality insight.
  for (const c of pool) {
    if (chosen.filter((x) => x.tier === "A").length >= MAX_TIER_A) break;
    if (chosen.length >= want) break;
    if (c.tier !== "A" || conflicts(c)) continue;
    take(c);
  }

  // Phases 2 and 3 — one reserved slot each for context and continuity,
  // preferring a question nobody has answered yet. Evaluated AFTER phase 1
  // so "unused" means unused by what is actually on the agenda.
  for (const tier of ["B", "C"] as const) {
    if (chosen.length >= want) break;
    const eligible = pool.filter((c) => c.tier === tier && !chosen.includes(c) && !conflicts(c));
    const pick = eligible.find((c) => !topics.has(c.topic)) ?? eligible[0];
    if (pick) take(pick);
  }

  // Phase 4 — fill any remaining slots by tier priority, still diverse.
  for (const c of pool) {
    if (chosen.length >= want) break;
    if (chosen.includes(c) || conflicts(c)) continue;
    take(c);
  }

  // Phase 5 — only if still short, relax the topic cap (the "genuinely no
  // stronger alternative" escape hatch). Subject identity is never relaxed:
  // two points may not be about the same metric.
  for (const c of pool) {
    if (chosen.length >= want) break;
    if (chosen.includes(c)) continue;
    if (c.metricIds.some((id) => subjects.has(id))) continue;
    take(c);
  }

  return chosen.sort(editorialOrder);
}

let cache: WeekInFive | null = null;

export function weekInFive(): WeekInFive {
  if (cache) return cache;
  const r = marketMovers(7);
  const candidates = allCandidates();
  const selected = selectPoints(candidates);
  cache = {
    asOf: PRICE_ARCHIVE.length ? PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1].date : r.asOf,
    points: selected.map((c, i): TalkingPoint => ({ ...c, rank: i + 1 })),
    // The shared canonical predicate (V2.1 Phase 1) over this surface's own
    // population — every registered reading, composite included, exactly as
    // before. Same rule, same population, bit-identical output.
    quietWeek: isQuietWeek([...r.movements, ...r.steady].map((m) => m.significance)),
    candidatesConsidered: candidates.length,
  };
  return cache;
}
