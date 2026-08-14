// DBV2-A — the Daily Brief's canonical payload (the MW2-A pattern for email).
//
// NON-NEGOTIABLE (founder commission, 14 Aug 2026): the Daily Brief and the
// Cycle Dashboard must never disagree. This module therefore QUOTES the
// canonical V2.1 authorities — the movers engine + describe layer, the What
// Changed summary, the Metric Watch, the Watch state registry, the ETF
// intelligence card and the Cycle Lens observation — and computes NO
// movement, significance, ranking, threshold or conclusion of its own.
// The email-side private stack it replaces (dailyChange significance model,
// Confidence vote, Context Score, private Market Health vocabulary) appears
// nowhere here and must never return.
//
// THE STORY SELF-SELECTS. 15 readings monitored → the canonical activity
// classification → one thing earns attention → WHAT happened → WHY it is
// noteworthy relative to that metric's own record. Selection is ordering
// over engine facts, never scoring:
//   · active / mostly quiet → the Watch's mostInteresting development when
//     one exists (state changes and record moves outrank everything — the
//     Watch's own hierarchy), else the top Market Board row (the engine's
//     own ranking; the classifier guarantees a material row exists).
//   · quiet → THE QUIET FINDING, chosen among candidates each qualified by
//     an EXISTING gate: state duration (the Watch run computer's sinceDate,
//     never claimed on series-start runs), ETF composition (the card's own
//     concentration/context gates), a Cycle Lens observation (the Lens's
//     own thresholds; surfaced only while its lifecycle is not "standing" —
//     the publication policy the Lens engine explicitly delegates to
//     surfaces), and the Watch's canonical quiet line, always qualified:
//     some days should simply say nothing needs attention. dateSeed rotates
//     among QUALIFIED candidates only (editorialVariety's discipline:
//     rotation can never turn an unqualified fact into a story).
//
// Honest by construction: every load-bearing sentence is engine output or a
// frame around one; rarity claims only where the engine permits them; ETF
// language is trading-day language verbatim; per-metric as-of dates ride
// along. Historical context. Not forecasts.

import {
  metricById,
  formatValue,
  formatMovement,
  meaningLine,
  rarityLine,
  type Movement,
} from "./marketMovers";
import {
  cycleDashboardIntel,
  isUnusualRow,
  marketBoard,
  type ChangeSummary,
  type DashboardStripState,
} from "./cycleDashboardIntel";
import { stateWordFor } from "./metricCards";
import { lensObservation, type LensObservation } from "./cycleLens";
import { cycleDayAt } from "./cycleDay";
import { todaysConfigurationPack } from "./fourReferencePrices";
import { pickFreshest, recentSubjects, seedFromString, SEED_OFFSET } from "./editorialVariety";

export const BRIEF_INTEL_VERSION = "brief-intel-v1";

/** The permanent whole-picture destination — every edition, every verdict. */
export const DASHBOARD_CTA = {
  label: "See the whole picture",
  sub: "Open the Cycle Dashboard",
  href: "/cycle-dashboard",
} as const;

// ── Payload shapes ──────────────────────────────────────────────────────────

export interface BriefVerdict {
  activity: ChangeSummary["activity"];
  activityLabel: string;
  countsLine: string;
  analysed: number;
  material: number;
  asOf: string;
  href: "/cycle-dashboard";
}

/** The one thing that earned attention — a discriminated union so the
 *  renderer (DBV2-B) can shape each edition class without re-deciding. */
export type BriefStory =
  | {
      kind: "mover";
      metricId: string;
      label: string;
      href: string;
      /** The canonical 7-day movement — the hero fact. */
      movement: string;
      periodLabel: "in 7 days";
      /** Band word only at Unusual/Exceptional (the founder's render rule);
       *  null on merely-material movers — no manufactured drama. */
      bandWord: string | null;
      meaning: string;
      /** Engine rarity evidence; null when the engine withholds the claim. */
      evidence: string | null;
      valueLabel: string;
      stateWord: string | null;
      /** The movers' own 30-day movement — answers "is this new?". */
      thirtyDay: string | null;
      asOf: string;
    }
  | {
      kind: "state_change";
      /** The Watch's own headline, verbatim. */
      headline: string;
      metricId: string;
      label: string;
      href: string;
      currentLabel: string;
      asOf: string;
    }
  | {
      kind: "etf";
      /** All lines quoted verbatim from the ETF intelligence card. */
      nowLine: string;
      changeLine: string | null;
      concentrationLine: string | null;
      contextLine: string | null;
      href: "/etf";
      asOf: string | null;
    }
  | {
      kind: "quiet_duration";
      /** e.g. "Sentiment has read Fear since 15 July — 25 consecutive days." */
      line: string;
      label: string;
      stateLabel: string;
      sinceDate: string;
      days: number;
      /** A second qualifying state, folded into the same finding. */
      alsoLine: string | null;
      href: string;
      asOf: string;
    }
  | {
      kind: "quiet_lens";
      /** The Lens observation sentence, verbatim. */
      sentence: string;
      lifecycle: LensObservation["lifecycle"];
      stateAgeDays: number;
      day: number;
      href: "/cycle-dashboard";
      asOf: string;
    }
  | {
      kind: "quiet_floor";
      /** The Watch's canonical quiet sentence, verbatim. */
      line: string;
      href: "/cycle-dashboard";
      asOf: string;
    };

