// Visitor Journey Intelligence — the data engine behind /admin/journeys.
//
// This does NOT report pages; it reconstructs *journeys*. Every metric answers a
// founder question ("how do people discover the value of HalvingLens?") rather
// than "which pages got traffic?". Everything is derived from first-party events:
// a session is the ordered sequence of page_view events sharing a session_id,
// and a session "converted" if a signup event fired in the same session.
//
// Two data eras, kept honest and distinct:
//   • HISTORICAL — session_id + path + created_at have been captured for a long
//     time, so depth, funnels, journeys, exits and transitions cover full history.
//   • NEW (accruing since JOURNEY_DATA_SINCE) — anonymous visitor id + entry
//     referrer/UTM only exist from the Phase 1 instrumentation onward. Anything
//     depending on them reports "collecting since <date>", never a fabricated value.

import { sbSelect, supabaseConfigured } from "./supabase";

// The moment Phase 1 instrumentation (visitor id + entry referrer/UTM) went live
// on main (PR #97 merge, 20 Jul 2026). Widgets that need the new signals date
// their "collecting since" note from here — honest about what we can/can't yet know.
export const JOURNEY_DATA_SINCE = "2026-07-20T13:00:43Z";

const DAY = 86_400_000;

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
};

export function prettyPath(path: string): string {
  return PAGE_LABEL[path] ?? path;
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
  exitRatePct: number | null; // exits ÷ sessions that viewed the page
  avgDepthBeforeExit: number | null;
  avgTimeBeforeExitSec: number | null;
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
  text: string;
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
  funnel: FunnelStep[];
  landings: LandingRow[];
  topJourneys: JourneyPath[];
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
}

export interface JourneyInput {
  pageViews: EventRow[];
  signups: SignupRow[];
}

const pct = (num: number, den: number): number | null => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

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
  referrer: string | null;
  utmSource: string | null;
}

export async function journeyAnalytics(): Promise<JourneyAnalytics> {
  if (!supabaseConfigured) return emptyJourneys();
  const [pv, su] = await Promise.all([
    sbSelect<EventRow[]>(
      "events?select=path,session_id,is_new,created_at,props&name=eq.page_view&order=created_at.desc&limit=50000",
    ),
    sbSelect<SignupRow[]>("events?select=session_id&name=eq.signup&limit=20000"),
  ]);
  if (pv == null) return emptyJourneys();
  return computeJourneys({ pageViews: pv ?? [], signups: su ?? [] }, Date.now());
}

