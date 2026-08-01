// Cycle-Aligned Seasonality — the page payload (PR-V2B). Everything the
// explorer needs, precomputed server-side from the PR-V2A engine: compact
// per-(mode, series) cycle grids, spans, coverage, the agreement facts, the
// current position and the month-level configuration detail. The client
// performs NO recomputation — there are no filters on this page, so every
// combination ships ready-made and CI asserts payload/engine equality.

import { PRICE_ARCHIVE } from "./data/priceArchiveData";
import { STANDING_CLOSE } from "./fourReferencePrices";
import { SERIES_META, type Mode, type SeriesKey } from "./seasonalityCore";
import {
  agreementFacts,
  currentCyclePosition,
  cycleCells,
  cycleCoverage,
  cycleSpans,
  gridHorizon,
  monthConfigDetail,
  type AgreementFact,
  type CycleCoverage,
  type CycleSpan,
} from "./cycleSeasonality";
import { defaultSources } from "./seasonality";

/** [cycleId, month, value, partial] — nulls are omitted; the client rebuilds
 *  them from the spans (unobserved months render as unavailable cells). */
export type CompactCycleCell = [number, number, number, 0 | 1];

export interface CycleGridPayload {
  cells: CompactCycleCell[];
}

export interface CycleSeasonalityPayload {
  todayIso: string;
  spans: CycleSpan[];
  horizon: number;
  grids: Partial<Record<`${Mode}:${SeriesKey}`, CycleGridPayload>>;
  series: Record<SeriesKey, { label: string; nature: "observed" | "derived" | "estimated" }>;
  coverage: CycleCoverage[];
  /** Market-return agreement across ALL completed cycles — the page's only
   *  generated cross-cycle claims. */
  facts: AgreementFact[];
  /** Of the months every completed cycle observed in full, how many agreed
   *  in direction — the hero's permanent honesty line. */
  agreement: { agreed: number; comparable: number };
  position: { cycleId: number; month: number; day: number; projectedNextHalving: string } | null;
  /** `${cycleId}-${month}` → configuration phrase + its weekly as-of date. */
  detail: Record<string, { config: string; asOf: string }>;
  standingClose: string;
}

const MODES: Mode[] = ["returns", "valuation"];
const SERIES: SeriesKey[] = ["market", "trend", "holders", "miners"];

export function buildCycleSeasonalityPayload(): CycleSeasonalityPayload {
  const todayIso = PRICE_ARCHIVE.length ? PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1].date : "";
  const src = defaultSources();
  const spans = cycleSpans(todayIso);
  const grids: CycleSeasonalityPayload["grids"] = {};
  for (const mode of MODES) {
    for (const series of SERIES) {
      if (mode === "valuation" && series === "market") continue; // never market-vs-market
      const cells: CompactCycleCell[] = [];
      for (const [cycleId, list] of cycleCells(mode, series, src, todayIso)) {
        for (const c of list) {
          if (c.value != null) cells.push([cycleId, c.month, c.value, c.partial ? 1 : 0]);
        }
      }
      grids[`${mode}:${series}`] = { cells };
    }
  }

  const facts = agreementFacts(todayIso);
  // Comparable months: every completed cycle has a COMPLETE market-return
  // observation (the same floor the facts use).
  const completed = spans.filter((s) => s.completed);
  const market = cycleCells("returns", "market", src, todayIso);
  let comparable = 0;
  for (let m = 0; m <= gridHorizon(todayIso); m++) {
    if (completed.every((s) => market.get(s.id)?.some((c) => c.month === m && c.value != null && !c.partial))) comparable++;
  }

  const detail: CycleSeasonalityPayload["detail"] = {};
  for (const s of spans) {
    for (const c of market.get(s.id) ?? []) {
      if (c.value == null) continue;
      const d = monthConfigDetail(s.id, c.month, todayIso);
      if (d) detail[`${s.id}-${c.month}`] = d;
    }
  }

  return {
    todayIso,
    spans,
    horizon: gridHorizon(todayIso),
    grids,
    series: SERIES_META,
    coverage: cycleCoverage(todayIso),
    facts,
    agreement: { agreed: facts.length, comparable },
    position: currentCyclePosition(todayIso),
    detail,
    standingClose: STANDING_CLOSE,
  };
}
