// Trend-first dashboard metrics — the /admin/founder engine (updated spec):
// every KPI is a current-window value, its change against the previous window
// of the same length (via the spine's compare/goodness), a deterministic
// verdict, and a per-day sparkline. Default window 30 days vs the previous
// 30; 7 and 90 optional. Cumulative totals are secondary. A metric below its
// volume floor says "insufficient" rather than pretending noise is a verdict.

import { FLAGSHIP_PAGES, prettyPath } from "../journeyAnalytics";
import { sbSelect, supabaseConfigured } from "../supabase";
import { compare, goodness, inWindow, priorPeriod, trailingPeriod } from "./period";

const DAY = 86_400_000;

export type FounderRange = 7 | 30 | 90;
export const FOUNDER_RANGES: FounderRange[] = [7, 30, 90];
export const DEFAULT_RANGE: FounderRange = 30;

// ── Pure helpers (exported for the deterministic test-suite) ────────────────

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export type Verdict = "better" | "flat" | "worse" | "insufficient";

/** Deterministic verdict on the spine's comparison substrate: volume floor
 *  first (never a verdict from noise), then a ±flat band on the percentage
 *  change, then direction via goodness (higherIsBetter inverts polarity). */
export function verdictFor(
  current: number,
  previous: number,
  opts: { floor?: number; flatBandPct?: number; higherIsBetter?: boolean } = {},
): Verdict {
  const { floor = 20, flatBandPct = 10, higherIsBetter = true } = opts;
  if (current + previous < floor) return "insufficient";
  const c = compare(current, previous);
  if (c.pctChange == null) return current > 0 ? (higherIsBetter ? "better" : "worse") : "insufficient";
  if (Math.abs(c.pctChange) <= flatBandPct) return "flat";
  return goodness(c.trend, higherIsBetter) === "good" ? "better" : "worse";
}

export type TrafficBucket = "campaigns" | "search" | "social" | "direct" | "referral";

const SEARCH_HOSTS = ["google.", "bing.", "duckduckgo.", "ecosia.", "brave.", "yandex."];
const SOCIAL_HOSTS = ["twitter.", "x.com", "t.co", "reddit.", "youtube.", "youtu.be", "instagram.", "facebook.", "fb.", "linkedin.", "tiktok.", "threads."];

/** Classify a session's entry. utm_source wins (a tagged campaign, whatever
 *  the network); then referrer host; no referrer at all = direct. */
export function classifyTraffic(referrer: string | null, utmSource: string | null): TrafficBucket {
  if (utmSource && utmSource.trim() !== "") return "campaigns";
  if (!referrer || referrer.trim() === "") return "direct";
  let host = referrer.toLowerCase();
  try {
    host = new URL(referrer).host.toLowerCase();
  } catch {
    /* not a URL — match on the raw string */
  }
  host = host.replace(/^www\./, "");
  if (SEARCH_HOSTS.some((h) => host.includes(h))) return "search";
  if (SOCIAL_HOSTS.some((h) => host.includes(h))) return "social";
  return "referral";
}

/** Per-day series over the trailing `days` ending at `endMs` (inclusive),
 *  oldest first — the sparkline shape. Missing days are zeros, not gaps. */
export function seriesOver(days: number, endMs: number, countsByDay: Map<string, number>): number[] {
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(countsByDay.get(dayKey(new Date(endMs - i * DAY).toISOString())) ?? 0);
  }
  return out;
}

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface FounderKpi {
  key: string;
  label: string;
  current: number;
  previous: number;
  changePct: number | null;
  verdict: Verdict;
  spark: number[]; // per-day, current window, oldest first
  unit: "count" | "pct";
  note?: string;
}

export interface FounderTrends {
  configured: boolean;
  generatedAt: string;
  rangeDays: FounderRange;
  windowFrom: string; // ISO day, current window start
  kpis: FounderKpi[];
  signupsByDay: number[]; // the annotated hero trend (current window)
  traffic: { bucket: TrafficBucket; label: string; current: number; previous: number; sharePct: number }[];
  landings: { path: string; label: string; signups: number; prevSignups: number }[];
  email: { enabled: boolean; opened: number; clicked: number; prevOpened: number; prevClicked: number };
  totals: { subscribersAllTime: number }; // cumulative — deliberately secondary
  truncated: boolean; // page-view fetch hit its cap; window may undercount
}

// ── Data ────────────────────────────────────────────────────────────────────

interface PvRow { path: string; session_id: string | null; created_at: string; props: Record<string, unknown> | null }
interface SignupRow { path: string | null; created_at: string }
interface JnRow { name: string; created_at: string }
interface EmailRow { category: string; occurred_at: string }

const PV_CAP = 50_000;

function propStr(props: Record<string, unknown> | null, key: string): string | null {
  const v = props?.[key];
  return typeof v === "string" && v !== "" ? v : null;
}