function emptyJourneys(): JourneyAnalytics {
  return {
    configured: false,
    generatedAt: new Date().toISOString(),
    dataSince: JOURNEY_DATA_SINCE,
    kpis: { sessions: 0, explorerRate: null, avgJourneyDepth: null, conversionRate: null, avgDurationSec: null, subscribers: 0 },
    funnel: [],
    landings: [],
    topJourneys: [],
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

  // Sessions that converted (a signup fired within them).
  const convertedIds = new Set<string>();
  for (const s of input.signups) if (s.session_id) convertedIds.add(s.session_id);

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
    let referrer: string | null = null;
    let utmSource: string | null = null;
    for (const r of rows) {
      const p = normPath(r.path)!;
      if (seq[seq.length - 1] !== p) seq.push(p); // collapse consecutive dupes
      unique.add(p);
      if (r.is_new) isNew = true;
      const props = r.props ?? {};
      if (referrer == null && typeof props.referrer === "string") referrer = props.referrer;
      if (utmSource == null && typeof props.utm_source === "string") utmSource = props.utm_source as string;
    }
    if (!seq.length) continue;
    sessions.push({
      id,
      seq,
      unique,
      firstTs: Date.parse(rows[0].created_at),
      lastTs: Date.parse(rows[rows.length - 1].created_at),
      isNew,
      converted: convertedIds.has(id),
      referrer,
      utmSource,
    });
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
    avgJourneyDepth: N ? Math.round((depthSum / N) * 10) / 10 : null,
    conversionRate: pct(converters, N),
    avgDurationSec: N ? Math.round(durationSum / N / 1000) : null,
    subscribers: converters,
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
        avgPages: ss.length ? Math.round((pagesSum / ss.length) * 10) / 10 : null,
        avgDurationSec: ss.length ? Math.round(durSum / ss.length / 1000) : null,
      };
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8);

  // ── Top journeys (ordered path sequences) ───────────────────────────────────
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
  const topJourneys: JourneyPath[] = [...journeyMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((e) => ({
      steps: e.steps.map(prettyPath),
      count: e.count,
      pct: pct(e.count, N) ?? 0,
      conversionPct: pct(e.conv, e.count),
      truncated: e.truncated,
    }));

  // ── Exit analysis ─────────────────────────────────────────────────────────
  const viewsByPage = new Map<string, number>();
  const exitAgg = new Map<string, { exits: number; depthSum: number; timeSum: number }>();
  for (const s of sessions) {
    for (const p of s.unique) viewsByPage.set(p, (viewsByPage.get(p) ?? 0) + 1);
    const exit = s.seq[s.seq.length - 1];
    const e = exitAgg.get(exit) ?? { exits: 0, depthSum: 0, timeSum: 0 };
    e.exits += 1;
    e.depthSum += s.unique.size;
    e.timeSum += Math.max(0, s.lastTs - s.firstTs);
    exitAgg.set(exit, e);
  }
  const exits: ExitRow[] = [...exitAgg.entries()]
    .map(([path, e]) => ({
      path,
      label: prettyPath(path),
      exits: e.exits,
      exitRatePct: pct(e.exits, viewsByPage.get(path) ?? e.exits),
      avgDepthBeforeExit: e.exits ? Math.round((e.depthSum / e.exits) * 10) / 10 : null,
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
    avgDepth: ss.length ? Math.round((ss.reduce((a, s) => a + s.unique.size, 0) / ss.length) * 10) / 10 : null,
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

  // ── Deterministic, evidence-backed founder insights ─────────────────────────
  const insights = buildInsights({ sessions, kpis, exits, landings, segments });

  return {
    configured: true,
    generatedAt,
    dataSince: JOURNEY_DATA_SINCE,
    kpis,
    funnel,
    landings,
    topJourneys,
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
  exits: ExitRow[];
  landings: LandingRow[];
  segments: SegmentDepth[];
}): JourneyInsight[] {
  const out: JourneyInsight[] = [];
  const N = d.sessions.length;
  const MIN = 20; // don't call a pattern on a tiny sample
  if (N < MIN) {
    out.push({ tone: "info", text: "Not enough sessions yet to surface journey patterns — insights appear as traffic accrues." });
    return out;
  }

  // North-star framing.
  if (d.kpis.explorerRate != null)
    out.push({
      tone: d.kpis.explorerRate >= 40 ? "good" : "info",
      text: `Explorer Rate is ${d.kpis.explorerRate}% — roughly ${Math.round(d.kpis.explorerRate)} of every 100 visitors explore 3+ pages. This is the engagement number to move.`,
    });

  // Flagship-pair lift: viewing both State of Bitcoin AND Historical Price Paths.
  const A = "/state-of-bitcoin";
  const B = "/historical-price-paths";
  const both = d.sessions.filter((s) => s.unique.has(A) && s.unique.has(B));
  const oneOnly = d.sessions.filter((s) => (s.unique.has(A) ? 1 : 0) + (s.unique.has(B) ? 1 : 0) === 1);
  const cBoth = pct(both.filter((s) => s.converted).length, both.length);
  const cOne = pct(oneOnly.filter((s) => s.converted).length, oneOnly.length);
  if (both.length >= MIN && cBoth != null && cOne != null && cOne > 0) {
    const mult = Math.round((cBoth / cOne) * 10) / 10;
    if (mult >= 1.5)
      out.push({
        tone: "good",
        text: `Visitors who read both State of Bitcoin and Historical Price Paths convert ${mult}× more often (${cBoth}% vs ${cOne}%) than those who view only one. Guiding people across both is a conversion lever.`,
      });
  }

  // Leaky exit: high-exit page with shallow depth.
  const leak = d.exits.find((e) => e.exits >= MIN && (e.exitRatePct ?? 0) >= 60 && (e.avgDepthBeforeExit ?? 9) <= 2);
  if (leak)
    out.push({
      tone: "warn",
      text: `${leak.label} visitors frequently leave without exploring (${leak.exitRatePct}% exit, ${leak.avgDepthBeforeExit} pages avg). Consider stronger recommendations from ${leak.label} into a flagship page.`,
    });

  // Deepest-journey landing.
  const deepest = [...d.landings].filter((l) => l.sessions >= MIN && l.avgPages != null).sort((a, b) => (b.avgPages! - a.avgPages!))[0];
  if (deepest)
    out.push({
      tone: "info",
      text: `Visitors arriving on ${deepest.label} have the deepest journeys (${deepest.avgPages} pages avg) — the strongest entry point for exploration.`,
    });

  // First vs returning depth.
  const first = d.segments.find((s) => s.label === "First visit");
  const ret = d.segments.find((s) => s.label === "Returning");
  if (first?.avgDepth != null && ret?.avgDepth != null && ret.sessions >= MIN) {
    const deeper = ret.avgDepth > first.avgDepth;
    out.push({
      tone: deeper ? "good" : "info",
      text: `Returning visitors view ${ret.avgDepth} pages vs ${first.avgDepth} on a first visit — ${deeper ? "the platform is becoming a habit." : "returning journeys aren't yet deeper; onboarding has room to build the habit."}`,
    });
  }

  return out;
}
