// The evidence layer's assembly point: gather reads from the live engines,
// apply the freshness contract, build the full token map, and resolve tokens
// in editorial prose. gatherReads() is the ONLY impure part; buildTokens()
// and resolveTokens() are pure so CI can drive every state with fixtures.

import { PRICE_ARCHIVE } from "../../data/priceArchiveData";
import { SOURCE, CURRENT_CYCLE } from "../../btcData";
import { frameworkToday, tierStats } from "../../fourReferencePrices";
import { accumulationRead } from "../../accumulation";
import { atomValues } from "./atoms";
import { CLAIMS } from "./claims";
import {
  accumulationSentence,
  athRecencySentence,
  frpPositionSentence,
  frpSpellSentence,
  peakStatusSentence,
  type AccumRead,
  type AthRead,
  type FrpRead,
  type PeakRead,
  type SpellRead,
} from "./sentences";

export interface EvidenceReads {
  frp: FrpRead;
  spell: SpellRead;
  accumulation: AccumRead;
  peak: PeakRead;
  ath: AthRead;
}

// ── Freshness contract (commission §3) ──────────────────────────────────────
// The archive is stale when its last close sits more than 3 calendar days
// behind the snapshot's fetch date (the feeds disagreeing is the observable
// symptom of a failing archive sync — both dates are data-derived, so the
// check is deterministic for a given checkout).

const DAY_MS = 86_400_000;
const dayNum = (iso: string): number => Date.parse(`${iso}T00:00:00Z`) / DAY_MS;

export function archiveIsFresh(lastArchiveDate: string | null, fetchedAt: string | null): boolean {
  if (!lastArchiveDate || !fetchedAt) return false;
  const gap = dayNum(fetchedAt.slice(0, 10)) - dayNum(lastArchiveDate);
  return Number.isFinite(gap) && gap <= 3;
}

interface GatherOpts {
  archive?: { date: string; value: number }[];
  fetchedAt?: string | null;
}

export function gatherReads(opts: GatherOpts = {}): EvidenceReads {
  const archive = opts.archive ?? PRICE_ARCHIVE;
  const fetchedAt = opts.fetchedAt !== undefined ? opts.fetchedAt : (SOURCE.fetchedAt ?? null);
  const last = archive.length ? archive[archive.length - 1] : null;
  const clean = (p: { date: string; value: number } | null) => p != null && Number.isFinite(p.value) && p.value > 0;
  const fresh = clean(last) && archiveIsFresh(last!.date, fetchedAt);

  // FRP position — from the engine's stable configuration id (no recomputation).
  let frp: FrpRead = { available: false, dataDate: null, aboveTrend: null, aboveHolders: null, aboveMiners: null };
  let spell: SpellRead = { available: false, spellWeeks: null, matchingPct: null, recordWeeks: null };
  try {
    const today = frameworkToday();
    if (today.configurationId != null && fetchedAt) {
      const side = (part: string | undefined): boolean | null =>
        part == null ? null : part.startsWith("above-");
      const parts = today.configurationId.split("_");
      frp = {
        available: true,
        dataDate: fetchedAt.slice(0, 10),
        aboveTrend: side(parts.find((p) => p.endsWith("-trend"))),
        aboveHolders: side(parts.find((p) => p.endsWith("-holders"))),
        aboveMiners: side(parts.find((p) => p.endsWith("-miners"))),
      };
      const stats = tierStats("full") ?? tierStats("trend-miners") ?? tierStats("trend-only");
      spell = {
        available: true,
        spellWeeks: stats?.currentSpellWeeks ?? null,
        matchingPct: stats?.matchingTodayPct ?? null,
        recordWeeks: stats?.weeks ?? null,
      };
    }
  } catch {
    /* unavailable stays false */
  }

  // Accumulation — the engine's own sentence, verbatim.
  let accumulation: AccumRead = { available: false, reasoning: null };
  try {
    const read = accumulationRead();
    if (read?.reasoning) accumulation = { available: true, reasoning: read.reasoning };
  } catch {
    /* unavailable stays false */
  }

  // Peak status + ATH recency — from the daily archive, current-cycle scope.
  let peak: PeakRead = { available: false, latest: null, peak: null };
  let ath: AthRead = { available: false, lastAthDate: null, daysAgo: null };
  if (fresh) {
    const cycle = archive.filter((p) => p.date >= CURRENT_CYCLE.halvingDate && clean(p));
    if (cycle.length) {
      const top = cycle.reduce((a, b) => (b.value > a.value ? b : a));
      peak = {
        available: true,
        latest: { date: last!.date, close: last!.value },
        peak: { date: top.date, close: top.value },
      };
    }
    let runPeak = 0;
    let lastAth: string | null = null;
    for (const p of archive) {
      if (!clean(p)) continue;
      if (p.value > runPeak) {
        runPeak = p.value;
        lastAth = p.date;
      }
    }
    if (lastAth) ath = { available: true, lastAthDate: lastAth, daysAgo: Math.round(dayNum(last!.date) - dayNum(lastAth)) };
  }

  return { frp, spell, accumulation, peak, ath };
}

// ── Token map ───────────────────────────────────────────────────────────────

export function buildTokens(reads: EvidenceReads): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [id, value] of Object.entries(atomValues())) tokens[`a:${id}`] = value;
  for (const [id, text] of Object.entries(CLAIMS)) tokens[`sc:${id}`] = text;
  tokens["es:frp.position"] = frpPositionSentence(reads.frp);
  tokens["es:frp.spell"] = frpSpellSentence(reads.spell);
  tokens["es:accumulation.read"] = accumulationSentence(reads.accumulation);
  tokens["es:peak.status"] = peakStatusSentence(reads.peak);
  tokens["es:ath.recency"] = athRecencySentence(reads.ath);
  return tokens;
}

export interface EvidenceContext {
  tokens: Record<string, string>;
  /** Timestamp of the live evidence snapshot — shown in Today's Data, never
   *  written into Article dates (commission §2c). */
  dataUpdatedAt: string;
}

let cache: EvidenceContext | null = null;

export function evidenceContext(): EvidenceContext {
  if (cache) return cache;
  const lastArchive = PRICE_ARCHIVE.length ? PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1].date : null;
  cache = {
    tokens: buildTokens(gatherReads()),
    dataUpdatedAt: (SOURCE.fetchedAt ?? "").slice(0, 10) || lastArchive || "",
  };
  return cache;
}

const TOKEN_RE = /\{\{(a|es|sc):([a-zA-Z0-9.-]+)\}\}/g;

/** Resolve every token in an editorial string. Unknown tokens throw (CI runs
 *  this over every entry); an approved empty EngineSentence resolution
 *  collapses cleanly with no double spaces. */
export function resolveTokens(text: string, tokens: Record<string, string>): string {
  const resolved = text.replace(TOKEN_RE, (_, kind: string, id: string) => {
    const value = tokens[`${kind}:${id}`];
    if (value === undefined) throw new Error(`Unknown evidence token {{${kind}:${id}}}`);
    return value;
  });
  if (resolved.includes("{{")) throw new Error(`Unresolvable token syntax in: ${text.slice(0, 80)}`);
  return resolved.replace(/\s{2,}/g, " ").trim();
}
