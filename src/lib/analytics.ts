// Server-side analytics aggregation for the internal PM dashboard. Reads from
// the first-party Supabase tables via PostgREST. All best-effort: returns nulls
// when Supabase isn't configured.

import { sbCount, sbSelect, supabaseConfigured } from "./supabase";

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
  subscribers: number | null;
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
    subscribers,
  };
}
