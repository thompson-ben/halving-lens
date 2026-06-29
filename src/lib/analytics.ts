// Server-side analytics aggregation for the internal PM dashboard. Reads from
// the first-party Supabase tables via PostgREST. All best-effort: returns nulls
// when Supabase isn't configured.

import { sbCount, sbSelect, supabaseConfigured } from "./supabase";
import { allEditions } from "./research";

// ── Founder growth dashboard (/admin/analytics) ──────────────────────────────
// A focused, fast read on what users value and where the email list grows from.

export interface LabelCount {
  label: string;
  n: number;
}

export interface GrowthDashboard {
  configured: boolean;
  totals: {
    pageViews: number;
    visitors: number; // distinct sessions
    returning: number; // sessions that aren't first-ever visits
    signups: number;
    subscribers: number | null;
  };
  windows: {
    views1: number; // last 24h ("yesterday")
    views7: number;
    views30: number;
    visitors1: number;
    signups1: number;
    signups7: number;
    signups30: number;
  };
  topPages: LabelCount[];
  topMetrics: LabelCount[]; // individual /metrics/* pages
  mostCopied: LabelCount[];
  mostDownloaded: LabelCount[];
  topSignupSources: LabelCount[];
  accumulation: {
    views: number;
    dcaChanges: number;
    timelineChanges: number;
    copies: number;
    signups: number;
    avgSeconds: number | null;
    avgScroll: number | null;
  };
  brief: { views: number; avgSeconds: number | null; avgScroll: number | null };
  research: {
    totalEditions: number;
    avgReadMin: number | null;
    views: number; // total /research* page views
    topEditions: LabelCount[];
    topShared: LabelCount[];
    topSearches: LabelCount[];
    topFeatures: LabelCount[];
  };
  email: {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number | null; // %
    failureRate: number | null; // %
    recent: { date: string; sent: number; delivered: number; failed: number }[];
  };
  trend: { date: string; views: number }[]; // last 30 days, page views/day
}

const COPY_LABEL: Record<string, string> = {
  copy_post: "X / post",
  copy_thread: "X thread",
  copy_linkedin: "LinkedIn",
  copy_instagram: "Instagram",
  copy_email: "Email",
  copy_summary: "Accumulation summary",
};

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

