// Visitor Journey Intelligence — the data engine behind /admin/journeys.
//
// This does NOT report pages; it reconstructs *journeys*. Every metric answers a
// founder question ("how do people discover the value of HalvingLens?") rather
// than "which pages got traffic?". Everything is derived from first-party events:
// a session is the ordered sequence of page_view events sharing a session_id,
// and a session "converted" if a signup event fired in the same session.
//
// Phase 3 shifts the lens from "where did visitors leave?" to "did they achieve
// our goal before they left?". Every exit is now classified as a SUCCESS (the
// visitor subscribed), NEUTRAL (an existing member simply browsing) or a LOST
// visitor (left without ever subscribing) — the last being the number the
// founder actually wants to reduce. On top of that: which page converts them,
// the highest-converting journeys, and how long conversion takes.
//
// Two data eras, kept honest and distinct:
//   • HISTORICAL — session_id + path + created_at have been captured for a long
//     time, so depth, funnels, journeys, exits and transitions cover full history.
//   • NEW (accruing since JOURNEY_DATA_SINCE) — anonymous visitor id + entry
//     referrer/UTM only exist from the Phase 1 instrumentation onward. Anything
//     depending on them reports "collecting since <date>", never a fabricated value.
//     Returning-member (neutral) exit detection needs the visitor id to link a
//     browse back to an earlier signup, so it too fills in as data accrues.

import { sbSelect, supabaseConfigured } from "./supabase";
import { JOURNEY_MAP } from "./journeyMap";

// The moment Phase 1 instrumentation (visitor id + entry referrer/UTM) went live
// on main (PR #97 merge, 20 Jul 2026). Widgets that need the new signals date
// their "collecting since" note from here — honest about what we can/can't yet know.
export const JOURNEY_DATA_SINCE = "2026-07-20T13:00:43Z";

// Friendly names for the paths founders care about. Anything not listed renders
// as its path, so the map is a nicety, never a filter.
const PAGE_LABEL: Record<string, string> = {
  "/": "Home",
  "/start": "Landing (/start)",
  "/free": "Free (/free)",
  "/brief": "Daily Brief",
  "/state-of-bitcoin": "State of Bitcoin",
  "/accumulation": "Accumulation Index",
  "/historical-price-paths": "Historical Price Paths",
  "/price": "Bitcoin Price",
  "/research": "Research Library",
  "/research/findings": "Research Findings",
  "/weekly": "Weekly Research",
  "/profile": "Profile",
  "/market-health": "Market Health",
  "/etf": "ETF Flows",
  "/hodl-waves": "HODL Waves",
  "/similar-moments": "Similar Moments",
  "/four-reference-prices": "Four Reference Prices",
  "/cycles": "Cycle Comparison",
  "/start-here": "Start Here",
  "/price/seasonality": "Seasonality",
};

export function prettyPath(path: string): string {
  return PAGE_LABEL[path] ?? path;
}

// The flagship pages — HalvingLens's genuinely unique work. Reaching one of these
// is what "discovering the value" means, and it's the spine of the Value
// Discovery Rate North Star. Maintained here so adding a flagship page is a
// one-line change (never a filter — non-flagship pages still count everywhere else).
export const FLAGSHIP_PAGES: string[] = [
  "/state-of-bitcoin",
  "/accumulation",
  "/historical-price-paths",
  "/similar-moments",
  "/four-reference-prices",
];
const FLAGSHIP_SET = new Set(FLAGSHIP_PAGES);

