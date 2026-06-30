// Founder Weekly Intelligence Report — a Monday-morning executive note for the
// founder only (never subscribers). It doesn't just show numbers; it explains
// what happened, why, and what to do next — a built-in Head of Growth. Composed
// from the same first-party analytics + Marketing Health the dashboards use,
// plus week-on-week / month-on-month windows. Rule-based, evidence-driven.

import { sbSelect, supabaseConfigured } from "./supabase";
import { growthDashboard } from "./analytics";
import { marketingHealth } from "./marketingHealth";
import { allEditions, libraryStats } from "./research";
import { allWeeklies } from "./weekly";

export interface ReportRow { label: string; value: string; sub?: string }
export interface ReportTrend { label: string; dir: "up" | "down" | "flat" }
export interface FounderReport {
  weekLabel: string;
  generatedAt: string;
  executive: string[];
  growth: ReportRow[];
  marketing: ReportRow[];
  content: ReportRow[];
  behaviour: ReportRow[];
  research: ReportRow[];
  health: { overall: string; overallLabel: string; score: number; failing: { system: string; detail: string }[]; lastVerified: string };
  insights: string[];
  recommendations: string[];
  trends: ReportTrend[];
}

const DAY = 86_400_000;
function pct(cur: number, prev: number): number | null {
  if (prev <= 0) return cur > 0 ? 100 : null;
  return Math.round(((cur - prev) / prev) * 100);
}
function dir(cur: number, prev: number): "up" | "down" | "flat" {
  const p = pct(cur, prev);
  return p == null || Math.abs(p) < 3 ? "flat" : p > 0 ? "up" : "down";
}
function wowStr(p: number | null): string {
  return p == null ? "—" : `${p >= 0 ? "+" : ""}${p}% WoW`;
}