export interface BriefAlsoItem {
  text: string;
  href: string;
  /** Which existing gate admitted it — for review and tests, not rendering. */
  source: "second_unusual" | "one_to_watch" | "etf_swing";
}

export interface BriefStateRow {
  id: DashboardStripState["id"];
  label: string;
  available: boolean;
  stateLabel: string | null;
  detail: string | null;
  sinceDate: string | null;
  sinceIsSeriesStart: boolean;
  asOf: string | null;
  href: string;
}

/** Selection diagnostics — every candidate considered, with the gate result.
 *  Powers the founder review pack and the agreement tests; never rendered. */
export interface BriefSelection {
  storyReason: string;
  considered: Array<{ candidate: string; qualified: boolean; outcome: string }>;
}

export interface BriefIntel {
  version: string;
  asOf: string;
  verdict: BriefVerdict;
  story: BriefStory;
  /** Max 2; empty on most days — absence is the signal. */
  alsoToday: BriefAlsoItem[];
  states: BriefStateRow[];
  /** Four Reference Prices — CONDITIONAL (founder §8): included only when
   *  the configuration's current spell began this week (spellWeeks === 1,
   *  the framework engine's own fact — no new threshold). */
  frp: { include: boolean; configuration: string | null; paragraph: string | null };
  cta: typeof DASHBOARD_CTA;
  /** Truthful, data-gated candidates (the house subject discipline) and the
   *  freshest pick versus recent editions. */
  subjectCandidates: string[];
  subject: string;
  selection: BriefSelection;
}

// ── Helpers (presentation only — no data derivation) ────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
/** Whole calendar days between two ISO dates (UTC) — arithmetic on two
 *  canonical dates, not a new observation. */
const daysBetween = (fromIso: string, toIso: string): number =>
  Math.max(0, Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000));

// ── The composition ─────────────────────────────────────────────────────────

const cache = new Map<string, BriefIntel>();