// The flagship destinations as a human-readable list, generated from the
// registry — recommendation copy names every flagship dynamically, so adding
// a flagship page updates the advice everywhere at once.
export function flagshipDestinationsLabel(): string {
  const names = FLAGSHIP_PAGES.map(prettyPath);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

// ── Recommendation lifecycle ─────────────────────────────────────────────────
// The dashboard recognises work that has already shipped: a page with a
// Continue-your-journey placement (journeyMap is the source of truth) is no
// longer told to "add links" — instead its journey's EFFECTIVENESS is
// evaluated from the recorded journey_next_impression/click events, and the
// lifecycle state explains when more behavioural data is needed.
export type OppLifecycle = "not_implemented" | "collecting" | "monitoring";
export const JOURNEY_MIN_IMPRESSIONS = 50;

export function opportunityLifecycle(path: string, journeyImpressions: number): OppLifecycle {
  if (!(path in JOURNEY_MAP)) return "not_implemented";
  return journeyImpressions >= JOURNEY_MIN_IMPRESSIONS ? "monitoring" : "collecting";
}

export function recommendationFor(args: {
  path: string;
  lifecycle: OppLifecycle;
  lowOnward: boolean;
  subRatePct: number;
  impressions: number;
  clicks: number;
}): string {
  const label = prettyPath(args.path);
  if (args.lifecycle === "not_implemented") {
    return args.lowOnward
      ? `Strengthen the CTA on ${label} and add clear links into a flagship page (${flagshipDestinationsLabel()}).`
      : `Visitors explore from ${label} but rarely subscribe (${args.subRatePct}%) — add a subscribe prompt once they've seen a flagship page.`;
  }
  if (args.lifecycle === "collecting") {
    return `Continue your journey is live on ${label} — hold further changes until ~${JOURNEY_MIN_IMPRESSIONS} journey impressions accrue, then judge its effect here.`;
  }
  const ctr = args.impressions > 0 ? Math.round((args.clicks / args.impressions) * 100) : 0;
  if (ctr < 4) {
    return `Journey links are live on ${label} but rarely followed (${ctr}% of ${args.impressions.toLocaleString()} impressions) — revisit the bridge copy or the primary destination.`;
  }
  if (args.subRatePct < 1) {
    return `The journey on ${label} works (${ctr}% follow a hand-off) — the remaining gap is conversion: add or strengthen the subscribe prompt.`;
  }
  return `The journey on ${label} is performing (${ctr}% follow-through) — monitor, and replicate the pattern on weaker pages.`;
}

// Confidence gates every recommendation on SAMPLE SIZE, not just percentage — so
// "100% from 2 journeys" reads low while "100% from 48" reads high. One threshold
// set, used across opportunities, wins, page health and insights.
export type Confidence = "high" | "medium" | "low";
export function confidenceFromSample(n: number): Confidence {
  if (n >= 30) return "high";
  if (n >= 10) return "medium";
  return "low";
}

// ── Public shapes ────────────────────────────────────────────────────────────
export interface JourneyKpis {
  sessions: number;
  explorerRate: number | null; // % of sessions that view ≥3 unique pages — the North Star
  avgJourneyDepth: number | null; // mean unique pages per session
  conversionRate: number | null; // % of sessions with a signup
  avgDurationSec: number | null; // mean entry→last-page span
  subscribers: number; // sessions that converted
}

// A session's outcome — the heart of Phase 3.
export type ExitOutcome = "successful" | "neutral" | "lost";

// The founder KPI: of every session, what share ended in success vs a lost
// visitor vs a member simply browsing.
export interface ExitOutcomes {
  total: number;
  successful: number; // subscribed in this session
  neutral: number; // already a member before this session (nothing to optimise)
  lost: number; // left without ever subscribing — the number to reduce
  successfulPct: number | null;
  neutralPct: number | null;
  lostPct: number | null;
  // Neutral detection links a browse to an earlier signup via the anonymous
  // visitor id, which only exists post-Phase-1. Until enough has accrued most
  // historical "not subscribed" exits can't be proven to be members, so they
  // count as lost. This flag lets the UI say so honestly.
  memberDetection: boolean;
  subscribersKnown: number; // distinct visitor ids we can recognise as members
}

export interface FunnelStep {
  label: string;
  count: number;
  pct: number; // % of all sessions
}

export interface LandingRow {
  path: string;
  label: string;
  sessions: number;
  wentDeeperPct: number | null; // viewed ≥2 pages
  subscribedPct: number | null;
  avgPages: number | null;
  avgDurationSec: number | null;
}

export interface JourneyPath {
  steps: string[]; // ordered page labels (consecutive dupes collapsed, capped)
  count: number;
  pct: number; // % of sessions
  conversionPct: number | null;
  truncated: boolean;
}

export interface ExitRow {
  path: string;
  label: string;
  exits: number;
  subscribed: number; // exits where the visitor had subscribed in-session (success)
  lost: number; // exits without a subscription (exits − subscribed)
  successPct: number | null; // subscribed ÷ exits — is this an acceptable exit?
  exitRatePct: number | null; // exits ÷ sessions that viewed the page
  avgDepthBeforeExit: number | null;
  avgTimeBeforeExitSec: number | null;
}

// Which page actually did the persuading — the page a signup fired on.
export interface ConversionPageRow {
  path: string;
  label: string;
  subscribers: number;
  pct: number | null; // share of all attributed signups
}

// How much journey a visitor needs before converting.
export interface TimeToSubscribe {
  converters: number; // converting sessions we could time
  avgPages: number | null;
  medianPages: number | null;
  avgMinutes: number | null;
  medianMinutes: number | null;
}

export interface TransitionFrom {
  path: string;
  label: string;
  views: number;
  targets: { path: string; label: string; pct: number }[]; // next page after this one
  exitedPct: number; // no further navigation (this was the exit)
}

export interface DiscoveryRow {
  landing: string;
  landingLabel: string;
  second: string | null;
  secondLabel: string | null;
  third: string | null;
  thirdLabel: string | null;
}

export interface SegmentDepth {
  label: string; // "First visit" | "Returning"
  sessions: number;
  avgDepth: number | null;
  conversionPct: number | null;
}

export interface JourneyInsight {
  tone: "good" | "warn" | "info";
  category: "action" | "monitor" | "good"; // 🚨 Immediate action · ⚠ Monitor · ✅ Working well
  text: string;
  confidence?: Confidence;
  impact?: string; // e.g. "+18 subscribers/month" — modeled estimate
}

// Value Discovery Rate — the true North Star. Did visitors reach a flagship page
// (our best work) before deciding? And does reaching one actually convert them?
export interface ValueDiscovery {
  sessions: number;
  reached: number; // sessions that hit ≥1 flagship page
  reachedPct: number | null; // the North Star
  subscribersReached: number;
  convReachedPct: number | null; // conversion among those who discovered the value
  subscribersNotReached: number;
  convNotReachedPct: number | null; // conversion among those who never did
  liftX: number | null; // convReached ÷ convNotReached — the value of discovery
  flagshipLabels: string[];
}

// A ranked growth opportunity — the daily backlog. Impact is a MODELED estimate
// (see the opportunity model), deliberately conservative and labelled as such.
export type OppLevel = "high" | "medium" | "healthy";
export interface GrowthOpportunity {
  path: string;
  label: string;
  level: OppLevel; // 🔴 high · 🟠 medium · 🟢 healthy
  estSubsPerMonth: number; // 0 when healthy
  evidence: string;
  recommendation: string;
  confidence: Confidence;
  /** Whether the shipped journey system already covers this page, and how
   *  far along the evidence is (PR150 — recommendation lifecycle). */
  lifecycle: OppLifecycle;
  lifecycleNote: string;
}

// A composite page-health score — "which pages are healthy, which need work?".
export interface PageHealthRow {
  path: string;
  label: string;
  score: number; // 0..100 composite
  band: "healthy" | "ok" | "needs-work";
  sessions: number;
  subscribeRatePct: number | null;
  onwardPct: number | null; // navigated onward from the page at least once
  exitSuccessPct: number | null; // of exits here, share that had subscribed
  avgDepth: number | null;
  avgDurationSec: number | null;
  confidence: Confidence;
}

// Celebrate what's working, so it can be replicated.
export interface Wins {
  topConvertingPage: { label: string; pct: number; sample: number; confidence: Confidence } | null;
  bestOnward: { label: string; pct: number; sample: number } | null;
  strongestJourney: JourneyPath | null;
  biggestImprovement: { metric: string; from: number | null; to: number | null } | null;
}

// Period-over-period comparison — is optimisation actually working?
export interface PeriodMetrics {
  sessions: number;
  explorerRate: number | null;
  valueDiscoveryRate: number | null;
  conversionRate: number | null;
  avgDepth: number | null;
  lostPct: number | null;
  subscribers: number;
}
export interface PeriodComparison {
  label: string;
  current: PeriodMetrics;
  previous: PeriodMetrics;
}

// The 20-second executive read at the very top of the page.
export interface MorningSummary {
  sessions: number;
  subscribers: number;
  conversionPct: number | null;
  bullets: string[];
}

// Sankey flow between journey positions (entry → 2nd → 3rd → outcome). Nodes are
// grouped in columns; links carry a value = session volume.
export interface SankeyNode {
  id: string;
  label: string;
  col: number;
}
export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface AcquisitionState {
  // Channel/returning depend on the new instrumentation; until enough has
  // accrued we say so rather than showing an empty or fabricated widget.
  collecting: boolean;
  since: string;
  sessionsWithEntryContext: number; // entry events carrying referrer/UTM since instrumentation
  channels: { label: string; sessions: number; conversionPct: number | null }[];
}

export interface JourneyAnalytics {
  configured: boolean;
  generatedAt: string;
  dataSince: string;
  kpis: JourneyKpis;
  valueDiscovery: ValueDiscovery;
  morningSummary: MorningSummary;
  opportunities: GrowthOpportunity[];
  pageHealth: PageHealthRow[];
  wins: Wins;
  comparisons: PeriodComparison[];
  exitOutcomes: ExitOutcomes;
  funnel: FunnelStep[];
  landings: LandingRow[];
  topJourneys: JourneyPath[];
  bestJourneys: JourneyPath[];
  conversionPages: ConversionPageRow[];
  timeToSubscribe: TimeToSubscribe;
  exits: ExitRow[];
  transitions: TransitionFrom[];
  discovery: DiscoveryRow[];
  segments: SegmentDepth[]; // first vs returning
  sankey: { nodes: SankeyNode[]; links: SankeyLink[] };
  acquisition: AcquisitionState;
  insights: JourneyInsight[];
}

interface EventRow {
  path: string | null;
  session_id: string | null;
  is_new: boolean | null;
  created_at: string;
  props: Record<string, unknown> | null;
}
interface SignupRow {
  session_id: string | null;
  path: string | null;
  created_at: string | null;
  props: Record<string, unknown> | null;
}

export interface JourneyEventRow {
  name: string; // journey_next_impression | journey_next_click
  props: Record<string, unknown> | null; // { from, to?, position? }
}

export interface JourneyInput {
  pageViews: EventRow[];
  signups: SignupRow[];
  journeyEvents?: JourneyEventRow[];
}

const pct = (num: number, den: number): number | null => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);
const round1 = (n: number): number => Math.round(n * 10) / 10;