export async function founderReport(): Promise<FounderReport> {
  const now = Date.now();
  const a = await growthDashboard();
  const health = await marketingHealth();
  const editions = allEditions();
  const weeklies = allWeeklies();
  const lib = libraryStats();

  // ── Windowed visitor/signup/engagement series for WoW + MoM ────────────────
  let pageRows: { path: string | null; session_id: string | null; is_new: boolean | null; created_at: string }[] = [];
  let signupRows: { created_at: string }[] = [];
  let engRows: { created_at: string; props: Record<string, unknown> }[] = [];
  if (supabaseConfigured) {
    pageRows = (await sbSelect("events?select=path,session_id,is_new,created_at&name=eq.page_view&order=created_at.desc&limit=20000")) ?? [];
    signupRows = (await sbSelect("events?select=created_at&name=eq.signup&order=created_at.desc&limit=20000")) ?? [];
    engRows = (await sbSelect("events?select=created_at,props&name=eq.engagement&order=created_at.desc&limit=20000")) ?? [];
  }

  const visitorsIn = (loDays: number, hiDays: number) => {
    const lo = now - loDays * DAY;
    const hi = now - hiDays * DAY;
    const s = new Set<string>();
    for (const r of pageRows) {
      const t = Date.parse(r.created_at);
      if (t >= lo && t < hi && r.session_id) s.add(r.session_id);
    }
    return s.size;
  };
  const countIn = (rows: { created_at: string }[], loDays: number, hiDays: number) => {
    const lo = now - loDays * DAY;
    const hi = now - hiDays * DAY;
    return rows.filter((r) => { const t = Date.parse(r.created_at); return t >= lo && t < hi; }).length;
  };
  const researchViewsIn = (loDays: number, hiDays: number) => {
    const lo = now - loDays * DAY;
    const hi = now - hiDays * DAY;
    return pageRows.filter((r) => { const t = Date.parse(r.created_at); return t >= lo && t < hi && r.path?.startsWith("/research"); }).length;
  };
  const avgSessionIn = (loDays: number, hiDays: number) => {
    const lo = now - loDays * DAY;
    const hi = now - hiDays * DAY;
    let s = 0, n = 0;
    for (const r of engRows) {
      const t = Date.parse(r.created_at);
      const sec = Number(r.props?.seconds);
      if (t >= lo && t < hi && Number.isFinite(sec)) { s += sec; n++; }
    }
    return n ? s / n : 0;
  };

  const visW = visitorsIn(7, 0), visP = visitorsIn(14, 7);
  const visM = visitorsIn(30, 0), visMp = visitorsIn(60, 30);
  const sgnW = countIn(signupRows, 7, 0), sgnP = countIn(signupRows, 14, 7);
  const sgnM = countIn(signupRows, 30, 0), sgnMp = countIn(signupRows, 60, 30);
  const convW = visW ? (sgnW / visW) * 100 : 0;
  const convP = visP ? (sgnP / visP) * 100 : 0;
  const newVisW = pageRows.filter((r) => { const t = Date.parse(r.created_at); return t >= now - 7 * DAY && r.is_new === true; }).length;
  const returningW = Math.max(0, visW - newVisW);
  const sessW = avgSessionIn(7, 0), sessP = avgSessionIn(14, 7);
  const libW = researchViewsIn(7, 0), libP = researchViewsIn(14, 7);

  // ── Content / research aggregates ──────────────────────────────────────────
  const edScores = editions.map((e) => e.contextScore.score);
  const avgCtx = edScores.length ? Math.round(edScores.reduce((s, x) => s + x, 0) / edScores.length) : null;
  const hiCtx = edScores.length ? Math.max(...edScores) : null;
  const loCtx = edScores.length ? Math.min(...edScores) : null;
  const healthMode = (() => {
    const m = new Map<string, number>();
    for (const e of editions) m.set(e.metrics.accumulationBand, (m.get(e.metrics.accumulationBand) ?? 0) + 1);
    return [...m.entries()].sort((x, y) => y[1] - x[1])[0]?.[0]?.replace("Historically ", "") ?? "—";
  })();
  const dailyPublished7 = editions.filter((e) => Date.parse(`${e.slug}T00:00:00Z`) >= now - 7 * DAY).length;
  const weeklyPublished7 = weeklies.filter((w) => Date.parse(`${w.generatedAt}T00:00:00Z`) >= now - 7 * DAY).length;

  const g = a.growth;
  const bestCampaign = [...g.campaigns].filter((c) => c.signups > 0).sort((x, y) => (x.cps ?? Infinity) - (y.cps ?? Infinity))[0];
  const topCampaignByVol = [...g.campaigns].sort((x, y) => y.signups - x.signups || y.visitors - x.visitors)[0];
  const variantsRanked = [...g.variants].filter((v) => v.views > 0).sort((x, y) => (y.cvr ?? 0) - (x.cvr ?? 0));
  const bestVar = variantsRanked[0], secondVar = variantsRanked[1];
  const varLift = bestVar && secondVar && (secondVar.cvr ?? 0) > 0 ? Math.round((((bestVar.cvr ?? 0) - (secondVar.cvr ?? 0)) / (secondVar.cvr ?? 1)) * 100) : null;
  const topCTA = g.topCTAs[0];
  const topSource = a.landing.topSources[0];
  const topResearchFeature = a.research?.topFeatures?.[0];
  const overallCps = g.adSpendTotal > 0 && a.landing.signups > 0 ? Math.round((g.adSpendTotal / a.landing.signups) * 100) / 100 : null;

  // ── Section 1: Executive summary (3 bullets) ───────────────────────────────
  const executive: string[] = [];
  executive.push(`Visitors ${wowStr(pct(visW, visP))} (${visW.toLocaleString()} this week).`);
  executive.push(`${sgnW} new subscriber${sgnW === 1 ? "" : "s"} (${wowStr(pct(sgnW, sgnP))}); conversion ${convW.toFixed(1)}% (${wowStr(pct(Math.round(convW * 10), Math.round(convP * 10)))}).`);
  if (bestVar && varLift != null && varLift > 0) executive.push(`Landing Variant ${bestVar.variant.toUpperCase()} is the strongest converter (+${varLift}% vs next).`);
  else if (bestCampaign) executive.push(`${bestCampaign.campaign} is the most cost-efficient campaign${bestCampaign.cps != null ? ` at £${bestCampaign.cps}/sub` : ""}.`);
  else executive.push(`Marketing Health is ${health.overallLabel.toLowerCase()} (${health.score}/10).`);

  // ── Section 2: Growth ──────────────────────────────────────────────────────
  const growth: ReportRow[] = [
    { label: "Visitors", value: visW.toLocaleString(), sub: wowStr(pct(visW, visP)) },
    { label: "Returning visitors", value: returningW.toLocaleString() },
    { label: "New subscribers", value: sgnW.toLocaleString(), sub: wowStr(pct(sgnW, sgnP)) },
    { label: "Conversion (visitor→sub)", value: `${convW.toFixed(1)}%`, sub: wowStr(pct(Math.round(convW * 10), Math.round(convP * 10))) },
    { label: "Total subscribers", value: a.totals.subscribers != null ? a.totals.subscribers.toLocaleString() : "—" },
    { label: "Visitors · month", value: visM.toLocaleString(), sub: `${wowStr(pct(visM, visMp)).replace("WoW", "MoM")}` },
    { label: "New subscribers · month", value: sgnM.toLocaleString(), sub: `${wowStr(pct(sgnM, sgnMp)).replace("WoW", "MoM")}` },
  ];

  // ── Section 3: Marketing ───────────────────────────────────────────────────
  const marketing: ReportRow[] = [
    { label: "Top campaign (volume)", value: topCampaignByVol?.campaign ?? "—", sub: topCampaignByVol ? `${topCampaignByVol.signups} subs` : "no campaign traffic" },
    { label: "Top traffic source", value: topSource?.label ?? "—" },
    { label: "Top landing variant", value: bestVar ? `Variant ${bestVar.variant.toUpperCase()}` : "—", sub: bestVar?.cvr != null ? `${bestVar.cvr}% conv` : undefined },
    { label: "Top CTA", value: topCTA?.label ?? "—" },
    { label: "Best cost per subscriber", value: bestCampaign?.cps != null ? `£${bestCampaign.cps} (${bestCampaign.campaign})` : "—" },
    { label: "Overall cost / subscriber", value: overallCps != null ? `£${overallCps}` : "Add ad spend to compute" },
  ];

  // ── Section 4: Content ─────────────────────────────────────────────────────
  const content: ReportRow[] = [
    { label: "Most viewed research", value: a.research.topEditions[0]?.label ?? "—", sub: a.research.topEditions[0] ? `${a.research.topEditions[0].n} views` : undefined },
    { label: "Most shared edition", value: a.research.topShared[0]?.label ?? "—" },
    { label: "Most downloaded asset", value: a.mostDownloaded[0]?.label ?? "—" },
    { label: "Most popular research lens", value: topResearchFeature?.label ?? "—" },
    { label: "Most copied content", value: a.mostCopied[0]?.label ?? "—" },
  ];

  // ── Section 5: Behaviour ───────────────────────────────────────────────────
  const behaviour: ReportRow[] = [
    { label: "Avg session", value: g.avgSessionSeconds != null ? `${g.avgSessionSeconds}s` : "—" },
    { label: "Avg scroll depth", value: g.avgScroll != null ? `${g.avgScroll}%` : "—" },
    { label: "Returning share", value: visW ? `${Math.round((returningW / visW) * 100)}%` : "—" },
    { label: "Research library views", value: a.research.views.toLocaleString() },
    { label: "Most searched", value: a.research.topSearches[0]?.label ?? "—" },
    { label: "Most used filter", value: a.research.topFeatures[0]?.label ?? "—" },
    { label: "Most viewed page", value: a.topPages[0]?.label ?? "—" },
  ];

  // ── Section 6: Research engine ─────────────────────────────────────────────
  const research: ReportRow[] = [
    { label: "Daily research published", value: `${dailyPublished7} this week` },
    { label: "Weekly research published", value: `${weeklyPublished7} this week` },
    { label: "Morning editions (total)", value: lib.total.toLocaleString() },
    { label: "Research streak", value: `${lib.streak} day${lib.streak === 1 ? "" : "s"}` },
    { label: "Avg Context Score", value: avgCtx != null ? `${avgCtx}` : "—", sub: hiCtx != null ? `range ${loCtx}–${hiCtx}` : undefined },
    { label: "Most common environment", value: healthMode },
  ];

  // ── Section 8: AI insights (observations, evidence-based) ───────────────────
  const insights: string[] = [];
  if (bestVar && varLift != null && Math.abs(varLift) >= 5 && (secondVar?.views ?? 0) > 0)
    insights.push(`Variant ${bestVar.variant.toUpperCase()} converted ${varLift > 0 ? `${varLift}% better than` : `${Math.abs(varLift)}% worse than`} Variant ${secondVar.variant.toUpperCase()} — the headline change is moving the needle.`);
  if (a.research.totalEditions > 0 && a.research.topShared.length)
    insights.push(`${a.research.topShared[0].label} drew the most shares this period — your research is travelling, not just being read.`);
  if (a.accumulation.dcaChanges + a.accumulation.timelineChanges > 5)
    insights.push(`The Accumulation tools saw ${(a.accumulation.dcaChanges + a.accumulation.timelineChanges).toLocaleString()} interactions — the Dynamic DCA / timeline are becoming genuine engagement drivers.`);
  if (bestCampaign && topCampaignByVol && bestCampaign.campaign !== topCampaignByVol.campaign)
    insights.push(`Your highest-volume campaign (${topCampaignByVol.campaign}) isn't your most efficient (${bestCampaign.campaign}, £${bestCampaign.cps}/sub) — volume and efficiency are diverging.`);
  const convChange = pct(Math.round(convW * 10), Math.round(convP * 10));
  if (convChange != null && Math.abs(convChange) >= 10)
    insights.push(`Conversion ${convChange > 0 ? "rose" : "fell"} ${Math.abs(convChange)}% week-on-week — ${convChange > 0 ? "whatever changed is working" : "worth investigating the funnel before adding spend"}.`);
  if (insights.length === 0) insights.push("Traffic is still light, so patterns aren't yet reliable — insights sharpen as volume grows. Focus this week on getting consistent visitors to /start.");

  // ── Section 9: Recommendations (3, actionable) ─────────────────────────────
  const recs: string[] = [];
  if (health.overall !== "green") recs.push(`Fix Marketing Health before scaling spend: ${health.checks.filter((c) => c.status !== "ok").map((c) => c.system).slice(0, 3).join(", ")}.`);
  if (bestVar && varLift != null && varLift >= 20 && (bestVar.views ?? 0) >= 100) recs.push(`Promote Variant ${bestVar.variant.toUpperCase()} toward 100% of traffic (+${varLift}% conversion, sufficient sample).`);
  if (bestCampaign?.cps != null) recs.push(`Shift budget toward ${bestCampaign.campaign} — your lowest cost per subscriber (£${bestCampaign.cps}).`);
  if (g.adSpendTotal === 0) recs.push("Enter ad spend in adSpend.ts so cost-per-subscriber and campaign ROI populate.");
  if (convChange != null && convChange <= -10) recs.push("Review the /start hero/above-the-fold and form — conversion dropped week-on-week.");
  if (a.research.topFeatures[0]) recs.push(`Lean into "${a.research.topFeatures[0].label}" — it's your most-engaged research lens; create more around it.`);
  if (recs.length < 3) recs.push("Keep publishing daily — the compounding research archive is the moat; consistency beats intensity.");
  const recommendations = recs.slice(0, 3);

  // ── Section 10: Trends ─────────────────────────────────────────────────────
  const trends: ReportTrend[] = [
    { label: "Traffic", dir: dir(visW, visP) },
    { label: "Subscribers", dir: dir(sgnW, sgnP) },
    { label: "Conversion", dir: dir(convW, convP) },
    { label: "Session duration", dir: dir(sessW, sessP) },
    { label: "Research library usage", dir: dir(libW, libP) },
  ];

  const week = (() => {
    const d = new Date(now - 7 * DAY);
    const e = new Date(now);
    const fmt = (x: Date) => x.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
    return `${fmt(d)} – ${fmt(e)}`;
  })();

  return {
    weekLabel: `Week to ${new Date(now).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })} (${week})`,
    generatedAt: new Date(now).toISOString().slice(0, 10),
    executive,
    growth,
    marketing,
    content,
    behaviour,
    research,
    health: {
      overall: health.overall,
      overallLabel: health.overallLabel,
      score: health.score,
      failing: health.checks.filter((c) => c.status !== "ok").map((c) => ({ system: c.system, detail: c.detail })),
      lastVerified: health.lastVerified,
    },
    insights,
    recommendations,
    trends,
  };
}
