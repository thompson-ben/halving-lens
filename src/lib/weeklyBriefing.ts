// The Weekly Briefing model (SoB 2.0, PR-SB4).
//
// ONE deterministic model with named slots, replacing the five generators
// that previously summarised the same week independently and produced
// overlapping — sometimes competing — sentences. Every act of the State of
// Bitcoin page consumes its own named output from here, so a fact stated in
// the standfirst is the SAME object restated nowhere else.
//
// Deliberately presentation-free: no React, no markup, no page coupling.
// A future Broadcast Mode is another consumer of this model, not a rewrite
// of it.
//
// Historical context. Not forecasts.

import { marketMovers, formatMovement, formatValue, type Movement, type MoversResult } from "./marketMovers";
import { MATERIAL_SIGNIFICANCE } from "./marketMovers/distribution";
import { weekInFive, type WeekInFive } from "./talkingPoints";
import { weekStory } from "./weekStory";
import { rankedWatch } from "./stateOfBitcoin";
import { lastWeekWatch } from "./weekComparison";
import { snapshotCyclePosition } from "./snapshot";
import { PRICE_ARCHIVE } from "./data/priceArchiveData";

/** The five questions the page exists to answer, in order. Each maps to one
 *  act, and the front page answers all five before the reader scrolls. */
export type BriefingQuestion =
  | "what-changed"
  | "whats-behind-it"
  | "how-unusual"
  | "what-matters"
  | "what-next";

export interface GlanceRow {
  question: BriefingQuestion;
  /** The question as the reader sees it. */
  label: string;
  /** One line answering it — the executive summary of that act. */
  answer: string;
  /** The act that expands it. */
  anchor: string;
  /** Which act number, for the presenter's running order. */
  act: number;
}

export interface CycleRead {
  changed: boolean;
  headline: string;
  badge: string;
  detail: string;
}

export interface WatchItem {
  title: string;
  current: string;
  why: string;
  trigger: string;
  top: boolean;
}

export interface PreviousWatchOutcome {
  signal: string;
  outcome: string;
  then: string;
  now: string;
  dateLabel: string;
}

export interface WeeklyBriefing {
  asOf: string;
  /** THE canonical verdict — one sentence, used in the standfirst and
   *  restated verbatim at the close. There is never a second verdict. */
  verdict: string;
  /** The front page: five questions, five one-line answers. */
  glance: GlanceRow[];
  /** Connective lines carrying the reader from one act into the next —
   *  what makes the page read as one briefing rather than six dashboards. */
  bridges: Record<number, string>;
  movers: MoversResult;
  points: WeekInFive;
  cycleRead: CycleRead;
  watchItems: WatchItem[];
  previousWatch: PreviousWatchOutcome | null;
  quietWeek: boolean;
}

const lead = (r: MoversResult): Movement | null => r.movements[0] ?? r.steady[0] ?? null;

/** One sentence covering the week: its leading development and whether the
 *  cycle interpretation moved. Assembled from engine values only. */
export function canonicalVerdict(r: MoversResult, cycle: CycleRead, quiet: boolean): string {
  const m = lead(r);
  const cycleClause = cycle.changed
    ? "and the cycle read shifted with it"
    : "while the broader cycle read is unchanged";
  if (quiet || !m) {
    return `A quiet week across the readings — nothing moved materially, ${cycleClause}.`;
  }
  const rarity =
    m.rarityState === "available" && m.rarityPercentile != null
      ? `, larger than ${m.rarityPercentile}% of its own ${m.period}-day moves`
      : "";
  const move = m.kind === "flow" ? `a net ${formatMovement(m)}` : `${formatMovement(m)}`;
  return `${m.label} led the week at ${move}${rarity}, ${cycleClause}.`;
}