// Static library stats (available even without Supabase).
function editionLibrary(): { totalEditions: number; avgReadMin: number | null } {
  const eds = allEditions();
  return {
    totalEditions: eds.length,
    avgReadMin: eds.length ? Math.round(eds.reduce((s, e) => s + e.readMin, 0) / eds.length) : null,
  };
}
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export async function growthDashboard(): Promise<GrowthDashboard> {
  const empty: GrowthDashboard = {
    configured: false,
    totals: { pageViews: 0, visitors: 0, returning: 0, signups: 0, subscribers: null },
    windows: { views1: 0, views7: 0, views30: 0, visitors1: 0, signups1: 0, signups7: 0, signups30: 0 },
    topPages: [],
    topMetrics: [],
    mostCopied: [],
    mostDownloaded: [],
    topSignupSources: [],
    accumulation: { views: 0, dcaChanges: 0, timelineChanges: 0, copies: 0, signups: 0, avgSeconds: null, avgScroll: null },
    brief: { views: 0, avgSeconds: null, avgScroll: null },
    research: { ...editionLibrary(), views: 0, topEditions: [], topShared: [], topSearches: [], topFeatures: [] },
    email: { sent: 0, delivered: 0, failed: 0, deliveryRate: null, failureRate: null, recent: [] },
    trend: [],
  };
  if (!supabaseConfigured) return empty;

  const since1 = isoDaysAgo(1);
  const since7 = isoDaysAgo(7);
  const since30 = isoDaysAgo(30);

  // Page views (path, session, is_new, created_at) — drives most of the panels.
  const pv = await sbSelect<{ path: string | null; session_id: string | null; is_new: boolean | null; created_at: string }[]>(
    "events?select=path,session_id,is_new,created_at&name=eq.page_view&order=created_at.desc&limit=20000",
  );
  const pageRows = pv ?? [];

  const pageTally = new Map<string, number>();
  const trendMap = new Map<string, number>();
  const sessions = new Set<string>();
  const sessions1 = new Set<string>();
  let returning = 0;
  let views1 = 0;
  let views7 = 0;
  let views30 = 0;
  // Seed the last 30 days so the trend has no gaps.
  for (let i = 29; i >= 0; i--) trendMap.set(dayKey(isoDaysAgo(i)), 0);

  for (const r of pageRows) {
    const path = r.path ?? "—";
    pageTally.set(path, (pageTally.get(path) ?? 0) + 1);
    if (r.session_id) sessions.add(r.session_id);
    if (r.is_new === false) returning += 1;
    if (r.created_at >= since30) views30 += 1;
    if (r.created_at >= since7) views7 += 1;
    if (r.created_at >= since1) {
      views1 += 1;
      if (r.session_id) sessions1.add(r.session_id);
    }
    const dk = dayKey(r.created_at);
    if (trendMap.has(dk)) trendMap.set(dk, (trendMap.get(dk) ?? 0) + 1);
  }

  const topPagesAll = [...pageTally.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
  const topPages = topPagesAll.slice(0, 12);
  const topMetrics = topPagesAll.filter((p) => /^\/metrics\/.+/.test(p.label)).slice(0, 10);

  // Copy + download + signup + accumulation interaction events.
  const [copyRows, dlRows, signupRows, accEng, accInteract] = await Promise.all([
    sbSelect<{ name: string; created_at: string }[]>(
      "events?select=name,created_at&name=in.(copy_post,copy_thread,copy_linkedin,copy_instagram,copy_email,copy_summary)&limit=20000",
    ),
    sbSelect<{ props: Record<string, unknown> }[]>(
      "events?select=props&name=eq.content_download_card&limit=20000",
    ),
    sbSelect<{ props: Record<string, unknown>; created_at: string }[]>(
      "events?select=props,created_at&name=eq.signup&limit=20000",
    ),
    sbSelect<{ props: Record<string, unknown> }[]>(
      "events?select=props&name=eq.engagement&path=eq./accumulation&limit=20000",
    ),
    sbSelect<{ name: string }[]>(
      "events?select=name&name=in.(dca_change,timeline_range,copy_summary)&path=eq./accumulation&limit=20000",
    ),
  ]);

  const copyTally = new Map<string, number>();
  for (const r of copyRows ?? []) copyTally.set(r.name, (copyTally.get(r.name) ?? 0) + 1);
  const mostCopied = [...copyTally.entries()]
    .map(([k, n]) => ({ label: COPY_LABEL[k] ?? k, n }))
    .sort((a, b) => b.n - a.n);

  const dlTally = new Map<string, number>();
  for (const r of dlRows ?? []) {
    const card = (r.props?.card as string) ?? (r.props?.pack as string) ?? "card";
    dlTally.set(card, (dlTally.get(card) ?? 0) + 1);
  }
  const mostDownloaded = [...dlTally.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, 10);

  let signups1 = 0;
  let signups7 = 0;
  let signups30 = 0;
  for (const r of signupRows ?? []) {
    if (r.created_at >= since30) signups30 += 1;
    if (r.created_at >= since7) signups7 += 1;
    if (r.created_at >= since1) signups1 += 1;
  }

  // Top signup sources (from the subscriber table) + brief engagement + email
  // delivery history.
  const [srcRows, briefEng, deliveries] = await Promise.all([
    sbSelect<{ source: string | null }[]>("brief_subscribers?select=source&limit=20000"),
    sbSelect<{ props: Record<string, unknown> }[]>("events?select=props&name=eq.engagement&path=eq./brief&limit=20000"),
    sbSelect<{ date: string; emails_sent: number; emails_delivered: number; emails_failed: number }[]>(
      "email_deliveries?select=date,emails_sent,emails_delivered,emails_failed&order=date.desc&limit=30",
    ),
  ]);

  const srcTally = new Map<string, number>();
  for (const r of srcRows ?? []) {
    const k = (r.source && r.source.trim()) || "unknown";
    srcTally.set(k, (srcTally.get(k) ?? 0) + 1);
  }
  const topSignupSources = [...srcTally.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, 10);

  let bSec = 0;
  let bScroll = 0;
  let bN = 0;
  for (const r of briefEng ?? []) {
    const sec = Number(r.props?.seconds);
    if (Number.isFinite(sec)) {
      bSec += sec;
      bScroll += Number.isFinite(Number(r.props?.scrollPct)) ? Number(r.props?.scrollPct) : 0;
      bN += 1;
    }
  }

  let emSent = 0;
  let emDelivered = 0;
  let emFailed = 0;
  for (const d of deliveries ?? []) {
    emSent += d.emails_sent ?? 0;
    emDelivered += d.emails_delivered ?? 0;
    emFailed += d.emails_failed ?? 0;
  }
  const emailRecent = (deliveries ?? []).slice(0, 10).map((d) => ({
    date: d.date,
    sent: d.emails_sent ?? 0,
    delivered: d.emails_delivered ?? 0,
    failed: d.emails_failed ?? 0,
  }));

  // ── Research Library ──────────────────────────────────────────────────────
  const lib = editionLibrary();
  const researchViews = pageRows.filter((r) => r.path && r.path.startsWith("/research")).length;
  const edTally = new Map<string, number>();
  for (const r of pageRows) {
    if (r.path && /^\/research\/\d+$/.test(r.path)) edTally.set(r.path, (edTally.get(r.path) ?? 0) + 1);
  }
  const topEditions = [...edTally.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, 10);

  const [shareRows, searchRows, rFilterRows] = await Promise.all([
    sbSelect<{ props: Record<string, unknown> }[]>("events?select=props&name=eq.research_share&limit=20000"),
    sbSelect<{ props: Record<string, unknown> }[]>("events?select=props&name=eq.research_search&limit=20000"),
    sbSelect<{ props: Record<string, unknown> }[]>("events?select=props&name=eq.research_filter&limit=20000"),
  ]);
  const tallyProp = (rows: { props: Record<string, unknown> }[] | null, key: string): LabelCount[] => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      const v = r.props?.[key];
      if (v == null || v === "") continue;
      const label = String(v).slice(0, 60);
      m.set(label, (m.get(label) ?? 0) + 1);
    }
    return [...m.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, 10);
  };
  const topShared = tallyProp(shareRows, "edition").map((x) => ({ label: `#${x.label}`, n: x.n }));
  const topSearches = tallyProp(searchRows, "q");
  const topFeatures = tallyProp(rFilterRows, "feature");

  // Accumulation engagement averages.
  let secSum = 0;
  let scrollSum = 0;
  let engN = 0;
  for (const r of accEng ?? []) {
    const s = Number(r.props?.seconds);
    const sc = Number(r.props?.scrollPct);
    if (Number.isFinite(s)) {
      secSum += s;
      scrollSum += Number.isFinite(sc) ? sc : 0;
      engN += 1;
    }
  }
  let dcaChanges = 0;
  let timelineChanges = 0;
  let accCopies = 0;
  for (const r of accInteract ?? []) {
    if (r.name === "dca_change") dcaChanges += 1;
    else if (r.name === "timeline_range") timelineChanges += 1;
    else if (r.name === "copy_summary") accCopies += 1;
  }

  const [signupsAll, subscribers] = await Promise.all([
    sbCount("events", "name=eq.signup"),
    sbCount("brief_subscribers"),
  ]);
  const accSignups = (signupRows ?? []).filter((r) => (r.props?.source as string) === "/accumulation").length;

  return {
    configured: true,
    totals: {
      pageViews: pageRows.length,
      visitors: sessions.size,
      returning,
      signups: signupsAll ?? 0,
      subscribers,
    },
    windows: { views1, views7, views30, visitors1: sessions1.size, signups1, signups7, signups30 },
    topPages,
    topMetrics,
    mostCopied,
    mostDownloaded,
    topSignupSources,
    brief: { views: pageTally.get("/brief") ?? 0, avgSeconds: bN ? Math.round(bSec / bN) : null, avgScroll: bN ? Math.round(bScroll / bN) : null },
    research: { totalEditions: lib.totalEditions, avgReadMin: lib.avgReadMin, views: researchViews, topEditions, topShared, topSearches, topFeatures },
    email: {
      sent: emSent,
      delivered: emDelivered,
      failed: emFailed,
      deliveryRate: emSent ? Math.round((emDelivered / emSent) * 100) : null,
      failureRate: emSent ? Math.round((emFailed / emSent) * 100) : null,
      recent: emailRecent,
    },
    accumulation: {
      views: pageTally.get("/accumulation") ?? 0,
      dcaChanges,
      timelineChanges,
      copies: accCopies,
      signups: accSignups,
      avgSeconds: engN ? Math.round(secSum / engN) : null,
      avgScroll: engN ? Math.round(scrollSum / engN) : null,
    },
    trend: [...trendMap.entries()].map(([date, views]) => ({ date, views })),
  };
}

