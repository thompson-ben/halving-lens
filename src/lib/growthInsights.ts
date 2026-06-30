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
