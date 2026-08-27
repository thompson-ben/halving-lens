// Daily Brief v2 — the edition payload (PR1).
//
// Composes the shared editorial-significance engine (briefSignificance)
// with the canonical quoted components into ONE payload the renderer
// shapes without re-deciding anything. The approved hierarchy:
//
//   SYNTHESIS / VERDICT → HERO → up to THREE supporting (TWO on a major
//   transition) → STATE CONTEXT → ONE dominant contextual Dashboard CTA.
//
// Selection is significance-driven, never slot-filling: quiet days say so
// plainly and stay short. The canonical Dashboard activity classification
// is PRESERVED untouched for the campaign identity and the edition
// archive — the Brief's editorial day type is a separate, additional
// classification (authoritative contract §3).
//
// BTC price is shown honestly with its true snapshot-to-snapshot 24h
// movement: today's 08:00 Europe/London snapshot against the PERSISTED
// previous sync's price (the stored brief archive — written by the same
// 08:00 job), never a provider's rolling 24h number. The absolute price is
// never hidden as a click mechanic.
//
// Historical context. Not forecasts.

import {
  activeDivergences,
  classifyDayType,
  discoverDevelopments,
  selectDevelopments,
  DASHBOARD_ANCHORS,
  type BriefDayType,
  type Development,
  type DivergenceStatus,
} from "./briefSignificance";
import { cycleDashboardIntel } from "./cycleDashboardIntel";
import { cycleSummary } from "./cycleSummary";
import { STORED_BRIEFS } from "./data/briefs";
import { pickFreshest, seedFromString, SEED_OFFSET } from "./editorialVariety";
import { recentBriefSubjects } from "./briefV2Archive";
import { FEEDBACK_LINE, type BriefStateRow } from "./briefIntel";

export const BRIEF_EDITION_VERSION = "brief-edition-v1";

export interface BriefPriceLine {
  value: number;
  /** True snapshot-to-snapshot movement; null when no persisted prior
   *  snapshot exists (shown as price only — honest absence). */
  changePct: number | null;
  prevSnapshotDate: string | null;
  /** e.g. "since yesterday's 08:00 London snapshot" — the honest window. */
  windowLabel: string | null;
}

export interface BriefEdition {
  version: string;
  asOf: string;
  dayType: BriefDayType;
  /** The canonical Dashboard activity class — campaign + archive identity;
   *  quoted, never recomputed here. */
  activity: "quiet" | "mostly_quiet" | "active";
  activityLabel: string;
  countsLine: string;
  analysed: number;
  /** The synthesis-led Verdict — one or two sentences, cross-signal. */
  verdictLine: string;
  price: BriefPriceLine | null;
  hero: Development | null;
  supporting: Development[];
  /** Every currently-active registered divergence (reportable AND merely
   *  persisting) — Verdict input + diagnostics; persistence never occupies
   *  a hero/supporting slot. */
  divergences: DivergenceStatus[];
  quiet: { line: string; whyItMatters: string } | null;
  states: BriefStateRow[];
  cta: { label: string; href: string };
  feedback: typeof FEEDBACK_LINE;
  subject: string;
  subjectCandidates: string[];
  preheader: string;
  selection: { dayTypeReason: string; considered: string[] };
}

// ── Helpers ────────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const isoAt = (n: number): string => new Date(n * 86_400_000).toISOString().slice(0, 10);
const dayNum = (iso: string): number => Math.round(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);

/** The persisted prior 08:00 snapshot price — the stored brief archive is
 *  written by the same daily job, so its latest entry BEFORE the anchor is
 *  the previous sync's price. */
export function priceLineAt(asOf: string, live: boolean): BriefPriceLine | null {
  const stored = [...STORED_BRIEFS].filter((b) => /^\d{4}-\d{2}-\d{2}$/.test(b.slug)).sort((a, b) => (a.slug < b.slug ? -1 : 1));
  const current = live ? cycleSummary().price : stored.find((b) => b.slug === asOf)?.price ?? null;
  if (current == null || !Number.isFinite(current)) return null;
  const prev = [...stored].reverse().find((b) => b.slug < asOf) ?? null;
  if (!prev) return { value: current, changePct: null, prevSnapshotDate: null, windowLabel: null };
  const changePct = prev.price > 0 ? (current / prev.price - 1) * 100 : null;
  const isYesterday = dayNum(asOf) - dayNum(prev.slug) === 1;
  return {
    value: current,
    changePct,
    prevSnapshotDate: prev.slug,
    windowLabel: isYesterday ? "since yesterday's 08:00 London snapshot" : `since the ${prettyDate(prev.slug)} snapshot`,
  };
}

// ── Verdict synthesis (pure over selection results — fixture-drivable) ─────

export function synthesizeVerdict(opts: {
  dayType: BriefDayType;
  hero: Development | null;
  divergences: DivergenceStatus[];
  analysed: number;
  countsLine: string;
}): string {
  const { dayType, hero, divergences, analysed } = opts;
  const tension = divergences[0] ?? null; // registry order — deterministic
  const tensionClause = tension ? ` ${tension.interpretation.replace(/\.$/, "")}.` : "";
  if (dayType === "major_transition" && hero) {
    return `${hero.headline} — the day's defining development across the ${analysed} monitored readings.${tensionClause}`;
  }
  if (dayType === "active" && hero) {
    if (hero.kind === "divergence") {
      return `${hero.headline}. That tension — not any single reading — is today's story across the ${analysed} monitored readings.`;
    }
    return `${hero.headline}.${tensionClause || ` The other readings held their own ordinary ranges.`}`;
  }
  return `Little changed across the ${analysed} monitored readings today.${tensionClause || " Stability is itself information: every standing state below kept counting."}`;
}

