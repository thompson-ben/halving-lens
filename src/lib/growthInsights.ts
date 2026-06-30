// Email engagement + acquisition-funnel analytics, built from the single
// first-party `events` store (plus the email delivery logs). Kept separate from
// the large growthDashboard() so the founder dashboard can compose them without
// reshaping that function. Server-only.

import { sbSelect } from "./supabase";

interface PropRow {
  props: Record<string, unknown> | null;
}

export interface EmailEngagement {
  configured: boolean;
  delivered: number; // daily + weekly delivered (open-rate denominator)
  opens: number; // total open pixels fired (estimated — incl. proxies)
  uniqueOpens: number; // distinct subscriber × campaign
  clicks: number; // total clicks (confirmed)
  uniqueClicks: number; // distinct subscriber × campaign
  openRate: number | null; // uniqueOpens / delivered, %
  ctr: number | null; // uniqueClicks / delivered, %
  ctor: number | null; // uniqueClicks / uniqueOpens, % (click-to-open)
  topCtas: { label: string; count: number }[];
  byCampaign: { campaign: string; delivered: number | null; opens: number; clicks: number; openRate: number | null }[];
}

const uniq = (rows: PropRow[]) => {
  const set = new Set<string>();
  for (const r of rows) {
    const sub = String(r.props?.sub ?? "");
    const camp = String(r.props?.campaign ?? "");
    if (sub) set.add(`${sub}|${camp}`);
  }
  return set.size;
};