export interface AnalyticsSummary {
  configured: boolean;
  totals: {
    pageViews: number | null;
    sessions: number | null;
    newVisitors: number | null;
    signups: number | null;
    shares: number | null;
    feedbackHelpful: number | null;
    feedbackNotHelpful: number | null;
  };
  topPages: { path: string; views: number }[];
  topSections: { section: string; views: number }[];
  featureVotes: { feature: string; votes: number }[];
  sectionFeedback: SectionFeedback[];
  recentComments: FeedbackComment[];
  subscribers: number | null;
}

export interface SectionFeedback {
  key: string; // section name (or path for page-level feedback)
  helpful: number;
  notHelpful: number;
  total: number;
  pct: number; // helpful %
}

export interface FeedbackComment {
  key: string; // section or path
  helpful: boolean;
  message: string;
  when: string; // ISO timestamp
}

const SHARE_EVENTS = ["copy_post", "copy_thread", "copy_linkedin", "share_image"];

// Count distinct session_ids for a given event filter via a grouped select.
async function distinctSessions(filter = ""): Promise<number | null> {
  // PostgREST can't COUNT(DISTINCT) directly; pull session_ids and dedupe.
  const rows = await sbSelect<{ session_id: string | null }[]>(
    `events?select=session_id${filter ? `&${filter}` : ""}&limit=10000`,
  );
  if (!rows) return null;
  return new Set(rows.map((r) => r.session_id).filter(Boolean)).size;
}