export function emptyFounderTrends(rangeDays: FounderRange): FounderTrends {
  return {
    configured: false,
    generatedAt: new Date().toISOString(),
    rangeDays,
    windowFrom: "",
    kpis: [],
    signupsByDay: [],
    traffic: [],
    landings: [],
    email: { enabled: false, opened: 0, clicked: 0, prevOpened: 0, prevClicked: 0 },
    totals: { subscribersAllTime: 0 },
    truncated: false,
  };
}

export async function founderTrends(rangeDays: FounderRange = DEFAULT_RANGE, now: number = Date.now()): Promise<FounderTrends> {
  if (!supabaseConfigured) return emptyFounderTrends(rangeDays);

  const cur = trailingPeriod(rangeDays, now);
  const prev = priorPeriod(cur);
  const bothWindows = prev.start;
  const [pv, su, jn, em] = await Promise.all([
    sbSelect<PvRow[]>(
      `events?select=path,session_id,created_at,props&name=eq.page_view&created_at=gte.${bothWindows}&order=created_at.desc&limit=${PV_CAP}`,
    ),
    // Signups unwindowed: the table is small and it also gives the honest
    // all-time cumulative without a second query.
    sbSelect<SignupRow[]>("events?select=path,created_at&name=eq.signup&order=created_at.desc&limit=20000"),
    sbSelect<JnRow[]>(
      `events?select=name,created_at&name=in.(journey_next_impression,journey_next_click)&created_at=gte.${bothWindows}&limit=20000`,
    ),
    sbSelect<EmailRow[]>(`email_events?select=category,occurred_at&occurred_at=gte.${bothWindows}&limit=100000`),
  ]);
  if (pv == null) return emptyFounderTrends(rangeDays);

  const inCurrent = (iso: string) => inWindow(Date.parse(iso), cur);
  const inPrevious = (iso: string) => inWindow(Date.parse(iso), prev);

  // Sessions + traffic, from page views (rows arrive newest-first).
  const sessions = new Map<string, { first: string; referrer: string | null; utmSource: string | null; sawFlagship: boolean }>();
  for (const r of pv) {
    const sid = r.session_id ?? `anon-${dayKey(r.created_at)}-${r.path}`;
    const s = sessions.get(sid);
    const flagship = (FLAGSHIP_PAGES as readonly string[]).includes(r.path);
    if (!s) {
      sessions.set(sid, { first: r.created_at, referrer: propStr(r.props, "referrer"), utmSource: propStr(r.props, "utm_source"), sawFlagship: flagship });
    } else {
      if (r.created_at < s.first) s.first = r.created_at;
      if (s.referrer == null) s.referrer = propStr(r.props, "referrer");
      if (s.utmSource == null) s.utmSource = propStr(r.props, "utm_source");
      if (flagship) s.sawFlagship = true;
    }
  }
  const sessionList = [...sessions.values()];
  const sessByDay = new Map<string, number>();
  for (const s of sessionList) sessByDay.set(dayKey(s.first), (sessByDay.get(dayKey(s.first)) ?? 0) + 1);
  const sessCur = sessionList.filter((s) => inCurrent(s.first));
  const sessPrev = sessionList.filter((s) => inPrevious(s.first));

  // Signups.
  const suRows = su ?? [];
  const suByDay = new Map<string, number>();
  for (const r of suRows) suByDay.set(dayKey(r.created_at), (suByDay.get(dayKey(r.created_at)) ?? 0) + 1);
  const suCur = suRows.filter((r) => inCurrent(r.created_at));
  const suPrev = suRows.filter((r) => inPrevious(r.created_at));

  // Journeys.
  const jnRows = jn ?? [];
  const count = (name: string, win: (iso: string) => boolean) => jnRows.filter((r) => r.name === name && win(r.created_at)).length;
  const imprCur = count("journey_next_impression", inCurrent);
  const imprPrev = count("journey_next_impression", inPrevious);
  const clickCur = count("journey_next_click", inCurrent);
  const clickPrev = count("journey_next_click", inPrevious);
  const jnClickByDay = new Map<string, number>();
  for (const r of jnRows) if (r.name === "journey_next_click") jnClickByDay.set(dayKey(r.created_at), (jnClickByDay.get(dayKey(r.created_at)) ?? 0) + 1);

  // Email engagement.
  const emRows = em ?? [];
  const emailEnabled = emRows.some((r) => r.category === "opened" || r.category === "clicked");
  const emCount = (cat: string, win: (iso: string) => boolean) => emRows.filter((r) => r.category === cat && win(r.occurred_at)).length;

  const rate = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
  const convCur = rate(suCur.length, sessCur.length);
  const convPrev = rate(suPrev.length, sessPrev.length);
  const ctrCur = rate(clickCur, imprCur);
  const ctrPrev = rate(clickPrev, imprPrev);
  const flagCur = rate(sessCur.filter((s) => s.sawFlagship).length, sessCur.length);
  const flagPrev = rate(sessPrev.filter((s) => s.sawFlagship).length, sessPrev.length);
  const pct = (c: number, p: number) => compare(c, p).pctChange;

  const kpis: FounderKpi[] = [
    {
      key: "signups", label: "New subscribers", unit: "count",
      current: suCur.length, previous: suPrev.length,
      changePct: pct(suCur.length, suPrev.length),
      verdict: verdictFor(suCur.length, suPrev.length, { floor: 10 }),
      spark: seriesOver(rangeDays, now, suByDay),
    },
    {
      key: "sessions", label: "Sessions", unit: "count",
      current: sessCur.length, previous: sessPrev.length,
      changePct: pct(sessCur.length, sessPrev.length),
      verdict: verdictFor(sessCur.length, sessPrev.length, { floor: 50 }),
      spark: seriesOver(rangeDays, now, sessByDay),
    },
    {
      key: "conversion", label: "Signup conversion", unit: "pct",
      current: convCur, previous: convPrev,
      changePct: pct(convCur, convPrev),
      verdict: sessCur.length + sessPrev.length < 100 ? "insufficient" : verdictFor(convCur, convPrev, { floor: 0 }),
      spark: seriesOver(rangeDays, now, suByDay),
      note: "signups ÷ sessions",
    },
    {
      key: "journey_ctr", label: "Journey follow-through", unit: "pct",
      current: ctrCur, previous: ctrPrev,
      changePct: pct(ctrCur, ctrPrev),
      verdict: imprCur + imprPrev < 50 ? "insufficient" : verdictFor(ctrCur, ctrPrev, { floor: 0 }),
      spark: seriesOver(rangeDays, now, jnClickByDay),
      note: "clicks ÷ impressions",
    },
    {
      key: "flagship_reach", label: "Flagship reach", unit: "pct",
      current: flagCur, previous: flagPrev,
      changePct: pct(flagCur, flagPrev),
      verdict: sessCur.length + sessPrev.length < 100 ? "insufficient" : verdictFor(flagCur, flagPrev, { floor: 0 }),
      spark: seriesOver(rangeDays, now, sessByDay),
      note: "sessions reaching a flagship page",
    },
  ];

  // Traffic mix (current window sessions, previous alongside).
  const bucketLabel: Record<TrafficBucket, string> = {
    campaigns: "Campaigns (utm-tagged)", search: "Search", social: "Social", direct: "Direct", referral: "Other referrers",
  };
  const bucketCount = (list: typeof sessionList) => {
    const m = new Map<TrafficBucket, number>();
    for (const s of list) {
      const b = classifyTraffic(s.referrer, s.utmSource);
      m.set(b, (m.get(b) ?? 0) + 1);
    }
    return m;
  };
  const curB = bucketCount(sessCur);
  const prevB = bucketCount(sessPrev);
  const traffic = (Object.keys(bucketLabel) as TrafficBucket[])
    .map((b) => ({
      bucket: b, label: bucketLabel[b],
      current: curB.get(b) ?? 0, previous: prevB.get(b) ?? 0,
      sharePct: rate(curB.get(b) ?? 0, sessCur.length),
    }))
    .filter((t) => t.current > 0 || t.previous > 0)
    .sort((a, b) => b.current - a.current);

  // Where signups happen (top landing paths by current-window signups).
  const byPath = new Map<string, { cur: number; prev: number }>();
  for (const r of suRows) {
    const p = (r.path ?? "unknown").split("?")[0];
    const e = byPath.get(p) ?? { cur: 0, prev: 0 };
    if (inCurrent(r.created_at)) e.cur++;
    else if (inPrevious(r.created_at)) e.prev++;
    byPath.set(p, e);
  }
  const landings = [...byPath.entries()]
    .filter(([, v]) => v.cur > 0 || v.prev > 0)
    .sort((a, b) => b[1].cur - a[1].cur)
    .slice(0, 6)
    .map(([path, v]) => ({ path, label: prettyPath(path), signups: v.cur, prevSignups: v.prev }));

  return {
    configured: true,
    generatedAt: new Date(now).toISOString(),
    rangeDays,
    windowFrom: dayKey(cur.start),
    kpis,
    signupsByDay: seriesOver(rangeDays, now, suByDay),
    traffic,
    landings,
    email: {
      enabled: emailEnabled,
      opened: emCount("opened", inCurrent), clicked: emCount("clicked", inCurrent),
      prevOpened: emCount("opened", inPrevious), prevClicked: emCount("clicked", inPrevious),
    },
    totals: { subscribersAllTime: suRows.length },
    truncated: pv.length >= PV_CAP,
  };
}