function glanceRows(r: MoversResult, points: WeekInFive, cycle: CycleRead, watch: WatchItem[]): GlanceRow[] {
  const m = lead(r);
  const material = r.movements.filter((x) => x.significance >= MATERIAL_SIGNIFICANCE).length;
  const total = r.movements.length + r.steady.length;
  const behind = r.movements.find((x) => x.crossing) ?? r.movements[1] ?? m;
  const unusual = [...r.movements, ...r.steady].filter((x) => x.band === "exceptional" || x.band === "unusual").length;
  const top = watch.find((w) => w.top) ?? watch[0];

  return [
    {
      question: "what-changed",
      label: "What changed?",
      act: 1,
      anchor: "#movers",
      answer: m
        ? `${m.label} ${m.direction === "up" ? "rose" : m.direction === "down" ? "fell" : "held"} ${formatMovement(m).replace(/^[+−]/, "")} — the leading move of ${total} readings analysed.`
        : `No reading moved materially across ${total} analysed.`,
    },
    {
      question: "whats-behind-it",
      label: "What's behind it?",
      act: 2,
      anchor: "#behind",
      answer: behind?.crossing
        ? behind.crossing.label + "."
        : behind
          ? `${behind.label} moved alongside it at ${formatMovement(behind)}; the reference prices show where the market sits.`
          : "The reference prices show where the market sits.",
    },
    {
      question: "how-unusual",
      label: "How unusual is it?",
      act: 3,
      anchor: "#unusual",
      answer:
        unusual > 0
          ? `${unusual} of ${total} readings moved unusually for their own record; ${material} moved materially.`
          : `${material} of ${total} readings moved materially — none unusually by its own record.`,
    },
    {
      question: "what-matters",
      label: "What matters most?",
      act: 4,
      anchor: "#matters",
      answer: points.points.length
        ? `${points.points.length} points to remember, led by: ${points.points[0].headline}`
        : "The week produced no points above the evidence floor.",
    },
    {
      question: "what-next",
      label: "What are we watching next?",
      act: 5,
      anchor: "#watching",
      answer: top ? `${top.title} — ${top.current}.` : "The objective thresholds are set out below.",
    },
  ];
}

/** Connective lines between acts — the documentary seam. Each states what
 *  the reader has just learned and what the next act adds; none introduces
 *  a new fact of its own. */
function bridgeLines(r: MoversResult, cycle: CycleRead, quiet: boolean): Record<number, string> {
  const m = lead(r);
  const name = m?.label ?? "the week's readings";
  return {
    1: quiet
      ? "Nothing moved materially — so the question becomes what sits underneath a quiet week."
      : `That is what moved. Next: what sits underneath ${name}'s move, and where the market stands against its reference prices.`,
    2: `That is the composition. The next question is whether any of it is unusual — measured against each reading's own record, not against a headline.`,
    3: cycle.changed
      ? "The cycle read moved this week. With that established, here are the five things worth remembering."
      : "The cycle read is unchanged. With that established, here are the five things worth remembering.",
    4: "Those are the five. Finally, the objective thresholds we return to next week.",
  };
}

let cache: WeeklyBriefing | null = null;

export function weeklyBriefing(): WeeklyBriefing {
  if (cache) return cache;
  const movers = marketMovers(7);
  const points = weekInFive();
  const story = weekStory();
  const cycleRead: CycleRead = {
    changed: story.cycleStatus.changed,
    headline: story.cycleStatus.headline,
    badge: story.cycleStatus.badge,
    detail: story.cycleStatus.detail,
  };
  const watchItems: WatchItem[] = rankedWatch().map((w) => ({
    title: w.title,
    current: w.current,
    why: w.why,
    trigger: w.trigger,
    top: !!w.top,
  }));
  // Last week's watch item is told ONCE. When the agenda already carries the
  // accountability point, Act 5 does not repeat it — the model decides which
  // act owns the fact, so the page can never state it twice.
  const prior = lastWeekWatch();
  const toldInAgenda = points.points.some((p) => p.rule === "accountability");
  const previousWatch: PreviousWatchOutcome | null =
    !toldInAgenda && prior?.available && !prior.firstEdition && prior.signal
      ? { signal: prior.signal, outcome: prior.outcome, then: prior.then ?? "", now: prior.now ?? "", dateLabel: prior.dateLabel ?? "" }
      : null;
  const quietWeek = movers.movements.filter((m) => m.significance >= MATERIAL_SIGNIFICANCE).length === 0;

  cache = {
    asOf: PRICE_ARCHIVE.length ? PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1].date : movers.asOf,
    verdict: canonicalVerdict(movers, cycleRead, quietWeek),
    glance: glanceRows(movers, points, cycleRead, watchItems),
    bridges: bridgeLines(movers, cycleRead, quietWeek),
    movers,
    points,
    cycleRead,
    watchItems,
    previousWatch,
    quietWeek,
  };
  return cache;
}

/** Cycle position, re-exported so the page reads one model. */
export function briefingCyclePosition() {
  return snapshotCyclePosition();
}

export { formatValue };
