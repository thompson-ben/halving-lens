// WEAS — Weekly Engaged Active Subscribers. HalvingLens' official North Star.
//
// Definition v1 (see the architecture map): a distinct, confidently-attributable
// subscriber (identity = emailHash, carried as props.sub) who performs ≥1
// MEANINGFUL first-party engagement action in the 7-day week. Bare sign-in and
// provider-reported email opens are SUPPORTING-only and never counted, because
// authentication isn't engagement and Apple MPP inflates opens.
//
// Engagement-confidence tiers (only the first three count toward WEAS):
//   confirmed — email click · saved favourite · recognised flagship/Brief/research view
//   high      — recognised personalised-dashboard view
//   medium    — recognised return to another page
//   supporting— email open · bare sign-in            (reported, NOT counted)
//
// HONEST BY CONSTRUCTION: only events that carry a subscriber hash (props.sub)
// are attributable, so anonymous browsing and MPP opens are invisible → WEAS is
// a CONFIRMED LOWER BOUND, flagged as such with an identity-coverage figure. It
// is deterministic (pure `computeWeas(input, now)`), deduped by hash, aggregate
// only — no per-subscriber surveillance. As instrumentation matures the value
// rises toward truth without the definition changing.

import { FLAGSHIP_PAGES } from "../journeyAnalytics";
import { sbSelect, supabaseConfigured } from "../supabase";
import { subscriberStats } from "../analytics";
import { confidenceFrom } from "./confidence";
import { weekPeriod, priorPeriod, inWindow } from "./period";
import type { EngagementConfidence, NorthStar, Period, Trend } from "./types";

export const WEAS_DEFINITION_VERSION = "1.0";
const DAY = 86_400_000;

// Recognised views of these pages are "confirmed" meaningful engagement.
const ENGAGEMENT_PAGES = new Set<string>([...FLAGSHIP_PAGES, "/brief", "/research", "/research/findings", "/weekly"]);

// A minimal event row — only the fields WEAS needs. `sub` is the emailHash
// carried in props.sub (null when the event isn't attributable to a subscriber).
export interface WeasEvent {
  name: string;
  sub: string | null;
  path: string | null;
  created_at: string;
}
export interface WeasInput {
  events: WeasEvent[];
  activeSubscribers: number | null;
}

function normPath(p: string | null): string {
  if (!p) return "";
  return p.split("?")[0].split("#")[0].replace(/(.)\/$/, "$1");
}

// The engagement tier of a single event, or null if it isn't an engagement signal.
function tierOf(e: WeasEvent): EngagementConfidence | null {
  switch (e.name) {
    case "email_click":
    case "favourite_toggle":
      return "confirmed";
    case "page_view":
      return ENGAGEMENT_PAGES.has(normPath(e.path)) ? "confirmed" : "medium";
    case "dashboard_view":
      return "high";
    case "email_open":
    case "profile_signin":
    case "profile_request":
      return "supporting";
    default:
      return null;
  }
}

const TIER_RANK: Record<EngagementConfidence, number> = { supporting: 0, medium: 1, high: 2, confirmed: 3 };
const COUNTED: EngagementConfidence[] = ["confirmed", "high", "medium"];

interface WindowResult {
  weas: number;
  tiers: { confirmed: number; high: number; medium: number };
  emailOpens: number; // distinct subs whose ONLY signal was an open
  signIns: number; // distinct subs whose ONLY signal was a bare sign-in
  recognisedSubs: number; // distinct subs with any attributable signal (incl. supporting)
}

function computeWindow(events: WeasEvent[], period: Period): WindowResult {
  const best = new Map<string, EngagementConfidence>(); // sub → strongest tier this week
  const sawOpen = new Set<string>();
  const sawSignIn = new Set<string>();
  for (const e of events) {
    if (!e.sub) continue; // unattributable → invisible (honest lower bound)
    if (!inWindow(Date.parse(e.created_at), period)) continue;
    const t = tierOf(e);
    if (!t) continue;
    if (e.name === "email_open") sawOpen.add(e.sub);
    if (e.name === "profile_signin" || e.name === "profile_request") sawSignIn.add(e.sub);
    const prev = best.get(e.sub);
    if (!prev || TIER_RANK[t] > TIER_RANK[prev]) best.set(e.sub, t);
  }
  const tiers = { confirmed: 0, high: 0, medium: 0 };
  let weas = 0;
  for (const [, t] of best) {
    if (COUNTED.includes(t)) {
      weas += 1;
      tiers[t as "confirmed" | "high" | "medium"] += 1;
    }
  }
  // Supporting-only = recognised subs whose strongest signal is supporting.
  let emailOpens = 0;
  let signIns = 0;
  for (const [sub, t] of best) {
    if (t === "supporting") {
      if (sawOpen.has(sub)) emailOpens += 1;
      else if (sawSignIn.has(sub)) signIns += 1;
    }
  }
  return { weas, tiers, emailOpens, signIns, recognisedSubs: best.size };
}

