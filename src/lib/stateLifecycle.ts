// The shared market-state lifecycle vocabulary (Cycle Dashboard V2, MW1).
// (Named stateLifecycle because lifecycle.ts is the subscriber-email engine.)
//
// One semantic answer to "how NEW is this condition?", used by every engine
// that classifies the age of a market state — the Cycle Lens (CD1) and the
// Metric Watch (MW1), and future consumers such as Pro alert candidates.
//
//   TRANSITION  the condition just became true (within the last week)
//   RECENT      it became true recently (within the last month)
//   STANDING    it remains meaningful context, but it is not new
//
// The boundaries sit on the house comparison windows (1/7/30 everywhere
// movement is compared). This module owns the VOCABULARY only. Each engine
// computes its own contiguous-state runs, because the underlying data
// shapes genuinely differ (per-day cross-cycle candidates in the Lens;
// per-observation series states in the Metric Watch) — one vocabulary, two
// run-computers, no forced generic run engine.
//
// Lifecycle is NOT significance: a condition can be highly significant and
// old, or fresh and minor. Engines carry both and never conflate them.

export type Lifecycle = "transition" | "recent" | "standing";

export const STATE_LIFECYCLE = {
  TRANSITION_MAX_AGE_DAYS: 7,
  RECENT_MAX_AGE_DAYS: 30,
} as const;

export function lifecycleOf(ageDays: number): Lifecycle {
  if (ageDays <= STATE_LIFECYCLE.TRANSITION_MAX_AGE_DAYS) return "transition";
  if (ageDays <= STATE_LIFECYCLE.RECENT_MAX_AGE_DAYS) return "recent";
  return "standing";
}

/** Lower = newer. For lifecycle-aware orderings and tie-breaks. */
export const LIFECYCLE_RANK: Record<Lifecycle, number> = { transition: 0, recent: 1, standing: 2 };
