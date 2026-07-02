// Sharing + virality analytics for the Founder Dashboard. Reads the first-party
// event stream (share actions) and link_hits (redirect opens / QR scans), then
// aggregates in JS — volumes are low and this keeps us off PostgREST's limited
// grouping. Everything degrades to empty (never throws) when Supabase is unset.

import { sbSelect, supabaseConfigured } from "./supabase";
import { labelForSlug } from "./shareLinks";
import { listCampaigns } from "./shareCampaigns";

interface EventRow {
  props: Record<string, unknown> | null;
  created_at: string;
}
interface HitRow {
  slug: string;
  kind: string;
  method: string;
  campaign_slug: string | null;
  content_type: string | null;
  content_id: string | null;
  created_at: string;
}

const DAY = 86_400_000;

function sinceCount(rows: { created_at: string }[], days: number, now: number): number {
  const cutoff = now - days * DAY;
  return rows.reduce((n, r) => (new Date(r.created_at).getTime() >= cutoff ? n + 1 : n), 0);
}

export interface ShareInsights {
  configured: boolean;
  totalShares: number;
  totalScans: number;
  totalVisits: number; // link_hits (short-link opens)
  shareToVisitPct: number | null;
  byMethod: { method: string; n: number }[];
  topContent: { slug: string; label: string; shares: number; visits: number }[];
  windows: { daily: number; weekly: number; monthly: number };
}

export interface CampaignInsight {
  slug: string;
  name: string;
  destination: string;
  scans: number;
  visits: number;
  subscribers: number;
  conversionPct: number | null;
  createdAt: string;
}

export interface ShareDashboard {
  insights: ShareInsights;
  campaigns: CampaignInsight[];
}

const EMPTY: ShareInsights = {
  configured: false,
  totalShares: 0,
  totalScans: 0,
  totalVisits: 0,
  shareToVisitPct: null,
  byMethod: [],
  topContent: [],
  windows: { daily: 0, weekly: 0, monthly: 0 },
};

export async function shareDashboard(): Promise<ShareDashboard> {
  if (!supabaseConfigured) return { insights: EMPTY, campaigns: [] };

  const [shareEvents, hits, signups, campaigns] = await Promise.all([
    sbSelect<EventRow[]>("events?name=eq.share&select=props,created_at&order=created_at.desc&limit=10000"),
    sbSelect<HitRow[]>("link_hits?select=slug,kind,method,campaign_slug,content_type,content_id,created_at&order=created_at.desc&limit=20000"),
    sbSelect<EventRow[]>("events?name=eq.signup&select=props,created_at&order=created_at.desc&limit=10000"),
    listCampaigns(),
  ]);

  const shareRows = shareEvents ?? [];
  const hitRows = hits ?? [];
  const signupRows = signups ?? [];
  const now = Date.now();

  // Share method popularity (from the sharer-side 'share' events).
  const methodCounts = new Map<string, number>();
  for (const e of shareRows) {
    const m = String(e.props?.method ?? "unknown");
    methodCounts.set(m, (methodCounts.get(m) ?? 0) + 1);
  }
  const byMethod = [...methodCounts.entries()].map(([method, n]) => ({ method, n })).sort((a, b) => b.n - a.n);

  // Shares per slug (what content gets shared) + visits per slug (from hits).
  const sharesBySlug = new Map<string, number>();
  for (const e of shareRows) {
    const slug = String(e.props?.slug ?? "");
    if (slug) sharesBySlug.set(slug, (sharesBySlug.get(slug) ?? 0) + 1);
  }
  const visitsBySlug = new Map<string, number>();
  for (const h of hitRows) visitsBySlug.set(h.slug, (visitsBySlug.get(h.slug) ?? 0) + 1);

  const topContent = [...sharesBySlug.entries()]
    .map(([slug, shares]) => ({ slug, label: labelForSlug(slug), shares, visits: visitsBySlug.get(slug) ?? 0 }))
    .sort((a, b) => b.shares - a.shares)
    .slice(0, 10);

  const totalScans = hitRows.reduce((n, h) => (h.method === "qr" ? n + 1 : n), 0);
  const totalVisits = hitRows.length;
  const totalShares = shareRows.length;

  const insights: ShareInsights = {
    configured: true,
    totalShares,
    totalScans,
    totalVisits,
    shareToVisitPct: totalShares > 0 ? Math.round((totalVisits / totalShares) * 100) : null,
    byMethod,
    topContent,
    windows: {
      daily: sinceCount(shareRows, 1, now),
      weekly: sinceCount(shareRows, 7, now),
      monthly: sinceCount(shareRows, 30, now),
    },
  };

  // Per-campaign performance. Visits/scans from link_hits.campaign_slug;
  // subscribers from signup events whose first-touch carried this campaign
  // (hlc) or matching utm_campaign.
  const campaignInsights: CampaignInsight[] = campaigns
    .filter((c) => !c.archived)
    .map((c) => {
      const chits = hitRows.filter((h) => h.campaign_slug === c.slug);
      const scans = chits.reduce((n, h) => (h.method === "qr" ? n + 1 : n), 0);
      const subscribers = signupRows.reduce((n, s) => {
        const p = s.props ?? {};
        return p.hlc === c.slug || p.utm_campaign === c.utm_campaign || p.utm_campaign === c.slug ? n + 1 : n;
      }, 0);
      const visits = chits.length;
      return {
        slug: c.slug,
        name: c.name,
        destination: c.destination_path,
        scans,
        visits,
        subscribers,
        conversionPct: visits > 0 ? Math.round((subscribers / visits) * 100) : null,
        createdAt: c.created_at,
      };
    })
    .sort((a, b) => b.visits - a.visits);

  return { insights, campaigns: campaignInsights };
}