export async function emailEngagement(): Promise<EmailEngagement> {
  const empty: EmailEngagement = {
    configured: false,
    delivered: 0,
    opens: 0,
    uniqueOpens: 0,
    clicks: 0,
    uniqueClicks: 0,
    openRate: null,
    ctr: null,
    ctor: null,
    topCtas: [],
    byCampaign: [],
  };

  const [openRows, clickRows, daily, weekly] = await Promise.all([
    sbSelect<PropRow[]>("events?select=props&name=eq.email_open&limit=50000"),
    sbSelect<PropRow[]>("events?select=props&name=eq.email_click&limit=50000"),
    sbSelect<{ date: string; emails_delivered: number }[]>("email_deliveries?select=date,emails_delivered&limit=2000"),
    sbSelect<{ slug: string; emails_delivered: number }[]>("weekly_email_deliveries?select=slug,emails_delivered&limit=2000"),
  ]);
  if (openRows == null && clickRows == null && daily == null) return empty;

  const opens = openRows ?? [];
  const clicks = clickRows ?? [];

  // Delivered per campaign: daily campaigns are "daily-<date>", weekly "weekly-<slug>".
  const deliveredByCampaign = new Map<string, number>();
  let delivered = 0;
  for (const d of daily ?? []) {
    deliveredByCampaign.set(`daily-${d.date}`, d.emails_delivered ?? 0);
    delivered += d.emails_delivered ?? 0;
  }
  for (const w of weekly ?? []) {
    deliveredByCampaign.set(`weekly-${w.slug}`, w.emails_delivered ?? 0);
    delivered += w.emails_delivered ?? 0;
  }

  const uniqueOpens = uniq(opens);
  const uniqueClicks = uniq(clicks);

  const ctaTally = new Map<string, number>();
  for (const r of clicks) {
    const cta = String(r.props?.cta ?? "link");
    ctaTally.set(cta, (ctaTally.get(cta) ?? 0) + 1);
  }
  const topCtas = [...ctaTally.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8);

  // Per-campaign opens/clicks (unique subscribers).
  const camp = new Map<string, { opens: Set<string>; clicks: Set<string> }>();
  const ensure = (c: string) => camp.get(c) ?? camp.set(c, { opens: new Set(), clicks: new Set() }).get(c)!;
  for (const r of opens) {
    const c = String(r.props?.campaign ?? "");
    const sub = String(r.props?.sub ?? "");
    if (c && sub) ensure(c).opens.add(sub);
  }
  for (const r of clicks) {
    const c = String(r.props?.campaign ?? "");
    const sub = String(r.props?.sub ?? "");
    if (c && sub) ensure(c).clicks.add(sub);
  }
  const byCampaign = [...camp.entries()]
    .map(([campaign, v]) => {
      const del = deliveredByCampaign.get(campaign) ?? null;
      return {
        campaign,
        delivered: del,
        opens: v.opens.size,
        clicks: v.clicks.size,
        openRate: del && del > 0 ? Math.round((v.opens.size / del) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => b.opens - a.opens)
    .slice(0, 12);

  return {
    configured: true,
    delivered,
    opens: opens.length,
    uniqueOpens,
    clicks: clicks.length,
    uniqueClicks,
    openRate: delivered > 0 ? Math.round((uniqueOpens / delivered) * 1000) / 10 : null,
    ctr: delivered > 0 ? Math.round((uniqueClicks / delivered) * 1000) / 10 : null,
    ctor: uniqueOpens > 0 ? Math.round((uniqueClicks / uniqueOpens) * 1000) / 10 : null,
    topCtas,
    byCampaign,
  };
}

// ── North Star: Weekly Active Engaged Subscribers (WAES) ─────────────────────
// Definition (target): a subscriber who BOTH opened an email AND visited the
// site in the last 7 days. True WAES needs email-identity ↔ web-identity linkage,
// which arrives with magic-link auth (Phase 2). Until then we report the
// CLICK-BRIDGED measure: an email click proves email engagement AND a site visit
// in a single action, so distinct 7-day email clickers is an honest lower bound.
export interface WaesResult {
  waes: number; // distinct subscribers, click-bridged, last 7 days
  openers7d: number; // distinct subscribers who opened an email (7d)
  clickers7d: number; // distinct subscribers who clicked an email (7d) == waes basis
  returningVisitors7d: number; // distinct returning sessions (7d) — context
  basis: "click-bridged" | "linked";
}

function iso7(): string {
  return new Date(Date.now() - 7 * 86_400_000).toISOString();
}

export async function weeklyActiveEngaged(): Promise<WaesResult> {
  const since = iso7();
  const [opens, clicks, pages] = await Promise.all([
    sbSelect<PropRow[]>(`events?select=props&name=eq.email_open&created_at=gte.${since}&limit=50000`),
    sbSelect<PropRow[]>(`events?select=props&name=eq.email_click&created_at=gte.${since}&limit=50000`),
    sbSelect<{ session_id: string | null; is_new: boolean | null }[]>(
      `events?select=session_id,is_new&name=eq.page_view&created_at=gte.${since}&limit=50000`,
    ),
  ]);
  const subSet = (rows: PropRow[] | null) => {
    const s = new Set<string>();
    for (const r of rows ?? []) if (r.props?.sub) s.add(String(r.props.sub));
    return s;
  };
  const openers = subSet(opens);
  const clickers = subSet(clicks);
  const returning = new Set<string>();
  for (const r of pages ?? []) if (r.session_id && r.is_new === false) returning.add(r.session_id);
  return {
    waes: clickers.size,
    openers7d: openers.size,
    clickers7d: clickers.size,
    returningVisitors7d: returning.size,
    basis: "click-bridged",
  };
}

// ── Visitor → WAES conversion ────────────────────────────────────────────────
// The headline business metric: of unique visitors, how many became Weekly
// Active Engaged Subscribers. Reported over the last 7 days vs the prior 7 days.
export interface VisitorToWaes {
  current: number | null; // %
  previous: number | null; // %
  visitors7: number;
  waes7: number;
  visitorsPrev7: number;
  waesPrev7: number;
}

export async function visitorToWaes(): Promise<VisitorToWaes> {
  const now = Date.now();
  const d = (n: number) => new Date(now - n * 86_400_000).toISOString();
  const [pages, clicks] = await Promise.all([
    sbSelect<{ session_id: string | null; created_at: string }[]>(
      `events?select=session_id,created_at&name=eq.page_view&created_at=gte.${d(14)}&limit=80000`,
    ),
    sbSelect<{ props: Record<string, unknown> | null; created_at: string }[]>(
      `events?select=props,created_at&name=eq.email_click&created_at=gte.${d(14)}&limit=50000`,
    ),
  ]);
  const within = (ts: string, lo: number, hi: number) => {
    const t = Date.parse(ts);
    return t >= now - lo * 86_400_000 && t < now - hi * 86_400_000;
  };
  const visitors = (lo: number, hi: number) => {
    const s = new Set<string>();
    for (const r of pages ?? []) if (r.session_id && within(r.created_at, lo, hi)) s.add(r.session_id);
    return s.size;
  };
  const waes = (lo: number, hi: number) => {
    const s = new Set<string>();
    for (const r of clicks ?? []) if (r.props?.sub && within(r.created_at, lo, hi)) s.add(String(r.props.sub));
    return s.size;
  };
  const v7 = visitors(7, 0), w7 = waes(7, 0), vP = visitors(14, 7), wP = waes(14, 7);
  return {
    visitors7: v7,
    waes7: w7,
    visitorsPrev7: vP,
    waesPrev7: wP,
    current: v7 > 0 ? Math.round((w7 / v7) * 1000) / 10 : null,
    previous: vP > 0 ? Math.round((wP / vP) * 1000) / 10 : null,
  };
}

// ── Recommendations engine ───────────────────────────────────────────────────
// Rule-based, ranked by estimated business impact. Pure (operates on already-
// fetched data) so the dashboard composes it without extra queries.
export interface Recommendation {
  title: string;
  detail: string;
  impact: "high" | "medium" | "low";
}

interface RecoInput {
  email: EmailEngagement;
  waes: WaesResult;
  v2w: VisitorToWaes;
  campaigns: { campaign: string; visitors: number; signups: number; cps: number | null }[];
  experiments: { id: string; significant: boolean; bestKey: string | null; controlKey: string; liftPct: number | null; confidence: number | null; spec: { title: string } }[];
  referralSubscribers: number;
  landingConversion: number | null;
}

export function growthRecommendations(input: RecoInput): Recommendation[] {
  const recs: Recommendation[] = [];
  const order = { high: 0, medium: 1, low: 2 };

  for (const ex of input.experiments) {
    if (ex.significant && ex.bestKey && ex.bestKey !== ex.controlKey && (ex.liftPct ?? 0) > 0) {
      recs.push({
        title: `Ship the winner of “${ex.spec.title}”`,
        detail: `Variant ${ex.bestKey.toUpperCase()} is winning by ${ex.liftPct}% at ${ex.confidence}% confidence. Make it the default and start the next test.`,
        impact: "high",
      });
    } else if (ex.confidence != null && ex.confidence < 80 && ex.bestKey) {
      recs.push({
        title: `“${ex.spec.title}” isn't conclusive yet`,
        detail: `Confidence is ${ex.confidence}% — keep it running and resist calling a winner until ~95%.`,
        impact: "low",
      });
    }
  }

  const best = [...input.campaigns].filter((c) => c.cps != null && c.signups > 0).sort((a, b) => (a.cps ?? 1e9) - (b.cps ?? 1e9))[0];
  const worst = [...input.campaigns].filter((c) => c.cps != null && c.signups > 0).sort((a, b) => (b.cps ?? 0) - (a.cps ?? 0))[0];
  if (best && worst && best.campaign !== worst.campaign) {
    recs.push({
      title: `Shift budget toward ${best.campaign}`,
      detail: `${best.campaign} is your most cost-efficient campaign at £${best.cps}/sub vs £${worst.cps}/sub for ${worst.campaign}.`,
      impact: "high",
    });
  }

  if (input.email.openRate != null && input.email.ctr != null && input.email.openRate >= 20 && input.email.ctr < 2) {
    recs.push({
      title: "Email opens are healthy but clicks are low",
      detail: `Open rate ${input.email.openRate}% but CTR ${input.email.ctr}%. Test stronger CTAs / a clearer single action per email.`,
      impact: "medium",
    });
  }
  if (input.email.openRate != null && input.email.openRate < 15) {
    recs.push({
      title: "Email open rate is below benchmark",
      detail: `Open rate is ${input.email.openRate}%. Test subject lines and confirm deliverability (warm-up, SPF/DKIM, spam complaints).`,
      impact: "high",
    });
  }

  if (input.referralSubscribers > 0) {
    recs.push({
      title: "Referrals are producing subscribers",
      detail: `${input.referralSubscribers} subscriber(s) came via referral. Referred users tend to be higher quality — prioritise the referral loop.`,
      impact: "medium",
    });
  }

  if (input.v2w.current != null && input.v2w.previous != null) {
    const delta = input.v2w.current - input.v2w.previous;
    if (delta < 0) {
      recs.push({
        title: "Visitor → WAES conversion is falling",
        detail: `Down from ${input.v2w.previous}% to ${input.v2w.current}% week-on-week. Check landing conversion and email engagement for the leak.`,
        impact: "high",
      });
    }
  }

  if (input.landingConversion != null && input.landingConversion < 5) {
    recs.push({
      title: "Landing conversion has room to grow",
      detail: `Landing converts at ${input.landingConversion}%. Run a headline / hero / CTA experiment on /free before scaling spend.`,
      impact: "medium",
    });
  }

  if (recs.length === 0) {
    recs.push({ title: "Not enough data yet", detail: "Launch the Meta learning campaign and let traffic accrue — recommendations appear as signals emerge.", impact: "low" });
  }

  return recs.sort((a, b) => order[a.impact] - order[b.impact]);
}

// ── Acquisition funnel ───────────────────────────────────────────────────────
export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  pctOfTop: number; // share of the first stage
  stepPct: number | null; // conversion from the previous stage
}

export async function growthFunnel(): Promise<FunnelStage[]> {
  const [pageRows, openRows, clickRows, subs] = await Promise.all([
    sbSelect<{ session_id: string | null; is_new: boolean | null }[]>(
      "events?select=session_id,is_new&name=eq.page_view&limit=50000",
    ),
    sbSelect<PropRow[]>("events?select=props&name=eq.email_open&limit=50000"),
    sbSelect<PropRow[]>("events?select=props&name=eq.email_click&limit=50000"),
    sbSelect<{ id: number }[]>("brief_subscribers?select=id&limit=50000"),
  ]);

  const sessions = new Set<string>();
  const returning = new Set<string>();
  for (const r of pageRows ?? []) {
    if (!r.session_id) continue;
    sessions.add(r.session_id);
    if (r.is_new === false) returning.add(r.session_id);
  }
  const subsCount = (subs ?? []).length;
  const welcomeOpeners = new Set<string>();
  for (const r of openRows ?? []) {
    if (String(r.props?.campaign ?? "").startsWith("welcome") && r.props?.sub) welcomeOpeners.add(String(r.props.sub));
  }
  const clickers = new Set<string>();
  for (const r of clickRows ?? []) if (r.props?.sub) clickers.add(String(r.props.sub));

  const raw = [
    { key: "visitors", label: "Visitors", count: sessions.size },
    { key: "subscribers", label: "Subscribed", count: subsCount },
    { key: "welcome_open", label: "Opened welcome", count: welcomeOpeners.size },
    { key: "clicked", label: "Clicked an email", count: clickers.size },
    { key: "returned", label: "Returned to site", count: returning.size },
  ];
  const top = raw[0].count || 1;
  return raw.map((s, i) => ({
    ...s,
    pctOfTop: Math.round((s.count / top) * 1000) / 10,
    stepPct: i === 0 ? null : raw[i - 1].count > 0 ? Math.round((s.count / raw[i - 1].count) * 1000) / 10 : null,
  }));
}
