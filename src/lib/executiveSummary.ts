// CEO / Founder Executive Summary — a single composed, typed object that the
// /admin/executive page renders as-is. It reuses the existing aggregators
// (growthDashboard, emailEngagement, shareDashboard, referralAnalytics,
// subscriberStats, company snapshots, visitorToWaes) rather than re-querying the
// raw event store, so every number traces to a real source. Anything without a
// live source renders as an em-dash tile with a short "why" note — never a
// fabricated figure. Degrades to configured:false when Supabase is unset.

import { growthDashboard, subscriberStats } from "./analytics";
import { emailEngagement } from "./growthInsights";
import { visitorToWaes } from "./growthInsights";
import { shareDashboard } from "./shareAnalytics";
import { referralAnalytics } from "./referralAnalytics";
import { recentSnapshots, monthLabel } from "./companyHistory";
import { supabaseConfigured } from "./supabase";

export type DeltaTone = "up" | "down" | "neutral";

// One stat tile. `value` is always pre-formatted (a string), so the page stays
// dumb. `available:false` means there is no live source — value is "—" and `sub`
// explains why ("not tracked yet" / "connect a source").
export interface Tile {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: DeltaTone;
  sub?: string;
  available: boolean;
}

export interface TileGroup {
  key: string;
  title: string;
  tiles: Tile[];
}

export interface ExecutiveSummary {
  configured: boolean;
  generatedAt: string; // ISO timestamp
  groups: TileGroup[];
}

// ── Small honest formatters ──────────────────────────────────────────────────
const DASH = "—";
const num = (n: number | null | undefined): string => (n == null ? DASH : n.toLocaleString());
const pctStr = (n: number | null | undefined): string => (n == null ? DASH : `${n}%`);
const secStr = (n: number | null | undefined): string => (n == null ? DASH : `${n}s`);
function truncate(s: string, max = 28): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// Week-on-week delta (percentage) with tone. Returns nothing when there's no
// honest prior-period baseline to compare against.
function wow(cur: number, prev: number): Pick<Tile, "delta" | "deltaTone"> {
  if (prev <= 0) return {};
  const p = Math.round(((cur - prev) / prev) * 100);
  return { delta: `${p >= 0 ? "+" : ""}${p}% wk`, deltaTone: p > 0 ? "up" : p < 0 ? "down" : "neutral" };
}

// Absolute change vs the previous manual snapshot (used for social follower
// counts). No delta when there's no earlier entry.
function absDelta(cur: number, prev: number | null): Pick<Tile, "delta" | "deltaTone"> {
  if (prev == null) return {};
  const d = cur - prev;
  return { delta: `${d >= 0 ? "+" : ""}${d.toLocaleString()}`, deltaTone: d > 0 ? "up" : d < 0 ? "down" : "neutral" };
}

const ratio = (n: number, d: number | null | undefined): number | null =>
  d && d > 0 ? Math.round((n / d) * 1000) / 10 : null;

const FLAGSHIP = ["/state-of-bitcoin", "/accumulation", "/historical-price-paths"];