function mean1(xs: number[]): number | null {
  return xs.length ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
}
function median1(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return round1(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}

function propStr(props: Record<string, unknown> | null | undefined, key: string): string | null {
  const v = props?.[key];
  return typeof v === "string" && v ? v : null;
}

function normPath(p: string | null): string | null {
  if (!p) return null;
  let s = p.trim();
  if (!s.startsWith("/")) return null;
  // strip any accidental query/hash, and trailing slash (except root)
  s = s.split("?")[0].split("#")[0];
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s || "/";
}

// One reconstructed session.
interface Session {
  id: string;
  seq: string[]; // ordered paths, consecutive duplicates collapsed
  unique: Set<string>;
  firstTs: number;
  lastTs: number;
  isNew: boolean;
  converted: boolean;
  outcome: ExitOutcome;
  reachedFlagship: boolean; // viewed ≥1 flagship page (Value Discovery)
  visitorId: string | null;
  pagesBeforeConvert: number | null; // unique pages seen up to the signup (converting sessions)
  secondsToConvert: number | null; // entry → signup (converting sessions with a timestamp)
  referrer: string | null;
  utmSource: string | null;
}

export async function journeyAnalytics(): Promise<JourneyAnalytics> {
  if (!supabaseConfigured) return emptyJourneys();
  const [pv, su, jn] = await Promise.all([
    sbSelect<EventRow[]>(
      "events?select=path,session_id,is_new,created_at,props&name=eq.page_view&order=created_at.desc&limit=50000",
    ),
    sbSelect<SignupRow[]>("events?select=session_id,path,created_at,props&name=eq.signup&limit=20000"),
    // Journey effectiveness (PR150): impressions + clicks of the Continue-your-
    // journey placements, keyed by props.from. Fail-open — an absent stream
    // simply leaves every implemented journey in the "collecting" state.
    sbSelect<JourneyEventRow[]>(
      "events?select=name,props&name=in.(journey_next_impression,journey_next_click)&limit=20000",
    ),
  ]);
  if (pv == null) return emptyJourneys();
  return computeJourneys({ pageViews: pv ?? [], signups: su ?? [], journeyEvents: jn ?? [] }, Date.now());
}

function emptyJourneys(): JourneyAnalytics {
  return {
    configured: false,
    generatedAt: new Date().toISOString(),
    dataSince: JOURNEY_DATA_SINCE,
    kpis: { sessions: 0, explorerRate: null, avgJourneyDepth: null, conversionRate: null, avgDurationSec: null, subscribers: 0 },
    valueDiscovery: {
      sessions: 0,
      reached: 0,
      reachedPct: null,
      subscribersReached: 0,
      convReachedPct: null,
      subscribersNotReached: 0,
      convNotReachedPct: null,
      liftX: null,
      flagshipLabels: FLAGSHIP_PAGES.map(prettyPath),
    },
    morningSummary: { sessions: 0, subscribers: 0, conversionPct: null, bullets: [] },
    opportunities: [],
    pageHealth: [],
    wins: { topConvertingPage: null, bestOnward: null, strongestJourney: null, biggestImprovement: null },
    comparisons: [],
    exitOutcomes: {
      total: 0,
      successful: 0,
      neutral: 0,
      lost: 0,
      successfulPct: null,
      neutralPct: null,
      lostPct: null,
      memberDetection: false,
      subscribersKnown: 0,
    },
    funnel: [],
    landings: [],
    topJourneys: [],
    bestJourneys: [],
    conversionPages: [],
    timeToSubscribe: { converters: 0, avgPages: null, medianPages: null, avgMinutes: null, medianMinutes: null },
    exits: [],
    transitions: [],
    discovery: [],
    segments: [],
    sankey: { nodes: [], links: [] },
    acquisition: { collecting: true, since: JOURNEY_DATA_SINCE, sessionsWithEntryContext: 0, channels: [] },
    insights: [],
  };
}

// Pure, deterministic core — testable against a fixture with a fixed `now`.
export function computeJourneys(input: JourneyInput, now: number): JourneyAnalytics {
  const generatedAt = new Date(now).toISOString();

  // ── Signup index: conversion timing, attribution page, and known members ────
  // A session "converted" if a signup carried its session_id. We also learn WHEN
  // (earliest signup ts in the session → time-to-subscribe), WHICH PAGE persuaded
  // (signup path / props.source → attribution), and WHICH VISITORS are members
  // (earliest signup ts per visitor id → neutral-exit detection later).
  const signupTsBySession = new Map<string, number>(); // sessionId → earliest signup ts (Infinity if untimed)
  const subscriberFirstTs = new Map<string, number>(); // visitorId → earliest signup ts
  const attribution = new Map<string, number>(); // path → signups attributed
  for (const s of input.signups) {
    const ts = s.created_at ? Date.parse(s.created_at) : NaN;
    if (s.session_id) {
      const t = Number.isNaN(ts) ? Infinity : ts;
      const prev = signupTsBySession.get(s.session_id);
      if (prev == null || t < prev) signupTsBySession.set(s.session_id, t);
    }
    const p = normPath(s.path ?? propStr(s.props, "source"));
    if (p) attribution.set(p, (attribution.get(p) ?? 0) + 1);
    const vid = propStr(s.props, "visitorId");
    if (vid && !Number.isNaN(ts)) {
      const prev = subscriberFirstTs.get(vid);
      if (prev == null || ts < prev) subscriberFirstTs.set(vid, ts);
    }
  }
  const convertedIds = new Set<string>(signupTsBySession.keys());

  // ── Reconstruct sessions from the page_view stream ──────────────────────────
  const rowsBySession = new Map<string, EventRow[]>();
  for (const r of input.pageViews) {
    if (!r.session_id || !normPath(r.path)) continue;
    (rowsBySession.get(r.session_id) ?? rowsBySession.set(r.session_id, []).get(r.session_id)!).push(r);
  }

  const sessions: Session[] = [];
  for (const [id, rows] of rowsBySession) {
    rows.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    const seq: string[] = [];
    const unique = new Set<string>();
    let isNew = false;
    let visitorId: string | null = null;
    let referrer: string | null = null;
    let utmSource: string | null = null;
    for (const r of rows) {
      const p = normPath(r.path)!;
      if (seq[seq.length - 1] !== p) seq.push(p); // collapse consecutive dupes
      unique.add(p);
      if (r.is_new) isNew = true;
      if (visitorId == null) visitorId = propStr(r.props, "visitorId");
      if (referrer == null) referrer = propStr(r.props, "referrer");
      if (utmSource == null) utmSource = propStr(r.props, "utm_source");
    }
    if (!seq.length) continue;
    const firstTs = Date.parse(rows[0].created_at);
    const lastTs = Date.parse(rows[rows.length - 1].created_at);
    const converted = convertedIds.has(id);

    // Time-to-subscribe: unique pages seen up to the signup, and entry→signup span.
    let pagesBeforeConvert: number | null = null;
    let secondsToConvert: number | null = null;
    if (converted) {
      const convTs = signupTsBySession.get(id)!;
      const seenUpTo = new Set<string>();
      for (const r of rows) {
        if (convTs === Infinity || Date.parse(r.created_at) <= convTs) seenUpTo.add(normPath(r.path)!);
      }
      pagesBeforeConvert = Math.max(1, seenUpTo.size);
      if (Number.isFinite(convTs)) secondsToConvert = Math.max(0, (convTs - firstTs) / 1000);
    }

    sessions.push({
      id,
      seq,
      unique,
      firstTs,
      lastTs,
      isNew,
      converted,
      outcome: "lost", // set below, once member detection is known
      reachedFlagship: [...unique].some((p) => FLAGSHIP_SET.has(p)),
      visitorId,
      pagesBeforeConvert,
      secondsToConvert,
      referrer,
      utmSource,
    });
  }

  // ── Classify every session's outcome ────────────────────────────────────────
  // successful = subscribed in-session · neutral = a member (subscribed earlier)
  // simply browsing · lost = left without ever subscribing.
  for (const s of sessions) {
    if (s.converted) s.outcome = "successful";
    else if (s.visitorId && (subscriberFirstTs.get(s.visitorId) ?? Infinity) < s.firstTs) s.outcome = "neutral";
    else s.outcome = "lost";
  }

  const N = sessions.length;

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const explorers = sessions.filter((s) => s.unique.size >= 3).length;
  const depthSum = sessions.reduce((a, s) => a + s.unique.size, 0);
  const converters = sessions.filter((s) => s.converted).length;
  const durationSum = sessions.reduce((a, s) => a + Math.max(0, s.lastTs - s.firstTs), 0);
  const kpis: JourneyKpis = {
    sessions: N,
    explorerRate: pct(explorers, N),
    avgJourneyDepth: N ? round1(depthSum / N) : null,
    conversionRate: pct(converters, N),
    avgDurationSec: N ? Math.round(durationSum / N / 1000) : null,
    subscribers: converters,
  };

  // ── Exit outcomes — the founder KPI ─────────────────────────────────────────
  const successful = sessions.filter((s) => s.outcome === "successful").length;
  const neutral = sessions.filter((s) => s.outcome === "neutral").length;
  const lost = sessions.filter((s) => s.outcome === "lost").length;
  const exitOutcomes: ExitOutcomes = {
    total: N,
    successful,
    neutral,
    lost,
    successfulPct: pct(successful, N),
    neutralPct: pct(neutral, N),
    lostPct: pct(lost, N),
    memberDetection: subscriberFirstTs.size > 0,
    subscribersKnown: subscriberFirstTs.size,
  };

  // ── Depth funnel ──────────────────────────────────────────────────────────
  const atLeast = (n: number) => sessions.filter((s) => s.unique.size >= n).length;
  const funnel: FunnelStep[] = [
    { label: "Viewed a page", count: N, pct: pct(N, N) ?? 0 },
    { label: "Viewed 2+ pages", count: atLeast(2), pct: pct(atLeast(2), N) ?? 0 },
    { label: "Viewed 3+ pages (explorer)", count: atLeast(3), pct: pct(atLeast(3), N) ?? 0 },
    { label: "Viewed 5+ pages", count: atLeast(5), pct: pct(atLeast(5), N) ?? 0 },
    { label: "Subscribed", count: converters, pct: pct(converters, N) ?? 0 },
  ];

  // ── Landing page effectiveness ──────────────────────────────────────────────
  const byLanding = new Map<string, Session[]>();
  for (const s of sessions) (byLanding.get(s.seq[0]) ?? byLanding.set(s.seq[0], []).get(s.seq[0])!).push(s);
  const landings: LandingRow[] = [...byLanding.entries()]
    .map(([path, ss]) => {
      const deeper = ss.filter((s) => s.unique.size >= 2).length;
      const subs = ss.filter((s) => s.converted).length;
      const pagesSum = ss.reduce((a, s) => a + s.unique.size, 0);
      const durSum = ss.reduce((a, s) => a + Math.max(0, s.lastTs - s.firstTs), 0);
      return {
        path,
        label: prettyPath(path),
        sessions: ss.length,
        wentDeeperPct: pct(deeper, ss.length),
        subscribedPct: pct(subs, ss.length),
        avgPages: ss.length ? round1(pagesSum / ss.length) : null,
        avgDurationSec: ss.length ? Math.round(durSum / ss.length / 1000) : null,
      };
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8);

  // ── Journeys (ordered path sequences), reused for "top" and "best converting" ─
  const MAX_STEPS = 5;
  const journeyMap = new Map<string, { count: number; conv: number; steps: string[]; truncated: boolean }>();
  for (const s of sessions) {
    const truncated = s.seq.length > MAX_STEPS;
    const steps = s.seq.slice(0, MAX_STEPS);
    const key = steps.join(">") + (truncated ? ">…" : "");
    const e = journeyMap.get(key) ?? { count: 0, conv: 0, steps, truncated };
    e.count += 1;
    if (s.converted) e.conv += 1;
    journeyMap.set(key, e);
  }
  const toJourneyPath = (e: { count: number; conv: number; steps: string[]; truncated: boolean }): JourneyPath => ({
    steps: e.steps.map(prettyPath),
    count: e.count,
    pct: pct(e.count, N) ?? 0,
    conversionPct: pct(e.conv, e.count),
    truncated: e.truncated,
  });
  const topJourneys: JourneyPath[] = [...journeyMap.values()].sort((a, b) => b.count - a.count).slice(0, 10).map(toJourneyPath);

  // Best-converting journeys: highest conversion rate, with a minimum sample so a
  // single 1/1 = 100% path can't masquerade as a pattern. Falls back to the
  // largest sample available if the data is still small.
  const MIN_CONV_SAMPLE = Math.max(3, Math.min(8, Math.round(N / 100)));
  const bestJourneys: JourneyPath[] = [...journeyMap.values()]
    .filter((e) => e.conv > 0 && e.count >= MIN_CONV_SAMPLE)
    .sort((a, b) => b.conv / b.count - a.conv / a.count || b.count - a.count)
    .slice(0, 6)
    .map(toJourneyPath);

  // ── Conversion attribution — which page did the persuading ──────────────────
  const totalAttributed = [...attribution.values()].reduce((a, b) => a + b, 0);
  const conversionPages: ConversionPageRow[] = [...attribution.entries()]
    .map(([path, n]) => ({ path, label: prettyPath(path), subscribers: n, pct: pct(n, totalAttributed) }))
    .sort((a, b) => b.subscribers - a.subscribers)
    .slice(0, 10);

  // ── Time to subscribe ───────────────────────────────────────────────────────
  const convSessions = sessions.filter((s) => s.converted);
  const pagesArr = convSessions.map((s) => s.pagesBeforeConvert).filter((x): x is number => x != null);
  const minsArr = convSessions.map((s) => s.secondsToConvert).filter((x): x is number => x != null).map((x) => x / 60);
  const timeToSubscribe: TimeToSubscribe = {
    converters: convSessions.length,
    avgPages: mean1(pagesArr),
    medianPages: median1(pagesArr),
    avgMinutes: mean1(minsArr),
    medianMinutes: median1(minsArr),
  };

  // ── Exit analysis (now with conversion outcome per page) ────────────────────
  const viewsByPage = new Map<string, number>();
  const exitAgg = new Map<string, { exits: number; subscribed: number; depthSum: number; timeSum: number }>();
  for (const s of sessions) {
    for (const p of s.unique) viewsByPage.set(p, (viewsByPage.get(p) ?? 0) + 1);
    const exit = s.seq[s.seq.length - 1];
    const e = exitAgg.get(exit) ?? { exits: 0, subscribed: 0, depthSum: 0, timeSum: 0 };
    e.exits += 1;
    if (s.converted) e.subscribed += 1;
    e.depthSum += s.unique.size;
    e.timeSum += Math.max(0, s.lastTs - s.firstTs);
    exitAgg.set(exit, e);
  }
  const exits: ExitRow[] = [...exitAgg.entries()]
    .map(([path, e]) => ({
      path,
      label: prettyPath(path),
      exits: e.exits,
      subscribed: e.subscribed,
      lost: e.exits - e.subscribed,
      successPct: pct(e.subscribed, e.exits),
      exitRatePct: pct(e.exits, viewsByPage.get(path) ?? e.exits),
      avgDepthBeforeExit: e.exits ? round1(e.depthSum / e.exits) : null,
      avgTimeBeforeExitSec: e.exits ? Math.round(e.timeSum / e.exits / 1000) : null,
    }))
    .sort((a, b) => b.exits - a.exits)
    .slice(0, 8);

  // ── Internal navigation transitions (inferred from consecutive views) ───────
  const fromAgg = new Map<string, { views: number; exited: number; to: Map<string, number> }>();
  for (const s of sessions) {
    for (let i = 0; i < s.seq.length; i++) {
      const from = s.seq[i];
      const agg = fromAgg.get(from) ?? { views: 0, exited: 0, to: new Map() };
      agg.views += 1;
      if (i === s.seq.length - 1) agg.exited += 1;
      else {
        const to = s.seq[i + 1];
        agg.to.set(to, (agg.to.get(to) ?? 0) + 1);
      }
      fromAgg.set(from, agg);
    }
  }
  const transitions: TransitionFrom[] = [...fromAgg.entries()]
    .sort((a, b) => b[1].views - a[1].views)
    .slice(0, 6)
    .map(([path, agg]) => ({
      path,
      label: prettyPath(path),
      views: agg.views,
      exitedPct: pct(agg.exited, agg.views) ?? 0,
      targets: [...agg.to.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([to, n]) => ({ path: to, label: prettyPath(to), pct: pct(n, agg.views) ?? 0 })),
    }));

  // ── Discovery matrix (landing → most common 2nd → 3rd) ──────────────────────
  const discovery: DiscoveryRow[] = landings.slice(0, 6).map((l) => {
    const ss = byLanding.get(l.path) ?? [];
    const seconds = new Map<string, number>();
    for (const s of ss) if (s.seq[1]) seconds.set(s.seq[1], (seconds.get(s.seq[1]) ?? 0) + 1);
    const second = topKey(seconds);
    const thirds = new Map<string, number>();
    for (const s of ss) if (s.seq[1] === second && s.seq[2]) thirds.set(s.seq[2], (thirds.get(s.seq[2]) ?? 0) + 1);
    const third = topKey(thirds);
    return {
      landing: l.path,
      landingLabel: l.label,
      second,
      secondLabel: second ? prettyPath(second) : null,
      third,
      thirdLabel: third ? prettyPath(third) : null,
    };
  });

  // ── First-visit vs returning ────────────────────────────────────────────────
  const seg = (label: string, ss: Session[]): SegmentDepth => ({
    label,
    sessions: ss.length,
    avgDepth: ss.length ? round1(ss.reduce((a, s) => a + s.unique.size, 0) / ss.length) : null,
    conversionPct: pct(ss.filter((s) => s.converted).length, ss.length),
  });
  const segments: SegmentDepth[] = [
    seg("First visit", sessions.filter((s) => s.isNew)),
    seg("Returning", sessions.filter((s) => !s.isNew)),
  ];

  // ── Sankey: entry → 2nd → 3rd → outcome ─────────────────────────────────────
  const sankey = buildSankey(sessions);

  // ── Acquisition (channel) — depends on new instrumentation ──────────────────
  const withEntry = sessions.filter((s) => s.referrer || s.utmSource);
  const channelMap = new Map<string, { sessions: number; conv: number }>();
  for (const s of withEntry) {
    const label = s.utmSource ? `utm: ${s.utmSource}` : channelFromReferrer(s.referrer!);
    const c = channelMap.get(label) ?? { sessions: 0, conv: 0 };
    c.sessions += 1;
    if (s.converted) c.conv += 1;
    channelMap.set(label, c);
  }
  const acquisition: AcquisitionState = {
    collecting: withEntry.length < 30, // too little to be meaningful yet → show the honest note
    since: JOURNEY_DATA_SINCE,
    sessionsWithEntryContext: withEntry.length,
    channels: [...channelMap.entries()]
      .map(([label, c]) => ({ label, sessions: c.sessions, conversionPct: pct(c.conv, c.sessions) }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 8),
  };

  // ── Value Discovery Rate — the true North Star ──────────────────────────────
  // Did visitors reach a flagship page (our best work) before deciding? And does
  // reaching one actually convert them? The lift is the whole argument for
  // guiding people into flagship content.
  const reachedSessions = sessions.filter((s) => s.reachedFlagship);
  const notReached = sessions.filter((s) => !s.reachedFlagship);
  const subsReached = reachedSessions.filter((s) => s.converted).length;
  const subsNotReached = notReached.filter((s) => s.converted).length;
  const convReachedPct = pct(subsReached, reachedSessions.length);
  const convNotReachedPct = pct(subsNotReached, notReached.length);
  const valueDiscovery: ValueDiscovery = {
    sessions: N,
    reached: reachedSessions.length,
    reachedPct: pct(reachedSessions.length, N),
    subscribersReached: subsReached,
    convReachedPct,
    subscribersNotReached: subsNotReached,
    convNotReachedPct,
    liftX: convReachedPct != null && convNotReachedPct != null && convNotReachedPct > 0 ? round1(convReachedPct / convNotReachedPct) : null,
    flagshipLabels: FLAGSHIP_PAGES.map(prettyPath),
  };

  // ── Per-page aggregates (health + opportunities read from these) ────────────
  const pageAgg = new Map<string, { viewed: number; converted: number; depthSum: number; durSum: number }>();
  for (const s of sessions) {
    const dur = Math.max(0, s.lastTs - s.firstTs);
    for (const p of s.unique) {
      const a = pageAgg.get(p) ?? { viewed: 0, converted: 0, depthSum: 0, durSum: 0 };
      a.viewed += 1;
      if (s.converted) a.converted += 1;
      a.depthSum += s.unique.size;
      a.durSum += dur;
      pageAgg.set(p, a);
    }
  }
  const pageOnwardPct = (p: string): number | null => {
    const viewed = pageAgg.get(p)?.viewed ?? 0;
    if (!viewed) return null;
    const ex = exitAgg.get(p)?.exits ?? 0;
    return pct(viewed - ex, viewed);
  };
  const pageSubRate = (p: string): number | null => pct(pageAgg.get(p)?.converted ?? 0, pageAgg.get(p)?.viewed ?? 0);
  const pageExitSuccess = (p: string): number | null => {
    const e = exitAgg.get(p);
    return e ? pct(e.subscribed, e.exits) : null;
  };

  // ── Page Health — a composite "healthy vs needs work" score ─────────────────
  // Fixed, documented caps so the score is consistent over time (not relative to
  // today's best page). Weights: subscribe .30 · onward .25 · exit-success .20 ·
  // depth .15 · engagement .10. The formula matters less than staying comparable.
  const pageHealth: PageHealthRow[] = [...pageAgg.entries()]
    .filter(([, a]) => a.viewed >= 5)
    .map(([p, a]) => {
      const subRate = pageSubRate(p) ?? 0;
      const onward = pageOnwardPct(p) ?? 0;
      const exitSuccess = pageExitSuccess(p);
      const exitsHere = exitAgg.get(p)?.exits ?? 0;
      const avgDepth = round1(a.depthSum / a.viewed);
      const avgSec = Math.round(a.durSum / a.viewed / 1000);
      const subN = Math.min(1, subRate / 15);
      const onwardN = onward / 100;
      // Exit quality only matters when a page is actually an exit. A page people
      // almost always navigate onward from has few exits — that's healthy, so
      // treat its exit quality as neutral rather than penalising the empty case.
      const exitN = exitsHere < 5 || exitSuccess == null ? 0.5 : Math.min(1, exitSuccess / 20);
      const depthN = Math.min(1, Math.max(0, (avgDepth - 1) / 4));
      const engN = Math.min(1, avgSec / 240);
      const score = Math.round(100 * (0.3 * subN + 0.25 * onwardN + 0.2 * exitN + 0.15 * depthN + 0.1 * engN));
      return {
        path: p,
        label: prettyPath(p),
        score,
        band: (score >= 75 ? "healthy" : score >= 50 ? "ok" : "needs-work") as PageHealthRow["band"],
        sessions: a.viewed,
        subscribeRatePct: pageSubRate(p),
        onwardPct: pageOnwardPct(p),
        exitSuccessPct: pageExitSuccess(p),
        avgDepth,
        avgDurationSec: avgSec,
        confidence: confidenceFromSample(a.viewed),
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // ── Growth Opportunities — the ranked backlog, with a MODELED impact ────────
  // Impact chain (deliberately conservative, labelled as an estimate):
  //   monthly lost exits × onward headroom × the rate flagship-reachers convert.
  // i.e. of the visitors this page loses each month, the share we could plausibly
  // route onward, times how often routed visitors actually subscribe.
  const spanDays = Math.max(1, (Math.max(...sessions.map((s) => s.firstTs)) - Math.min(...sessions.map((s) => s.firstTs))) / 86_400_000);
  const flagshipConvFrac = (convReachedPct ?? kpis.conversionRate ?? 0) / 100;
  const onwardValues = [...pageAgg.entries()].filter(([, a]) => a.viewed >= 10).map(([p]) => pageOnwardPct(p) ?? 0);
  const benchmarkOnward = Math.min(85, Math.max(70, onwardValues.length ? Math.max(...onwardValues) : 70));

  const leaky = [...exitAgg.entries()]
    .map(([p, e]) => {
      const lost = e.exits - e.subscribed;
      const monthlyLost = (lost * 30) / spanDays;
      const onward = pageOnwardPct(p) ?? 0;
      const headroom = Math.max(0, (benchmarkOnward - onward) / 100);
      const est = Math.round(monthlyLost * headroom * flagshipConvFrac);
      return { path: p, lost, monthlyLost, onward, headroom, est, exits: e.exits, subscribed: e.subscribed };
    })
    .filter((o) => o.lost >= 5 && o.est > 0)
    .sort((a, b) => b.est - a.est);

  // Journey effectiveness per placement page (from journey_next events; the
  // props.from of a placement is its page path). Fail-open: no events means
  // every implemented journey reads as "collecting".
  const journeyAgg = new Map<string, { impressions: number; clicks: number }>();
  for (const ev of input.journeyEvents ?? []) {
    const from = typeof ev.props?.from === "string" ? ev.props.from : null;
    if (!from) continue;
    const agg = journeyAgg.get(from) ?? { impressions: 0, clicks: 0 };
    if (ev.name === "journey_next_impression") agg.impressions++;
    else if (ev.name === "journey_next_click") agg.clicks++;
    journeyAgg.set(from, agg);
  }
  const lifecycleNoteFor = (lifecycle: OppLifecycle, j: { impressions: number; clicks: number }): string => {
    if (lifecycle === "not_implemented") return "Not implemented — no Continue-your-journey placement on this page yet.";
    if (lifecycle === "collecting")
      return `Implemented — collecting evidence (${j.impressions.toLocaleString()} journey impression${j.impressions === 1 ? "" : "s"} so far; recommendations update as behavioural data accrues).`;
    const ctr = j.impressions > 0 ? Math.round((j.clicks / j.impressions) * 100) : 0;
    return `Monitoring effectiveness — ${ctr}% of ${j.impressions.toLocaleString()} journey impressions follow a hand-off.`;
  };

  const topEst = leaky[0]?.est ?? 0;
  const opportunities: GrowthOpportunity[] = leaky.slice(0, 5).map((o) => {
    const leavePct = Math.round(100 - o.onward);
    const subRate = pageSubRate(o.path) ?? 0;
    const j = journeyAgg.get(o.path) ?? { impressions: 0, clicks: 0 };
    const lifecycle = opportunityLifecycle(o.path, j.impressions);
    return {
      path: o.path,
      label: prettyPath(o.path),
      level: (o.est >= Math.max(3, 0.5 * topEst) ? "high" : "medium") as OppLevel,
      estSubsPerMonth: o.est,
      evidence: `${leavePct}% leave ${prettyPath(o.path)} without another page — about ${Math.round(o.monthlyLost).toLocaleString()} lost visitors/month.`,
      recommendation: recommendationFor({
        path: o.path,
        lifecycle,
        lowOnward: o.onward < 40,
        subRatePct: subRate,
        impressions: j.impressions,
        clicks: j.clicks,
      }),
      confidence: confidenceFromSample(o.exits),
      lifecycle,
      lifecycleNote: lifecycleNoteFor(lifecycle, j),
    };
  });
  // A healthy callout so the backlog isn't only problems — the best-scoring page.
  const healthyPage = pageHealth.find((p) => p.band === "healthy" && p.confidence !== "low");
  if (healthyPage)
    opportunities.push({
      path: healthyPage.path,
      label: healthyPage.label,
      level: "healthy",
      estSubsPerMonth: 0,
      evidence: `Health ${healthyPage.score}/100 · ${healthyPage.onwardPct ?? 0}% navigate onward, ${healthyPage.subscribeRatePct ?? 0}% subscribe.`,
      recommendation: "Healthy — no action required. Study what works here and replicate it on weaker pages.",
      confidence: healthyPage.confidence,
      lifecycle: opportunityLifecycle(healthyPage.path, journeyAgg.get(healthyPage.path)?.impressions ?? 0),
      lifecycleNote: lifecycleNoteFor(
        opportunityLifecycle(healthyPage.path, journeyAgg.get(healthyPage.path)?.impressions ?? 0),
        journeyAgg.get(healthyPage.path) ?? { impressions: 0, clicks: 0 },
      ),
    });

  // ── Wins — celebrate (and replicate) what's working ─────────────────────────
  const convCandidates = [...pageAgg.entries()].filter(([, a]) => a.viewed >= 10);
  const topConv = convCandidates
    .map(([p, a]) => ({ label: prettyPath(p), pct: pageSubRate(p) ?? 0, sample: a.viewed }))
    .sort((a, b) => b.pct - a.pct)[0];
  const bestOnwardPage = convCandidates
    .map(([p, a]) => ({ label: prettyPath(p), pct: pageOnwardPct(p) ?? 0, sample: a.viewed }))
    .sort((a, b) => b.pct - a.pct)[0];

  // ── Period comparisons — is optimisation working? ───────────────────────────
  const DAY = 86_400_000;
  const windowMetrics = (fromTs: number, toTs: number): PeriodMetrics => {
    const ss = sessions.filter((s) => s.firstTs >= fromTs && s.firstTs < toTs);
    const n = ss.length;
    const conv = ss.filter((s) => s.converted).length;
    return {
      sessions: n,
      explorerRate: pct(ss.filter((s) => s.unique.size >= 3).length, n),
      valueDiscoveryRate: pct(ss.filter((s) => s.reachedFlagship).length, n),
      conversionRate: pct(conv, n),
      avgDepth: n ? round1(ss.reduce((a, s) => a + s.unique.size, 0) / n) : null,
      lostPct: pct(ss.filter((s) => s.outcome === "lost").length, n),
      subscribers: conv,
    };
  };
  const comparisons: PeriodComparison[] = [
    { label: "Today vs yesterday", current: windowMetrics(now - DAY, now), previous: windowMetrics(now - 2 * DAY, now - DAY) },
    { label: "Last 7 days vs previous 7", current: windowMetrics(now - 7 * DAY, now), previous: windowMetrics(now - 14 * DAY, now - 7 * DAY) },
    { label: "Last 30 days vs previous 30", current: windowMetrics(now - 30 * DAY, now), previous: windowMetrics(now - 60 * DAY, now - 30 * DAY) },
  ];

  // Biggest improvement — the metric that moved up most over the 7-day window.
  const wk = comparisons[1];
  const movers: { metric: string; from: number | null; to: number | null; delta: number }[] = [
    { metric: "Explorer Rate", from: wk.previous.explorerRate, to: wk.current.explorerRate, delta: (wk.current.explorerRate ?? 0) - (wk.previous.explorerRate ?? 0) },
    { metric: "Value Discovery Rate", from: wk.previous.valueDiscoveryRate, to: wk.current.valueDiscoveryRate, delta: (wk.current.valueDiscoveryRate ?? 0) - (wk.previous.valueDiscoveryRate ?? 0) },
    { metric: "Conversion", from: wk.previous.conversionRate, to: wk.current.conversionRate, delta: (wk.current.conversionRate ?? 0) - (wk.previous.conversionRate ?? 0) },
  ].sort((a, b) => b.delta - a.delta);
  const biggestImprovement = movers[0]?.delta > 0 && wk.previous.sessions >= 5 ? { metric: movers[0].metric, from: movers[0].from, to: movers[0].to } : null;

  const wins: Wins = {
    topConvertingPage: topConv && topConv.pct > 0 ? { label: topConv.label, pct: topConv.pct, sample: topConv.sample, confidence: confidenceFromSample(topConv.sample) } : null,
    bestOnward: bestOnwardPage && bestOnwardPage.pct > 0 ? { label: bestOnwardPage.label, pct: bestOnwardPage.pct, sample: bestOnwardPage.sample } : null,
    strongestJourney: bestJourneys[0] ?? null,
    biggestImprovement,
  };

  // ── Morning summary — the 20-second executive read ──────────────────────────
  const topOpp = opportunities.find((o) => o.level !== "healthy");
  const bullets: string[] = [];
  if (valueDiscovery.reachedPct != null)
    bullets.push(
      `${valueDiscovery.reachedPct}% reached flagship content${valueDiscovery.liftX != null ? ` — and they convert ${valueDiscovery.liftX}× more often (${valueDiscovery.convReachedPct}% vs ${valueDiscovery.convNotReachedPct}%)` : ""}.`,
    );
  if (kpis.explorerRate != null) bullets.push(`Explorer Rate is ${kpis.explorerRate}% — earning a second click stays the core challenge.`);
  if (conversionPages[0]?.pct != null) bullets.push(`${conversionPages[0].label} drives ${conversionPages[0].pct}% of all subscriptions.`);
  if (topOpp) bullets.push(`Biggest opportunity: ${topOpp.label} — an estimated +${topOpp.estSubsPerMonth} subscribers/month if improved.`);
  if (biggestImprovement) bullets.push(`Improving: ${biggestImprovement.metric} ${biggestImprovement.from ?? 0}% → ${biggestImprovement.to ?? 0}% week on week.`);
  const morningSummary: MorningSummary = { sessions: N, subscribers: kpis.subscribers, conversionPct: kpis.conversionRate, bullets };

  // ── Deterministic, evidence-backed founder insights (categorised) ───────────
  const insights = buildInsights({ sessions, kpis, exitOutcomes, segments, conversionPages, bestJourneys, timeToSubscribe, valueDiscovery, opportunities, comparisons });

  return {
    configured: true,
    generatedAt,
    dataSince: JOURNEY_DATA_SINCE,
    kpis,
    valueDiscovery,
    morningSummary,
    opportunities,
    pageHealth,
    wins,
    comparisons,
    exitOutcomes,
    funnel,
    landings,
    topJourneys,
    bestJourneys,
    conversionPages,
    timeToSubscribe,
    exits,
    transitions,
    discovery,
    segments,
    sankey,
    acquisition,
    insights,
  };
}

function topKey(m: Map<string, number>): string | null {
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of m) if (n > bestN) ((best = k), (bestN = n));
  return best;
}

function channelFromReferrer(ref: string): string {
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    if (/google\./.test(h)) return "Google";
    if (/(t\.co|twitter|x\.com)/.test(h)) return "X / Twitter";
    if (/(facebook|instagram|fb\.|meta\.)/.test(h)) return "Meta";
    if (/youtube|youtu\.be/.test(h)) return "YouTube";
    if (/linkedin/.test(h)) return "LinkedIn";
    if (/reddit/.test(h)) return "Reddit";
    if (/bing\./.test(h)) return "Bing";
    return h;
  } catch {
    return "referral";
  }
}

// Cap the Sankey to the busiest nodes per column so it stays readable.
function buildSankey(sessions: Session[]): { nodes: SankeyNode[]; links: SankeyLink[] } {
  if (!sessions.length) return { nodes: [], links: [] };
  const TOP = 5;
  const colCount = [new Map<string, number>(), new Map<string, number>(), new Map<string, number>()];
  for (const s of sessions) {
    for (let c = 0; c < 3; c++) {
      const p = s.seq[c];
      if (p) colCount[c].set(p, (colCount[c].get(p) ?? 0) + 1);
    }
  }
  const topOf = (m: Map<string, number>) =>
    new Set([...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP).map(([k]) => k));
  const keep = colCount.map(topOf);

  const nodeId = (col: number, path: string) => `c${col}:${path}`;
  const nodes = new Map<string, SankeyNode>();
  const addNode = (col: number, path: string) => {
    const id = nodeId(col, path);
    if (!nodes.has(id)) nodes.set(id, { id, label: prettyPath(path), col });
    return id;
  };
  const linkMap = new Map<string, number>();
  const addLink = (src: string, tgt: string) => linkMap.set(`${src}|${tgt}`, (linkMap.get(`${src}|${tgt}`) ?? 0) + 1);

  // Outcome column (3): Subscribed | Explored on | Left
  const outcome = (s: Session): string => (s.converted ? "Subscribed" : s.unique.size >= 3 ? "Explored on" : "Left");

  for (const s of sessions) {
    const c0 = s.seq[0] && keep[0].has(s.seq[0]) ? s.seq[0] : "Other";
    const c1 = s.seq[1] ? (keep[1].has(s.seq[1]) ? s.seq[1] : "Other") : null;
    const c2 = s.seq[2] ? (keep[2].has(s.seq[2]) ? s.seq[2] : "Other") : null;
    const n0 = addNode(0, c0);
    if (c1) {
      const n1 = addNode(1, c1);
      addLink(n0, n1);
      if (c2) {
        const n2 = addNode(2, c2);
        addLink(n1, n2);
        const o = `out:${outcome(s)}`;
        if (!nodes.has(o)) nodes.set(o, { id: o, label: outcome(s), col: 3 });
        addLink(n2, o);
      } else {
        const o = `out:${outcome(s)}`;
        if (!nodes.has(o)) nodes.set(o, { id: o, label: outcome(s), col: 3 });
        addLink(n1, o);
      }
    } else {
      const o = `out:${outcome(s)}`;
      if (!nodes.has(o)) nodes.set(o, { id: o, label: outcome(s), col: 3 });
      addLink(n0, o);
    }
  }
  const links: SankeyLink[] = [...linkMap.entries()].map(([k, value]) => {
    const [source, target] = k.split("|");
    return { source, target, value };
  });
  return { nodes: [...nodes.values()], links };
}

function buildInsights(d: {
  sessions: Session[];
  kpis: JourneyKpis;
  exitOutcomes: ExitOutcomes;
  segments: SegmentDepth[];
  conversionPages: ConversionPageRow[];
  bestJourneys: JourneyPath[];
  timeToSubscribe: TimeToSubscribe;
  valueDiscovery: ValueDiscovery;
  opportunities: GrowthOpportunity[];
  comparisons: PeriodComparison[];
}): JourneyInsight[] {
  const out: JourneyInsight[] = [];
  const N = d.sessions.length;
  const MIN = 20; // don't call a pattern on a tiny sample
  if (N < MIN) {
    out.push({ tone: "info", category: "monitor", text: "Not enough sessions yet to surface journey patterns — insights appear as traffic accrues.", confidence: "low" });
    return out;
  }

  // 🚨 IMMEDIATE ACTION — the top modeled opportunity leads.
  const topOpp = d.opportunities.find((o) => o.level !== "healthy");
  if (topOpp)
    out.push({
      tone: "warn",
      category: "action",
      text: `Improve ${topOpp.label} onward navigation — ${topOpp.evidence} ${topOpp.recommendation}`,
      confidence: topOpp.confidence,
      impact: `+${topOpp.estSubsPerMonth} subscribers/month`,
    });

  // 🚨 / ⚠ Value discovery — the North Star framing.
  const vd = d.valueDiscovery;
  if (vd.reachedPct != null) {
    const low = vd.reachedPct < 50;
    out.push({
      tone: low ? "warn" : "good",
      category: low ? "action" : "good",
      text: low
        ? `Only ${vd.reachedPct}% of visitors reach flagship content${vd.liftX != null ? `, yet those who do convert ${vd.liftX}× more often (${vd.convReachedPct}% vs ${vd.convNotReachedPct}%)` : ""}. Getting more visitors into flagship pages is the single biggest lever on conversion.`
        : `${vd.reachedPct}% of visitors reach flagship content${vd.liftX != null ? ` and convert ${vd.liftX}× more often for it` : ""} — value discovery is working. Keep widening the funnel into flagship pages.`,
      confidence: confidenceFromSample(vd.reached),
    });
  }

  // ⚠ MONITOR — returning-visitor depth not yet deepening.
  const first = d.segments.find((s) => s.label === "First visit");
  const ret = d.segments.find((s) => s.label === "Returning");
  if (first?.avgDepth != null && ret?.avgDepth != null && ret.sessions >= MIN && ret.avgDepth <= first.avgDepth)
    out.push({
      tone: "info",
      category: "monitor",
      text: `Returning visitors aren't yet going deeper than first-timers (${ret.avgDepth} vs ${first.avgDepth} pages). No immediate action — watch whether the habit builds as content accrues.`,
      confidence: confidenceFromSample(ret.sessions),
    });

  // ⚠ MONITOR — a metric deteriorating week-on-week.
  const wk = d.comparisons.find((c) => c.label.startsWith("Last 7"));
  if (wk && wk.previous.sessions >= 10 && wk.current.conversionRate != null && wk.previous.conversionRate != null && wk.current.conversionRate < wk.previous.conversionRate - 1)
    out.push({
      tone: "warn",
      category: "monitor",
      text: `Conversion slipped this week (${wk.previous.conversionRate}% → ${wk.current.conversionRate}%). Worth watching before acting — could be traffic mix.`,
      confidence: confidenceFromSample(wk.current.sessions),
    });

  // ✅ WORKING WELL — the page doing the persuading.
  const topConv = d.conversionPages[0];
  if (topConv && topConv.subscribers >= 5)
    out.push({
      tone: "good",
      category: "good",
      text: `${topConv.label} is where most subscriptions happen (${topConv.subscribers.toLocaleString()} signups, ${topConv.pct ?? 0}% of all conversions). Protect this experience and reuse what works there elsewhere.`,
      confidence: confidenceFromSample(topConv.subscribers),
    });

  // ✅ WORKING WELL — depth → conversion lift.
  const oneP = d.sessions.filter((s) => s.unique.size === 1);
  const threeP = d.sessions.filter((s) => s.unique.size >= 3);
  const cOne = pct(oneP.filter((s) => s.converted).length, oneP.length);
  const cThree = pct(threeP.filter((s) => s.converted).length, threeP.length);
  if (threeP.length >= MIN && cThree != null && cOne != null && cOne > 0) {
    const mult = round1(cThree / cOne);
    if (mult >= 1.5)
      out.push({
        tone: "good",
        category: "good",
        text: `Visitors who reach 3+ pages convert ${mult}× more often than single-page sessions (${cThree}% vs ${cOne}%). Earning the second click is the highest-leverage moment.`,
        confidence: confidenceFromSample(threeP.length),
      });
  }

  // ✅ WORKING WELL — strongest converting journey.
  const best = d.bestJourneys[0];
  if (best && best.conversionPct != null)
    out.push({
      tone: "good",
      category: "good",
      text: `Strongest converting journey: ${best.steps.join(" → ")} (${best.conversionPct}% of ${best.count.toLocaleString()}). Make that path easier to follow with prominent links.`,
      confidence: confidenceFromSample(best.count),
    });

  return out;
}
