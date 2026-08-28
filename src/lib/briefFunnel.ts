// Daily Brief v2 — the Brief → Dashboard qualified-visit join (PR2).
//
// ONE module owns every constant and predicate of the measurement join, so
// the click redirect, the client tracker, the collection API and the
// founder reporting can never drift:
//
//   signed first-party Brief click
//     → redirect appends the NON-PERSONAL campaign/edition marker
//     → dashboard session entry captures it (existing session model)
//     → /api/track ingests it (malformed/forged markers scrubbed)
//     → the session's engagement + allowlisted interactions decide
//       QUALIFIED VISIT (canonical predicate below).
//
// PRIVACY BY CONSTRUCTION: the marker is the Brief campaign identity ONLY
// (`daily-<date>-<activity>` — the edition date and its canonical verdict
// class). It carries no email, no hash, no subscriber/database id, no
// recipient token, and cannot identify an individual. The signed click
// tracker remains the canonical email click measurement; UTMs remain the
// social/card-share convention and never appear on email links.
//
// Measurement is PROSPECTIVE from the verified production deploy of this
// join — no backfill, ever. Content labels (primary-cta / hero-card /
// supporting-{signal} / state-table) stay in the first-party email_click
// events; the per-campaign label mix joins at the aggregate level, which
// is what the existing data permits without recipient identity in URLs.

export const BRIEF_MARKER_PARAM = "hlb";

/** The only marker shape ever appended or ingested: the Daily Brief's
 *  campaign identity, `daily-YYYY-MM-DD-<canonical activity class>`.
 *  Anything else is treated as forged and dropped, never stored. */
export const BRIEF_MARKER_RE = /^daily-\d{4}-\d{2}-\d{2}-(quiet|mostly_quiet|active)$/;

/** Validate a raw marker value (URL param or event prop). */
export function parseBriefMarker(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.slice(0, 40);
  return BRIEF_MARKER_RE.test(v) ? v : null;
}

/** Append the marker to a same-host destination URL for a Daily Brief
 *  campaign. No-op for any other campaign shape (weekly, welcome, tests…)
 *  and never overwrites an existing param. Mutates `target` in place. */
export function appendBriefMarker(target: URL, campaign: string): void {
  const marker = parseBriefMarker(campaign);
  if (!marker) return;
  if (target.searchParams.has(BRIEF_MARKER_PARAM)) return;
  target.searchParams.set(BRIEF_MARKER_PARAM, marker);
}

/** Scrub an invalid/forged `brief` prop before storage (fail safe: the
 *  event survives, the marker does not). */
export function scrubBriefProp(props: Record<string, unknown>): void {
  if ("brief" in props && parseBriefMarker(props.brief) == null) delete props.brief;
}

// ── The canonical qualified-visit predicate (PR2 commission §4) ─────────────

/** Clause A: total recorded engagement time in the session. */
export const QUALIFIED_ENGAGED_SECONDS = 60;
/** Clause B: allowlisted meaningful dashboard interactions in the session. */
export const QUALIFIED_INTERACTIONS = 2;

/** The smallest defensible interaction allowlist (reconciled against the
 *  existing event vocabulary before implementation):
 *   · section_click — an EXISTING event: a deliberate click inside one of
 *     the dashboard's four TrackedSections (What Changed, State Strip,
 *     Market Board, ETF Intel) — already fired in production.
 *   · lens_interact — the ONE new event PR2 adds: a meaningful Cycle Lens
 *     interaction (day scrub / control use), the dashboard's flagship
 *     interactive behaviour, previously uninstrumented.
 *  Deliberately NOT counted: section_view / section_dwell (passive
 *  visibility — time is clause A's job), page_view, engagement. */
export const BRIEF_INTERACTION_EVENTS: readonly string[] = ["section_click", "lens_interact"];

/** Interactions qualify only on the dashboard surface itself. */
export const BRIEF_INTERACTION_PATH = /^\/cycle-dashboard(\/|$)?/;

export function isQualifyingInteraction(name: string, path: string | null): boolean {
  return BRIEF_INTERACTION_EVENTS.includes(name) && path != null && BRIEF_INTERACTION_PATH.test(path);
}

/** THE canonical predicate: a Brief-attributed dashboard session is a
 *  QUALIFIED VISIT when either clause holds. Deterministic, computed from
 *  stored events at reporting time — never client state. */
export function qualifiesVisit(f: { engagedSeconds: number; interactions: number }): boolean {
  return f.engagedSeconds >= QUALIFIED_ENGAGED_SECONDS || f.interactions >= QUALIFIED_INTERACTIONS;
}

// ── The founder-report KPI contract (PR #219 final review, §4) ──────────────
//
// QUALIFIED-VISIT RATE = qualified Brief-attributed dashboard sessions
//                      ÷ Brief-attributed dashboard ARRIVAL sessions.
//
// The denominator is DASHBOARD ARRIVALS — never email clicks, unique
// clickers, deliveries, opens, subscribers or the send population. Email
// click behaviour is a SEPARATE stage reported with its own denominators.
// Counting is at the SESSION level: one valid hlb-attributed session = one
// arrival (deduplicated by the existing session id, first valid marker
// wins), and the same session qualifying contributes one qualified visit —
// so qualified ≤ arrivals holds structurally. A zero denominator renders
// as unavailable ("—"), never as a manufactured 0%.

export interface BriefArrivalEntry {
  sessionId: string | null;
  brief: unknown;
}

/** Session-level arrival deduplication: sessionId → campaign. Entries with
 *  no session id or an invalid marker never become arrivals. */
export function arrivalSessions(entries: readonly BriefArrivalEntry[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of entries) {
    const campaign = parseBriefMarker(e.brief);
    if (!campaign || !e.sessionId) continue;
    if (!out.has(e.sessionId)) out.set(e.sessionId, campaign);
  }
  return out;
}

export interface BriefKpis {
  arrivals: number;
  qualified: number;
  byCampaign: Array<{ campaign: string; arrivals: number; qualified: number }>;
}

/** THE KPI reduction, owned here so reporting can never redefine it: each
 *  arrival session is evaluated once with the canonical predicate. */
export function qualifiedVisitKpis(
  arrivals: ReadonlyMap<string, string>,
  factsOf: (sessionId: string) => { engagedSeconds: number; interactions: number },
): BriefKpis {
  const byCampaign = new Map<string, { arrivals: number; qualified: number }>();
  let qualified = 0;
  for (const [sid, campaign] of arrivals) {
    const q = qualifiesVisit(factsOf(sid));
    if (q) qualified++;
    const c = byCampaign.get(campaign) ?? { arrivals: 0, qualified: 0 };
    c.arrivals++;
    if (q) c.qualified++;
    byCampaign.set(campaign, c);
  }
  return {
    arrivals: arrivals.size,
    qualified,
    byCampaign: [...byCampaign.entries()].map(([campaign, v]) => ({ campaign, ...v })),
  };
}

/** "n/d (x%)" — or unavailable when the denominator is zero/unknown. A
 *  percentage is never manufactured from a zero denominator. */
export function formatQualifiedRate(qualified: number | null, arrivals: number | null): string {
  if (qualified == null || arrivals == null || arrivals <= 0) return "—";
  return `${qualified}/${arrivals} (${Math.round((qualified / arrivals) * 100)}%)`;
}