// ── Subject candidates (generated from the significance selection) ─────────

export function subjectCandidatesFor(opts: {
  dayType: BriefDayType;
  hero: Development | null;
  divergences: DivergenceStatus[];
  analysed: number;
}): string[] {
  const { dayType, hero, divergences, analysed } = opts;
  const pool: string[] = [];
  const tension = divergences[0] ?? null;
  if (dayType === "quiet" || !hero) {
    pool.push(
      `A quiet day across all ${analysed} signals — and why that's worth noting`,
      `Nothing crossed a line today — all ${analysed} readings held`,
      `A quiet day for the ${analysed} monitored readings`,
    );
    return pool;
  }
  const heroStem = hero.headline.replace(/\.$/, "");
  if (hero.kind === "divergence") {
    pool.push(heroStem, `${hero.label}: the tension worth reading today`);
  } else if (tension) {
    // A genuine tension exists — imply it (approved family shape).
    pool.push(`${heroStem} while ${tension.interpretation.replace(/\.$/, "").toLowerCase()}`.slice(0, 90), heroStem);
  } else {
    pool.push(heroStem);
  }
  if (hero.kind === "state_transition") pool.push(`${hero.label} crossed a line today`);
  if (hero.kind === "historical_extreme") pool.push(`A top-5% move in ${hero.label}`);
  if (hero.kind === "streak_record") pool.push(heroStem);
  return pool;
}

/** ≤60 characters preferred: under-limit candidates win when any exist. */
export function pickSubject(candidates: string[], recent: string[], seed: number): string {
  const short = candidates.filter((c) => c.length <= 60);
  const pool = short.length > 0 ? short : candidates;
  return pickFreshest(pool, recent, seed).value;
}

// ── The single dominant CTA (benefit-led, statement, day-tied; honest
//    destinations only — launch constraint) ────────────────────────────────

export function ctaFor(dayType: BriefDayType, hero: Development | null, analysed: number): { label: string; href: string } {
  if (dayType === "quiet" || !hero) {
    return { label: `See all ${analysed} signals holding steady`, href: DASHBOARD_ANCHORS.board };
  }
  if (dayType === "major_transition") {
    return { label: `See ${hero.label} in full historical context`, href: DASHBOARD_ANCHORS.state_transition };
  }
  if (hero.kind === "divergence") {
    return { label: "See today's tension in full context", href: DASHBOARD_ANCHORS.divergence };
  }
  return { label: `See ${hero.label} in full context`, href: hero.href };
}

// ── Assembly ───────────────────────────────────────────────────────────────

const cache = new Map<string, BriefEdition>();

export function briefEdition(anchor?: string): BriefEdition {
  const intel = cycleDashboardIntel(anchor);
  const key = intel.asOf;
  const hit = cache.get(key);
  if (hit) return hit;

  const devs = discoverDevelopments(intel.asOf);
  const { dayType, hero, supporting, ordered } = selectDevelopments(devs);
  const divergences = activeDivergences(intel.asOf);

  const verdictLine = synthesizeVerdict({
    dayType,
    hero,
    divergences,
    analysed: intel.summary.analysed,
    countsLine: intel.summary.countsLine,
  });

  const states: BriefStateRow[] = intel.strip.map((s) => ({
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

  const subjectCandidates = subjectCandidatesFor({ dayType, hero, divergences, analysed: intel.summary.analysed });
  const subject = pickSubject(subjectCandidates, recentBriefSubjects(10), seedFromString(intel.asOf) + SEED_OFFSET.subject);

  const quiet =
    dayType === "quiet"
      ? {
          line: `No reading crossed a state boundary, made a top-5% move for its own record, or extended a notable streak today.`,
          whyItMatters:
            "Stable readings are information: every standing state below keeps counting, and the day's calm is measured against each reading's own history, not a feeling.",
        }
      : null;

  const out: BriefEdition = {
    version: BRIEF_EDITION_VERSION,
    asOf: intel.asOf,
    dayType,
    activity: intel.summary.activity,
    activityLabel: intel.summary.activityLabel,
    countsLine: intel.summary.countsLine,
    analysed: intel.summary.analysed,
    verdictLine,
    price: priceLineAt(intel.asOf, anchor == null),
    hero,
    supporting,
    divergences,
    quiet,
    states,
    cta: ctaFor(dayType, hero, intel.summary.analysed),
    feedback: FEEDBACK_LINE,
    subject,
    subjectCandidates,
    preheader: verdictLine.length <= 140 ? verdictLine : `${verdictLine.slice(0, 137)}…`,
    selection: {
      dayTypeReason:
        dayType === "major_transition"
          ? "A rank-1 state transition qualified today."
          : dayType === "active"
            ? `${ordered.length} development(s) qualified; none is a rank-1 transition.`
            : "No development met the editorial-significance bar.",
      considered: ordered.map((d) => `[rank ${d.rank}] ${d.kind}: ${d.label} (${d.windowLabel})`),
    },
  };
  cache.set(key, out);
  return out;
}

export { classifyDayType };