const pct = (num: number, den: number): number | null => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);
const trendOf = (cur: number | null, prev: number | null): Trend =>
  cur == null || prev == null ? "unknown" : cur > prev ? "up" : cur < prev ? "down" : "flat";

// Pure, deterministic core — same (input, now) always yields the same WEAS.
export function computeWeas(input: WeasInput, now: number): NorthStar {
  const period = weekPeriod(now);
  const prior = priorPeriod(period);
  const cur = computeWindow(input.events, period);
  const prev = computeWindow(input.events, prior);
  const active = input.activeSubscribers;
  const identityCoverage = active && active > 0 ? Math.min(1, Math.round((cur.recognisedSubs / active) * 100) / 100) : null;

  const confidence = confidenceFrom({ sampleSize: cur.weas, periods: 2, coverage: identityCoverage ?? 0.2, observed: true });

  const notes: string[] = [
    "WEAS is a confirmed lower bound: only engagement carrying a subscriber identity (email clicks + recognised on-site actions) is counted; anonymous browsing and provider-reported opens are excluded.",
  ];
  if ((identityCoverage ?? 0) < 0.5) notes.push("Identity coverage is still partial — on-site recognition accrues only for signed-in members and only from the instrumentation go-live date.");

  return {
    metric: "weekly_engaged_active_subscribers",
    definitionVersion: WEAS_DEFINITION_VERSION,
    value: cur.weas,
    rate: pct(cur.weas, active ?? 0),
    previousValue: prev.weas,
    change: cur.weas - prev.weas,
    trend: trendOf(cur.weas, prev.weas),
    confidence,
    coverage:
      identityCoverage != null
        ? `${Math.round(identityCoverage * 100)}% of active subscribers were recognised via a first-party signal this week`
        : "Active-subscriber base unavailable — coverage cannot be computed",
    identityCoverage,
    activeSubscribers: active,
    tiers: cur.tiers,
    supportingOnly: { emailOpens: cur.emailOpens, signIns: cur.signIns },
    isLowerBound: true,
    notes,
  };
}

// Async source: pulls the (bounded) subscriber-attributable events + the active
// subscriber base, then defers to the pure core. Only events carrying a
// subscriber hash are fetched, so volume stays small. Fails to an explicit
// unavailable North Star — never a fabricated value.
interface EventRow {
  name: string;
  props: Record<string, unknown> | null;
  created_at: string;
  path: string | null;
}
export async function weasNorthStar(now: number = Date.now()): Promise<NorthStar> {
  if (!supabaseConfigured) return unavailableWeas("Supabase isn't configured — WEAS is unavailable until first-party analytics are connected.");
  const sinceIso = new Date(now - 14 * DAY).toISOString();
  const [signals, recognisedViews, subs] = await Promise.all([
    sbSelect<EventRow[]>(
      `events?select=name,props,created_at,path&name=in.(email_click,email_open,favourite_toggle,dashboard_view,profile_signin,profile_request)&created_at=gte.${sinceIso}&limit=100000`,
    ),
    sbSelect<EventRow[]>(`events?select=name,props,created_at,path&name=eq.page_view&props->>sub=not.is.null&created_at=gte.${sinceIso}&limit=100000`),
    subscriberStats(),
  ]);
  if (signals == null && recognisedViews == null) return unavailableWeas("First-party event store unreachable — WEAS unavailable this refresh.");
  const rows = [...(signals ?? []), ...(recognisedViews ?? [])];
  const events: WeasEvent[] = rows.map((r) => ({
    name: r.name,
    sub: typeof r.props?.sub === "string" ? (r.props.sub as string) : null,
    path: r.path,
    created_at: r.created_at,
  }));
  return computeWeas({ events, activeSubscribers: subs.active ?? subs.total ?? null }, now);
}

// An explicit unavailable North Star (Supabase off / no data) — never faked.
export function unavailableWeas(reason: string): NorthStar {
  return {
    metric: "weekly_engaged_active_subscribers",
    definitionVersion: WEAS_DEFINITION_VERSION,
    value: null,
    rate: null,
    previousValue: null,
    change: null,
    trend: "unknown",
    confidence: "insufficient",
    coverage: reason,
    identityCoverage: null,
    activeSubscribers: null,
    tiers: { confirmed: 0, high: 0, medium: 0 },
    supportingOnly: { emailOpens: 0, signIns: 0 },
    isLowerBound: true,
    notes: [reason],
  };
}