function tally<T extends string>(rows: { [k: string]: unknown }[] | null, key: string): { name: T; n: number }[] {
  if (!rows) return [];
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = (r[key] ?? (r.props as Record<string, unknown>)?.[key]) as string | undefined;
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()].map(([name, n]) => ({ name: name as T, n })).sort((a, b) => b.n - a.n);
}

export async function analyticsSummary(): Promise<AnalyticsSummary> {
  if (!supabaseConfigured) {
    return {
      configured: false,
      totals: {
        pageViews: null,
        sessions: null,
        newVisitors: null,
        signups: null,
        shares: null,
        feedbackHelpful: null,
        feedbackNotHelpful: null,
      },
      topPages: [],
      topSections: [],
      featureVotes: [],
      sectionFeedback: [],
      recentComments: [],
      subscribers: null,
    };
  }

  const [pageViews, signups, newVisitors, sessions, subscribers] = await Promise.all([
    sbCount("events", "name=eq.page_view"),
    sbCount("events", "name=eq.signup"),
    sbCount("events", "name=eq.page_view&is_new=eq.true"),
    distinctSessions(),
    sbCount("brief_subscribers"),
  ]);

  // Shares across all share events.
  let shares = 0;
  for (const e of SHARE_EVENTS) {
    const c = await sbCount("events", `name=eq.${e}`);
    shares += c ?? 0;
  }

  const [helpful, notHelpful] = await Promise.all([
    sbCount("feedback", "helpful=eq.true"),
    sbCount("feedback", "helpful=eq.false"),
  ]);

  // Top pages (page_view rows) + top sections (section_view rows) + votes.
  const pageRows = await sbSelect<{ path: string }[]>("events?select=path&name=eq.page_view&limit=10000");
  const sectionRows = await sbSelect<{ props: Record<string, unknown> }[]>(
    "events?select=props&name=eq.section_view&limit=10000",
  );
  const voteRows = await sbSelect<{ feature: string }[]>("feature_votes?select=feature&limit=10000");

  // Section-level feedback: helpful / not-helpful / % per piece of content.
  const fbRows = await sbSelect<
    {
      section: string | null;
      path: string | null;
      helpful: boolean | null;
      message: string | null;
      created_at: string;
    }[]
  >("feedback?select=section,path,helpful,message,created_at&limit=10000");

  const groups = new Map<string, { helpful: number; notHelpful: number }>();
  for (const r of fbRows ?? []) {
    const key = r.section || r.path || "unknown";
    const g = groups.get(key) ?? { helpful: 0, notHelpful: 0 };
    if (r.helpful === true) g.helpful += 1;
    else if (r.helpful === false) g.notHelpful += 1;
    groups.set(key, g);
  }
  const sectionFeedback: SectionFeedback[] = [...groups.entries()]
    .map(([key, g]) => {
      const total = g.helpful + g.notHelpful;
      return { key, helpful: g.helpful, notHelpful: g.notHelpful, total, pct: total ? Math.round((g.helpful / total) * 100) : 0 };
    })
    .sort((a, b) => b.total - a.total);

  const recentComments: FeedbackComment[] = (fbRows ?? [])
    .filter((r) => r.message && r.message.trim())
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 15)
    .map((r) => ({ key: r.section || r.path || "—", helpful: !!r.helpful, message: r.message as string, when: r.created_at }));

  return {
    configured: true,
    totals: {
      pageViews,
      sessions,
      newVisitors,
      signups,
      shares,
      feedbackHelpful: helpful,
      feedbackNotHelpful: notHelpful,
    },
    topPages: tally<string>(pageRows, "path").slice(0, 12).map((x) => ({ path: x.name, views: x.n })),
    topSections: tally<string>(sectionRows, "section").slice(0, 12).map((x) => ({ section: x.name, views: x.n })),
    featureVotes: tally<string>(voteRows, "feature").map((x) => ({ feature: x.name, votes: x.n })),
    sectionFeedback,
    recentComments,
    subscribers,
  };
}