export function briefIntel(anchor?: string): BriefIntel {
  const intel = cycleDashboardIntel(anchor);
  const live = anchor == null;
  const key = `${intel.asOf}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { summary, watch, strip, etf, board } = intel;
  // As-of discipline for the latest-only reads: the ETF flows read is not
  // anchor-parameterised (a V2.1 decision), so at a review anchor its card
  // can post-date the day being rendered. An ETF sentence is only offered
  // when the card's own asOf does not post-date the payload's asOf.
  const etfUsable = etf.available && etf.netLabel != null && etf.asOf != null && etf.asOf <= intel.asOf;
  // The Watch's quiet sentence is null while either headline slot is filled;
  // the counts line is the honest same-authority fallback for those shapes.
  const quietLine = watch.quietLine ?? summary.countsLine;
  const considered: BriefSelection["considered"] = [];

  const verdict: BriefVerdict = {
    activity: summary.activity,
    activityLabel: summary.activityLabel,
    countsLine: summary.countsLine,
    analysed: summary.analysed,
    material: summary.material,
    asOf: intel.asOf,
    href: "/cycle-dashboard",
  };

  // ── Story selection ───────────────────────────────────────────────────────
  let story: BriefStory;
  let storyReason: string;

  const topRow: Movement | undefined = board.rows[0];
  const moverStory = (m: Movement): BriefStory => {
    const meta = metricById(m.metricId);
    const unusual = isUnusualRow(m);
    return {
      kind: "mover",
      metricId: m.metricId,
      label: meta?.label ?? m.metricId,
      href: meta?.href ?? "/cycle-dashboard",
      movement: formatMovement(m),
      periodLabel: "in 7 days",
      bandWord: unusual ? m.band.charAt(0).toUpperCase() + m.band.slice(1) : null,
      meaning: meaningLine(m),
      evidence: m.rarityState === "available" ? rarityLine(m) : null,
      valueLabel: formatValue(m),
      stateWord: stateWordFor(m, board.asOf),
      thirtyDay: null, // filled below from the movers' own 30D board
      asOf: m.asOf,
    };
  };

  if (summary.activity !== "quiet") {
    if (watch.mostInteresting) {
      // The Watch's own hierarchy outranks the board: a fresh state change
      // or record move is the day's development, in the Watch's own words.
      const mi = watch.mostInteresting;
      story = {
        kind: "state_change",
        headline: mi.headline,
        metricId: mi.metricId,
        label: mi.label,
        href: mi.href,
        currentLabel: mi.currentLabel,
        asOf: watch.asOf,
      };
      storyReason = "Watch mostInteresting present — the Watch's own hierarchy selects it.";
      considered.push({ candidate: "watch.mostInteresting", qualified: true, outcome: "selected as story" });
    } else if (topRow && topRow.metricId === "etf_flows" && etfUsable) {
      // The engine ranked demand itself as the day's top row — tell it in
      // the ETF card's own NOW → CHANGE → CONCENTRATION → CONTEXT grammar.
      story = {
        kind: "etf",
        nowLine: `${etf.netLabel} over the past ${etf.windowDays} trading days`,
        changeLine: etf.prevNetLabel ? `previous ${etf.windowDays} trading days: ${etf.prevNetLabel}` : null,
        concentrationLine: etf.concentrationLine,
        contextLine: etf.contextLine,
        href: "/etf",
        asOf: etf.asOf,
      };
      storyReason = "Top Market Board row is ETF Net Flows — told in the ETF card's own grammar.";
      considered.push({ candidate: "board top row (etf_flows)", qualified: true, outcome: "selected as story (etf shape)" });
    } else if (topRow) {
      story = moverStory(topRow);
      storyReason = `Top Market Board row (engine ranking): ${topRow.metricId}, significance ${Math.round(topRow.significance)}.`;
      considered.push({ candidate: `board top row (${topRow.metricId})`, qualified: true, outcome: "selected as story" });
    } else {
      // Defensive only — a non-quiet classification implies a material row.
      story = { kind: "quiet_floor", line: quietLine, href: "/cycle-dashboard", asOf: intel.asOf };
      storyReason = "No board rows despite non-quiet classification (defensive floor).";
    }
  } else {
    // ── THE QUIET FINDING — candidates, each behind an existing gate ────────
    type QuietCandidate = { name: string; story: BriefStory };
    const quiet: QuietCandidate[] = [];

    // A · State duration — the Watch run computer's own since-dates. Never
    //     claimed on a series-start run (the engine's honesty flag).
    const durable = strip
      .filter((s): s is DashboardStripState & { sinceDate: string; stateLabel: string; asOf: string } =>
        s.available && s.sinceDate != null && !s.sinceIsSeriesStart && s.stateLabel != null && s.asOf != null)
      .map((s) => ({ s, days: daysBetween(s.sinceDate, s.asOf) }))
      .sort((a, b) => b.days - a.days);
    if (durable.length) {
      const lead = durable[0];
      const other = durable[1] ?? null;
      quiet.push({
        name: "state duration",
        story: {
          kind: "quiet_duration",
          line: `${lead.s.label} has read ${lead.s.stateLabel} since ${prettyDate(lead.s.sinceDate)} — ${lead.days} consecutive days.`,
          label: lead.s.label,
          stateLabel: lead.s.stateLabel,
          sinceDate: lead.s.sinceDate,
          days: lead.days,
          alsoLine: other
            ? `${other.s.label} has held ${other.s.stateLabel} since ${prettyDate(other.s.sinceDate)}.`
            : null,
          href: lead.s.href,
          asOf: lead.s.asOf,
        },
      });
      considered.push({ candidate: "state duration", qualified: true, outcome: "in quiet rotation" });
    } else {
      considered.push({ candidate: "state duration", qualified: false, outcome: "omitted — no non-series-start run available" });
    }

    // B · ETF composition beneath a quiet headline — the card's own gates.
    if (etfUsable && (etf.concentrationLine || etf.contextLine)) {
      quiet.push({
        name: "etf composition",
        story: {
          kind: "etf",
          nowLine: `${etf.netLabel} over the past ${etf.windowDays} trading days`,
          changeLine: etf.prevNetLabel ? `previous ${etf.windowDays} trading days: ${etf.prevNetLabel}` : null,
          concentrationLine: etf.concentrationLine,
          contextLine: etf.contextLine,
          href: "/etf",
          asOf: etf.asOf,
        },
      });
      considered.push({ candidate: "etf composition", qualified: true, outcome: "in quiet rotation" });
    } else {
      considered.push({ candidate: "etf composition", qualified: false, outcome: etfUsable ? "omitted — concentration/context gates closed" : "omitted — flows read post-dates this anchor (as-of discipline)" });
    }

    // C · Cycle Lens — the Lens's own thresholds; surfaced only while the
    //     observation is not "standing" (publication policy the Lens engine
    //     delegates to surfaces — a 577-day-old claim is dashboard context,
    //     not a daily finding).
    const obs = lensObservation(cycleDayAt(intel.asOf));
    if (obs && obs.lifecycle !== "standing") {
      quiet.push({
        name: "cycle lens",
        story: {
          kind: "quiet_lens",
          sentence: obs.sentence,
          lifecycle: obs.lifecycle,
          stateAgeDays: obs.stateAgeDays,
          day: obs.day,
          href: "/cycle-dashboard",
          asOf: obs.asOfDate,
        },
      });
      considered.push({ candidate: "cycle lens", qualified: true, outcome: `in quiet rotation (${obs.lifecycle})` });
    } else {
      considered.push({
        candidate: "cycle lens",
        qualified: false,
        outcome: obs ? "omitted — observation is standing context, not a fresh finding" : "omitted — no qualifying observation",
      });
    }

    // D · The Watch's quiet line — always qualified. Some days should simply
    //     say that nothing needs attention.
    quiet.push({ name: "watch quiet line", story: { kind: "quiet_floor", line: quietLine, href: "/cycle-dashboard", asOf: intel.asOf } });
    considered.push({ candidate: "watch quiet line", qualified: true, outcome: "in quiet rotation (always qualified)" });

    // Deterministic rotation among QUALIFIED candidates only, seeded from
    // the payload's own asOf (clock-free and anchor-aware — the live
    // dateSeed would freeze every review anchor on one index), so
    // consecutive quiet days vary without any candidate being invented.
    const idx = ((seedFromString(intel.asOf) + SEED_OFFSET.take) % quiet.length + quiet.length) % quiet.length;
    story = quiet[idx].story;
    storyReason = `Quiet day — rotation over ${quiet.length} qualified quiet findings picked "${quiet[idx].name}".`;
  }

  // The movers' own 30-day movement for the mover story ("is this new?") —
  // the same fact the metric card's otherPeriods row quotes, from the 30-day
  // board. Null when the 30-day comparison is not honestly available.
  if (story.kind === "mover") {
    const row30 = marketBoard(30, intel.asOf).rows.find((m) => m.metricId === story.metricId);
    story.thirtyDay = row30 && row30.movement != null ? `${formatMovement(row30)} over 30 days` : null;
  }

  // ── Also today — conditional, max 2, existing gates only ─────────────────
  const alsoToday: BriefAlsoItem[] = [];
  const storyMetricId = story.kind === "mover" || story.kind === "state_change" ? story.metricId : null;
  const secondUnusual = summary.activity === "quiet"
    ? undefined
    : board.rows.find((m) => m.metricId !== storyMetricId && isUnusualRow(m) && m.metricId !== (story.kind === "etf" ? "etf_flows" : ""));
  if (secondUnusual) {
    const meta = metricById(secondUnusual.metricId);
    const evidence = secondUnusual.rarityState === "available" ? ` — ${rarityLine(secondUnusual)}` : "";
    alsoToday.push({
      text: `${meta?.label ?? secondUnusual.metricId} also moved: ${formatMovement(secondUnusual)} in 7 days${evidence}`,
      href: meta?.href ?? "/cycle-dashboard",
      source: "second_unusual",
    });
    considered.push({ candidate: `also: ${secondUnusual.metricId}`, qualified: true, outcome: "alsoToday (second unusual row)" });
  }
  if (alsoToday.length < 2 && watch.oneToWatch && watch.oneToWatch.metricId !== storyMetricId) {
    alsoToday.push({ text: watch.oneToWatch.headline, href: watch.oneToWatch.href, source: "one_to_watch" });
    considered.push({ candidate: "watch.oneToWatch", qualified: true, outcome: "alsoToday" });
  }
  if (alsoToday.length < 2 && summary.activity !== "quiet" && story.kind !== "etf" && etfUsable && etf.contextLine) {
    // The card's own swing/streak gate admitted a demand development.
    alsoToday.push({
      text: `ETF demand: ${etf.contextLine} Net ${etf.netLabel} over the past ${etf.windowDays} trading days.`,
      href: "/etf",
      source: "etf_swing",
    });
    considered.push({ candidate: "etf swing", qualified: true, outcome: "alsoToday (context gate)" });
  }

  // ── State of the Cycle — the strip, quoted ───────────────────────────────
  const states: BriefStateRow[] = strip.map((s) => ({
    id: s.id,
    label: s.label,
    available: s.available,
    stateLabel: s.stateLabel,
    detail: s.detail,
    sinceDate: s.sinceDate,
    sinceIsSeriesStart: s.sinceIsSeriesStart,
    asOf: s.asOf,
    href: s.href,
  }));

  // ── FRP — conditional on the framework's own "spell began this week" ─────
  const pack = live ? todaysConfigurationPack() : null;
  const frpInclude = pack != null && pack.available && pack.spellWeeks === 1;
  const frp = {
    include: frpInclude,
    configuration: frpInclude && pack ? pack.configuration : null,
    paragraph: frpInclude && pack ? pack.paragraph : null,
  };
  considered.push({
    candidate: "four reference prices",
    qualified: frpInclude,
    outcome: frpInclude
      ? "included — configuration's current spell began this week (spellWeeks === 1)"
      : `omitted — ${pack == null ? "framework pack is live-only (as-of discipline at review anchors)" : pack.available ? `standing configuration (spell ${pack.spellWeeks ?? "?"} weeks)` : "pack unavailable"}`,
  });

  // ── Subject — truthful candidates from the day's qualified facts only ────
  const subjectCandidates = buildSubjectCandidates(verdict, story, quietLine);
  const subject = pickFreshest(subjectCandidates, recentSubjects(10), seedFromString(intel.asOf) + SEED_OFFSET.subject).value;

  const out: BriefIntel = {
    version: BRIEF_INTEL_VERSION,
    asOf: intel.asOf,
    verdict,
    story,
    alsoToday: alsoToday.slice(0, 2),
    states,
    frp,
    cta: DASHBOARD_CTA,
    subjectCandidates,
    subject,
    selection: { storyReason, considered },
  };
  cache.set(key, out);
  return out;
}

// ── Subject candidates — the house discipline: every candidate gated on the
//    data that makes it true; the strongest canonical finding may lead. ─────
function buildSubjectCandidates(verdict: BriefVerdict, story: BriefStory, quietLine: string): string[] {
  const pool: string[] = [];
  switch (story.kind) {
    case "mover": {
      if (story.bandWord) {
        pool.push(
          `${story.label} just made an ${story.bandWord.toLowerCase()} move`,
          `An ${story.bandWord.toLowerCase()} 7-day move in ${story.label}`,
          `${story.label}: ${story.movement} in 7 days — ${story.bandWord.toLowerCase()} by its own record`,
        );
      } else {
        pool.push(
          `One reading moved materially: ${story.label}`,
          `${story.label} moved ${story.movement} in 7 days`,
          `The one that moved this week: ${story.label}`,
        );
      }
      break;
    }
    case "state_change":
      pool.push(story.headline, `A state changed: ${story.label}`);
      break;
    case "etf":
      if (story.contextLine) pool.push(`ETF demand: ${story.contextLine.replace(/\.$/, "")}`);
      pool.push(`The story is ETF demand this week`, `What the ETF week actually looked like`);
      break;
    case "quiet_duration":
      pool.push(
        `${story.label}: ${story.stateLabel} for ${story.days} consecutive days`,
        `Still ${story.stateLabel}: ${story.label}, day ${story.days}`,
        `${story.days} days of ${story.stateLabel} — and a quiet week`,
      );
      break;
    case "quiet_lens":
      pool.push(story.sentence.replace(/\.$/, ""), "What this point in past cycles looked like");
      break;
    case "quiet_floor":
      pool.push(
        `Quiet week — all ${verdict.analysed} monitored readings held their range`,
        "Nothing needs your attention today — and we checked",
        `A quiet week across the monitored market`,
      );
      break;
  }
  // Quiet shapes may fall back to the verdict/quiet vocabulary; story days
  // always lead with story-gated candidates (an active edition must never
  // wear a quiet subject).
  if (story.kind === "quiet_floor" || story.kind === "quiet_duration" || story.kind === "quiet_lens") {
    pool.push(quietLine.length < 70 ? quietLine : verdict.activityLabel);
  }
  return pool;
}