export async function executiveSummary(): Promise<ExecutiveSummary> {
  const generatedAt = new Date().toISOString();
  if (!supabaseConfigured) return { configured: false, generatedAt, groups: [] };

  const [a, email, v2w, share, referral, subs, snaps] = await Promise.all([
    growthDashboard(),
    emailEngagement(),
    visitorToWaes(),
    shareDashboard(),
    referralAnalytics(),
    subscriberStats(),
    recentSnapshots(24),
  ]);

  const g = a.growth;

  // ── Social: latest manual snapshot value + the previous entry for a delta ──
  // Scans snapshots (newest first) for the most recent finite value of a field
  // and the one before it; different fields may resolve to different months.
  const socialField = (key: string): { current: number | null; prev: number | null; asOf: string | null } => {
    let current: number | null = null;
    let prev: number | null = null;
    let asOf: string | null = null;
    for (const s of snaps) {
      const v = s.metrics[key];
      if (typeof v === "number" && Number.isFinite(v)) {
        if (current == null) {
          current = v;
          asOf = s.month;
        } else {
          prev = v;
          break;
        }
      }
    }
    return { current, prev, asOf };
  };
  const socialTile = (label: string, key: string): Tile => {
    const { current, prev, asOf } = socialField(key);
    if (current == null) {
      return { label, value: DASH, sub: "not entered yet — Founder Journal", available: false };
    }
    return {
      label,
      value: num(current),
      sub: asOf ? `as of ${monthLabel(asOf)}` : undefined,
      available: true,
      ...absDelta(current, prev),
    };
  };

  // ── CONTENT / PERFORMANCE helpers ──────────────────────────────────────────
  const topPage = a.topPages[0];
  const topFlagship = a.topPages.filter((p) => FLAGSHIP.includes(p.label)).sort((x, y) => y.n - x.n)[0];
  const topResearch = a.research.topEditions[0];
  const topShared = share.insights.topContent[0];
  const topCopied = a.mostCopied[0];
  const topDownloaded = a.mostDownloaded[0];
  const topSignupSource = a.topSignupSources[0];
  const topLandingSource = a.landing.topSources[0];
  const topShareCampaign = [...share.campaigns].sort(
    (x, y) => y.subscribers - x.subscribers || y.visits - x.visits,
  )[0];

  const labelTile = (
    label: string,
    item: { label?: string; slug?: string; name?: string } | undefined,
    sub: string | undefined,
    emptyNote: string,
  ): Tile => {
    const text = item?.label ?? item?.name ?? item?.slug;
    if (!text) return { label, value: DASH, sub: emptyNote, available: false };
    return { label, value: truncate(text), sub, available: true };
  };

  // ── EMAIL: Daily Brief open rate (aggregate the daily-* campaigns) ──────────
  let dailyDelivered = 0;
  let dailyOpens = 0;
  for (const c of email.byCampaign) {
    if (c.campaign.startsWith("daily-")) {
      dailyDelivered += c.delivered ?? 0;
      dailyOpens += c.opens;
    }
  }
  const briefOpenRate = ratio(dailyOpens, dailyDelivered);

  // ── Derived growth ratios ──────────────────────────────────────────────────
  const visitorConversion = ratio(a.totals.signups, a.totals.visitors);
  const retention = ratio(subs.active ?? 0, a.totals.signups);
  const referralConversion = ratio(referral.totalReferralSubscribers, referral.totalReferralVisitors);

  const groups: TileGroup[] = [
    {
      key: "audience",
      title: "Audience",
      tiles: [
        {
          label: "Visitors",
          value: num(a.totals.visitors),
          sub: `${num(v2w.visitors7)} this week`,
          available: true,
          ...wow(v2w.visitors7, v2w.visitorsPrev7),
        },
        { label: "Returning", value: num(a.totals.returning), available: true },
        { label: "Page views", value: num(a.totals.pageViews), sub: `${num(a.windows.views7)} in 7d`, available: true },
        { label: "Avg session", value: secStr(g.avgSessionSeconds), available: g.avgSessionSeconds != null },
        { label: "Avg scroll depth", value: pctStr(g.avgScroll), available: g.avgScroll != null },
        { label: "Bounce rate", value: DASH, sub: "not tracked yet", available: false },
      ],
    },
    {
      key: "growth",
      title: "Growth",
      tiles: [
        { label: "Total signups", value: num(a.totals.signups), sub: `${num(a.windows.signups7)} in 7d`, available: true },
        { label: "Active subscribers", value: num(subs.active), available: subs.active != null },
        { label: "Unsubscribed", value: num(subs.unsubscribed), available: subs.unsubscribed != null },
        { label: "Visitor conversion", value: pctStr(visitorConversion), sub: "visitor → signup", available: visitorConversion != null },
        { label: "Retention", value: pctStr(retention), sub: "signup → active sub", available: retention != null },
        { label: "Referral conversion", value: pctStr(referralConversion), sub: "referred → subscriber", available: referralConversion != null },
      ],
    },
    {
      key: "social",
      title: "Social",
      tiles: [
        socialTile("Instagram followers", "instagram_followers"),
        socialTile("X followers", "x_followers"),
        socialTile("YouTube subscribers", "youtube_subscribers"),
        { label: "LinkedIn followers", value: DASH, sub: "connect a source", available: false },
      ],
    },
    {
      key: "content",
      title: "Content",
      tiles: [
        labelTile("Most viewed page", topPage, topPage ? `${num(topPage.n)} views` : undefined, "no page views yet"),
        labelTile("Most shared page", topShared, topShared ? `${num(topShared.shares)} shares` : undefined, "no shares yet"),
        labelTile("Top flagship page", topFlagship, topFlagship ? `${num(topFlagship.n)} views` : undefined, "no flagship views yet"),
        labelTile("Most viewed research", topResearch, topResearch ? `${num(topResearch.n)} views` : undefined, "no research views yet"),
        labelTile("Top signup source", topSignupSource, topSignupSource ? `${num(topSignupSource.n)} subs` : undefined, "no sources yet"),
        labelTile("Top landing source", topLandingSource, topLandingSource ? `${num(topLandingSource.n)} views` : undefined, "no landing traffic yet"),
      ],
    },
    {
      key: "email",
      title: "Email",
      tiles: [
        { label: "Open rate", value: pctStr(email.openRate), sub: "estimated", available: email.openRate != null },
        { label: "Click rate", value: pctStr(email.ctr), available: email.ctr != null },
        { label: "Unsubscribe rate", value: pctStr(subs.unsubscribeRate), available: subs.unsubscribeRate != null },
        { label: "Daily Brief opens", value: pctStr(briefOpenRate), sub: "brief campaign open rate", available: briefOpenRate != null },
      ],
    },
    {
      key: "performance",
      title: "Performance",
      tiles: [
        labelTile("Most visited flagship", topFlagship, topFlagship ? `${num(topFlagship.n)} views` : undefined, "no flagship views yet"),
        labelTile("Most shared content", topShared, topShared ? `${num(topShared.shares)} shares` : undefined, "no shares yet"),
        labelTile("Most copied content", topCopied, topCopied ? `${num(topCopied.n)} copies` : undefined, "no copies yet"),
        labelTile("Most downloaded image", topDownloaded, topDownloaded ? `${num(topDownloaded.n)} downloads` : undefined, "no downloads yet"),
        topShareCampaign
          ? {
              label: "Top share campaign",
              value: truncate(topShareCampaign.name),
              sub: `${num(topShareCampaign.visits)} visits${topShareCampaign.conversionPct != null ? ` · ${topShareCampaign.conversionPct}%` : ""}`,
              available: true,
            }
          : { label: "Top share campaign", value: DASH, sub: "no campaigns yet", available: false },
      ],
    },
  ];

  return { configured: true, generatedAt, groups };
}
