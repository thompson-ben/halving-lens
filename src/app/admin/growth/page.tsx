import { growthDashboard, subscriberStats, type SubscriberStats } from "@/lib/analytics";
import { isAdmin, adminConfigured } from "@/lib/adminAuth";
import {
  emailEngagement,
  growthFunnel,
  weeklyActiveEngaged,
  visitorToWaes,
  growthRecommendations,
  type EmailEngagement,
  type FunnelStage,
  type WaesResult,
  type VisitorToWaes,
  type Recommendation,
} from "@/lib/growthInsights";
import { experimentResults } from "@/lib/experimentAnalytics";
import { referralAnalytics, type ReferralAnalytics } from "@/lib/referralAnalytics";
import { shareDashboard, type ShareDashboard } from "@/lib/shareAnalytics";
import { acquisitionQuality, type AcquisitionQuality } from "@/lib/acquisitionAnalytics";
import { retentionAnalytics, type RetentionAnalytics } from "@/lib/retentionAnalytics";
import { marketingHealth, type MarketingHealth, type HealthStatus } from "@/lib/marketingHealth";
import { AdminLogin } from "@/components/AdminLogin";
import { SendTestEmailButton } from "@/components/SendTestEmailButton";
import { weeklyStats } from "@/lib/weekly";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Growth — halvinglens.com", robots: { index: false } };

// The Monday-morning operating dashboard: only the metrics that matter for
// growth — visitors, conversion, cost-per-subscriber, campaigns, A/B winner.
export default async function GrowthPage() {
  if (!isAdmin())
    return (
      <Shell>{adminConfigured() ? <AdminLogin /> : <p className="text-[14px] text-ink-300">Set ANALYTICS_DASHBOARD_KEY to enable.</p>}</Shell>
    );

  const [health, a, email, funnel, waes, v2w, referral, experiments, share, acq, ret, subs] = await Promise.all([
    marketingHealth(),
    growthDashboard(),
    emailEngagement(),
    growthFunnel(),
    weeklyActiveEngaged(),
    visitorToWaes(),
    referralAnalytics(),
    experimentResults(),
    shareDashboard(),
    acquisitionQuality(),
    retentionAnalytics(),
    subscriberStats(),
  ]);
  const recommendations = growthRecommendations({
    email,
    waes,
    v2w,
    campaigns: a.growth.campaigns,
    experiments: experiments.map((e) => ({ id: e.spec.id, significant: e.significant, bestKey: e.bestKey, controlKey: e.controlKey, liftPct: e.liftPct, confidence: e.confidence, spec: { title: e.spec.title } })),
    referralSubscribers: referral.totalReferralSubscribers,
    landingConversion: a.landing.conversionRate,
  });
  const runningExp = experiments.filter((e) => e.spec.status === "running").length;

  return (
    <Shell>
      <div className="-mt-2 flex items-center gap-3 flex-wrap">
        <a href="/admin/analytics" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-accent/25 bg-accent/[0.06] text-accent text-[12.5px] hover:bg-accent/[0.1]">Full analytics →</a>
        <a href="/admin/experiments" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/[0.1] text-ink-300 text-[12.5px] hover:text-ink-100 hover:border-accent/30">Experiments →</a>
        <a href="/admin/campaigns" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/[0.1] text-ink-300 text-[12.5px] hover:text-ink-100 hover:border-accent/30">Share campaigns →</a>
        <a href="/api/admin/founder-report-preview" target="_blank" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/[0.1] text-ink-300 text-[12.5px] hover:text-ink-100 hover:border-accent/30">Preview founder report →</a>
        <SendTestEmailButton endpoint="/api/admin/send-founder-report" label="Send founder report now" />
      </div>

      {/* Marketing Health — the pre-flight checklist */}
      <MarketingHealthCard h={health} />

      {!a.configured ? (
        <p className="text-[14px] text-ink-300">Supabase isn&apos;t configured — set the keys and run supabase/analytics.sql to populate the metrics below.</p>
      ) : (
        <GrowthBody a={a} email={email} funnel={funnel} waes={waes} v2w={v2w} referral={referral} recommendations={recommendations} runningExp={runningExp} share={share} acq={acq} ret={ret} subs={subs} />
      )}
    </Shell>
  );
}

function GrowthBody({
  a,
  email,
  funnel,
  waes,
  v2w,
  referral,
  recommendations,
  runningExp,
  share,
  acq,
  ret,
  subs,
}: {
  a: Awaited<ReturnType<typeof growthDashboard>>;
  email: EmailEngagement;
  funnel: FunnelStage[];
  waes: WaesResult;
  v2w: VisitorToWaes;
  referral: ReferralAnalytics;
  recommendations: Recommendation[];
  runningExp: number;
  share: ShareDashboard;
  acq: AcquisitionQuality;
  ret: RetentionAnalytics;
  subs: SubscriberStats;
}) {
  const g = a.growth;
  const weeklies = weeklyStats();
  const overallCps = g.adSpendTotal > 0 && a.landing.signups > 0 ? Math.round((g.adSpendTotal / a.landing.signups) * 100) / 100 : null;

  return (
    <>
      {/* North Star — Weekly Active Engaged Subscribers */}
      <section className="card-glow rounded-2xl p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent">North Star · Weekly Active Engaged Subscribers</div>
            <div className="mt-2 font-display text-[40px] leading-none text-ink-50">{waes.waes.toLocaleString()}</div>
            <div className="mt-2 text-[12px] text-ink-400">
              Opened an email <span className="text-ink-500">and</span> visited the site in the last 7 days.
            </div>
          </div>
          <div className="flex gap-2">
            <Mini label="Visitor→WAES" value={v2w.current != null ? `${v2w.current}%` : "—"} />
            <Mini label="Prev 7d" value={v2w.previous != null ? `${v2w.previous}%` : "—"} />
            <Mini label="Openers · 7d" value={waes.openers7d.toLocaleString()} />
            <Mini label="Clickers · 7d" value={waes.clickers7d.toLocaleString()} />
          </div>
        </div>
        <p className="mt-3 text-[11px] text-ink-500 leading-relaxed">
          Visitor→WAES = WAES ÷ unique visitors (7d).{" "}
          {waes.basis === "linked"
            ? "WAES is now exact — opened an email AND visited via a signed-in Profile within 7 days."
            : "Measured click-bridged until signed-in Profiles link email and web identities, at which point WAES becomes the exact opened-and-visited count."}
        </p>
      </section>

      {/* Retention & habit */}
      <Panel title="Retention & habit">
        {!ret.configured ? (
          <p className="text-[12.5px] text-ink-500">Supabase not configured.</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
              <Stat label="Members" value={ret.members} />
              <Stat label="Founding" value={ret.foundingMembers} />
              <Stat label="Active · 7d" value={ret.activeThisWeek} />
              <Stat label="Avg streak" value={ret.avgCurrentStreak} />
              <Stat label="Longest streak" value={ret.longestStreak} />
              <Stat label="Returning · 7d" value={ret.returning7d} />
              <Stat label="DAU" value={ret.dau} />
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500 mb-3">Reading-streak distribution</div>
              <Bars items={ret.streakDistribution.map((b) => ({ label: b.label, n: b.count }))} empty="No members with profiles yet." />
            </div>
          </div>
        )}
      </Panel>

      {/* Recommendations engine */}
      <Panel title="What to do next — ranked by impact">
        <div className="space-y-2.5">
          {recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={`mt-0.5 shrink-0 text-[9.5px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded ${r.impact === "high" ? "bg-signal-green/15 text-signal-green" : r.impact === "medium" ? "bg-[#d9b96a]/15 text-[#d9b96a]" : "bg-white/[0.05] text-ink-400"}`}>{r.impact}</span>
              <div>
                <div className="text-[13px] text-ink-100">{r.title}</div>
                <div className="text-[12px] text-ink-400">{r.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* KPI grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Stat label="Visitors · 24h" value={a.windows.visitors1} />
        <Stat label="Returning" value={a.totals.returning} />
        <Stat label="Active subscribers" value={subs.active ?? a.totals.subscribers} />
        <Stat label="Signups · 7d" value={a.windows.signups7} />
        <Stat label="Landing conv." value={a.landing.conversionRate != null ? `${a.landing.conversionRate}%` : "—"} />
        <Stat label="Cost / sub" value={overallCps != null ? `£${overallCps}` : "—"} />
        <Stat label="Cost / CTA click" value={g.costPerCtaClick != null ? `£${g.costPerCtaClick}` : "—"} />
        <Stat label="Avg session" value={g.avgSessionSeconds != null ? `${g.avgSessionSeconds}s` : "—"} />
        <Stat label="Avg scroll" value={g.avgScroll != null ? `${g.avgScroll}%` : "—"} />
        <Stat label="Email delivery" value={a.email.deliveryRate != null ? `${a.email.deliveryRate}%` : "—"} />
        <Stat label="Email open rate" value={email.openRate != null ? `${email.openRate}%` : "—"} />
        <Stat label="Email CTR" value={email.ctr != null ? `${email.ctr}%` : "—"} />
        <Stat label="Click-to-open" value={email.ctor != null ? `${email.ctor}%` : "—"} />
        <Stat label="Referral signups" value={g.referralSignups} />
        <Stat label="Morning editions" value={a.research.totalEditions} />
      </section>

      {/* Acquisition funnel */}
      <Panel title="Acquisition funnel">
        <div className="space-y-2">
          {funnel.map((s) => (
            <div key={s.key} className="flex items-center gap-3 text-[12.5px]">
              <div className="w-40 shrink-0 text-ink-300">{s.label}</div>
              <div className="flex-1 h-3 rounded-full bg-white/[0.05] overflow-hidden">
                <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.max(2, s.pctOfTop)}%` }} />
              </div>
              <div className="w-28 text-right font-mono text-ink-100">
                {s.count.toLocaleString()}
                <span className="text-ink-500"> · {s.pctOfTop}%</span>
              </div>
              <div className="w-20 text-right font-mono text-ink-500">{s.stepPct != null ? `${s.stepPct}%` : "—"}</div>
            </div>
          ))}
        </div>
        {/* D-2 repair, made visible: each landing is measured against its OWN
            signups. The blended "Landing conv." KPI above previously counted
            every landing's visitors but only /start's signups, so /free showed
            a structural 0%. */}
        {a.landing.byLanding.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-500 mb-2">Conversion by landing</div>
            <div className="space-y-1.5">
              {a.landing.byLanding.map((l) => (
                <div key={l.landing} className="flex items-center gap-3 text-[12.5px]">
                  <div className="w-40 shrink-0 font-mono text-ink-200">{l.landing}</div>
                  <div className="flex-1 text-ink-500 font-mono">
                    {l.views.toLocaleString()} views · {l.signups.toLocaleString()} signups
                  </div>
                  <div className="w-20 text-right font-mono text-ink-100">
                    {l.conversionRate != null ? `${l.conversionRate}%` : "—"}
                  </div>
                </div>
              ))}
            </div>
            {a.landing.signupsOutsideLandings > 0 && (
              <p className="mt-2 text-[11px] text-ink-500">
                {a.landing.signupsOutsideLandings.toLocaleString()} further signups came from surfaces that are not
                measured landings (the homepage block, article subscribe forms). They are excluded from these rates
                rather than folded into them.
              </p>
            )}
          </div>
        )}
        <p className="mt-3 text-[11px] text-ink-500">Last column = step conversion from the previous stage. Opens are estimated (Apple Mail Privacy Protection inflates them); clicks are confirmed.</p>
      </Panel>

      {/* Email engagement by campaign */}
      <Panel title="Email engagement">
        {!email.configured || email.byCampaign.length === 0 ? (
          <p className="text-[12.5px] text-ink-500">No email opens or clicks recorded yet. They appear here once subscribers open/click tracked emails.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[560px]">
              <thead>
                <tr className="text-ink-500 text-[10.5px] uppercase tracking-[0.12em]">
                  <th className="text-left font-normal pb-2">Campaign</th>
                  <th className="text-right font-normal pb-2">Delivered</th>
                  <th className="text-right font-normal pb-2">Opens</th>
                  <th className="text-right font-normal pb-2">Clicks</th>
                  <th className="text-right font-normal pb-2">Open rate</th>
                </tr>
              </thead>
              <tbody>
                {email.byCampaign.map((c) => (
                  <tr key={c.campaign} className="border-t border-white/[0.06]">
                    <td className="py-2 text-ink-200 font-mono text-[11.5px]">{c.campaign}</td>
                    <td className="py-2 text-right font-mono text-ink-400">{c.delivered != null ? c.delivered.toLocaleString() : "—"}</td>
                    <td className="py-2 text-right font-mono text-ink-100">{c.opens.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono text-ink-100">{c.clicks.toLocaleString()}</td>
                    <td className="py-2 text-right font-mono text-accent">{c.openRate != null ? `${c.openRate}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {email.topCtas.length > 0 && (
              <p className="mt-3 text-[11.5px] text-ink-400">
                Most-clicked CTA: <span className="text-ink-100">{email.topCtas[0].label}</span> ({email.topCtas[0].count} clicks).
              </p>
            )}
          </div>
        )}
      </Panel>

      {/* Campaign performance / CPS */}
      <Panel title="Campaign performance (cost per subscriber)">
        {g.campaigns.length === 0 ? (
          <p className="text-[12.5px] text-ink-500">No campaign traffic yet. Point ads at /start with utm_campaign, and add spend in src/lib/data/adSpend.ts.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[520px]">
              <thead>
                <tr className="text-ink-500 text-[10.5px] uppercase tracking-[0.12em]">
                  <th className="text-left font-normal pb-2">Campaign</th>
                  <th className="text-right font-normal pb-2">Visitors</th>
                  <th className="text-right font-normal pb-2">Subscribers</th>
                  <th className="text-right font-normal pb-2">Spend</th>
                  <th className="text-right font-normal pb-2">Cost / sub</th>
                </tr>
              </thead>
              <tbody>
                {g.campaigns.map((c) => (
                  <tr key={c.campaign} className="border-t border-white/[0.06] font-mono">
                    <td className="py-2.5 text-ink-200">{c.campaign}</td>
                    <td className="py-2.5 text-right text-ink-300">{c.visitors}</td>
                    <td className="py-2.5 text-right text-ink-100">{c.signups}</td>
                    <td className="py-2.5 text-right text-ink-300">{c.spend != null ? `£${c.spend}` : "—"}</td>
                    <td className="py-2.5 text-right text-accent">{c.cps != null ? `£${c.cps}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Acquisition quality — cost per engaged user, best creative, ROI */}
      <Panel title="Acquisition quality — spend → engaged users & ROI">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden mb-5">
          <Stat label="Total spend" value={money(acq.totalSpend, acq.currency)} />
          <Stat label="Engaged users" value={acq.totalEngagedUsers} />
          <Stat label="Cost / engaged user" value={acq.costPerEngagedUser != null ? money(acq.costPerEngagedUser, acq.currency) : "—"} />
          <Stat label="Subscriber value" value={acq.subscriberValue > 0 ? money(acq.subscriberValue, acq.currency) : "unset"} />
        </div>

        {acq.campaigns.length === 0 ? (
          <p className="text-[12.5px] text-ink-500">No campaign traffic yet. Tag ads with utm_campaign / utm_content (ad) / utm_term (adset); costs come from src/lib/data/adSpend.ts.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[640px]">
              <thead>
                <tr className="text-ink-500 text-[10.5px] uppercase tracking-[0.12em]">
                  <th className="text-left font-normal pb-2">Campaign</th>
                  <th className="text-right font-normal pb-2">Visitors</th>
                  <th className="text-right font-normal pb-2">Engaged</th>
                  <th className="text-right font-normal pb-2">Subs</th>
                  <th className="text-right font-normal pb-2">Cost / sub</th>
                  <th className="text-right font-normal pb-2">Cost / engaged</th>
                  <th className="text-right font-normal pb-2">ROI</th>
                </tr>
              </thead>
              <tbody>
                {acq.campaigns.map((c) => (
                  <tr key={c.campaign} className="border-t border-white/[0.06] font-mono">
                    <td className="py-2.5 text-ink-200">{c.campaign}</td>
                    <td className="py-2.5 text-right text-ink-300">{c.visitors}</td>
                    <td className="py-2.5 text-right text-ink-300">{c.engagedUsers}</td>
                    <td className="py-2.5 text-right text-ink-100">{c.signups}</td>
                    <td className="py-2.5 text-right text-ink-300">{c.cps != null ? money(c.cps, acq.currency) : "—"}</td>
                    <td className="py-2.5 text-right text-accent">{c.cpe != null ? money(c.cpe, acq.currency) : "—"}</td>
                    <td className={`py-2.5 text-right ${c.roiPct == null ? "text-ink-500" : c.roiPct >= 0 ? "text-signal-green" : "text-signal-red"}`}>{c.roiPct != null ? `${c.roiPct}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] text-ink-500">
          Engaged user = a session that dwelled on the site (an engagement event), attributed to its campaign.
          {acq.subscriberValue > 0 ? " ROI uses your subscriber value." : " Set SUBSCRIBER_VALUE_GBP (or src/lib/data/adSpend.ts) to unlock ROI."}
        </p>
      </Panel>

      {/* Highest-converting creative + audience (Meta: utm_content / utm_term) */}
      <Panel title="Highest-converting creative & audience">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DimensionTable title="Top creatives (ad · utm_content)" rows={acq.topCreatives} />
          <DimensionTable title="Top audiences (adset · utm_term)" rows={acq.topAudiences} />
        </div>
        <p className="mt-3 text-[11px] text-ink-500">Ranked by signup conversion. Populate utm_content (ad name) and utm_term (adset name) on your ad links — see the recommended Meta structure.</p>
      </Panel>

      {/* Referral leaderboard (anonymous codes) */}
      <Panel title="Referral leaderboard">
        {referral.referrers.length === 0 ? (
          <p className="text-[12.5px] text-ink-500">No referral traffic yet. Subscribers&apos; links use /?ref=CODE; visitors and signups by code appear here. WAES-per-referrer and retention need the accounts system (Phase 2).</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="text-[11.5px] text-ink-400 mb-2">{referral.totalReferralSubscribers} referred subscriber(s) · {referral.totalReferralVisitors} referred visitor(s)</div>
            <table className="w-full text-[12.5px] min-w-[420px]">
              <thead>
                <tr className="text-ink-500 text-[10.5px] uppercase tracking-[0.12em]">
                  <th className="text-left font-normal pb-2">Code</th>
                  <th className="text-right font-normal pb-2">Visitors</th>
                  <th className="text-right font-normal pb-2">Subscribers</th>
                  <th className="text-right font-normal pb-2">Quality score</th>
                </tr>
              </thead>
              <tbody>
                {referral.referrers.map((r) => (
                  <tr key={r.code} className="border-t border-white/[0.06] font-mono">
                    <td className="py-2 text-ink-200">{r.code}</td>
                    <td className="py-2 text-right text-ink-300">{r.visitors}</td>
                    <td className="py-2 text-right text-ink-100">{r.signups}</td>
                    <td className="py-2 text-right text-accent">{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Sharing & virality */}
      <Panel title="Sharing & virality">
        {!share.insights.configured || share.insights.totalShares + share.insights.totalVisits === 0 ? (
          <p className="text-[12.5px] text-ink-500">No shares yet. Tap Share on any page (or a campaign QR); shares, QR scans and short-link visits appear here.</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
              <Stat label="Total shares" value={share.insights.totalShares} />
              <Stat label="QR scans" value={share.insights.totalScans} />
              <Stat label="Short-link visits" value={share.insights.totalVisits} />
              <Stat label="Share→visit" value={share.insights.shareToVisitPct != null ? `${share.insights.shareToVisitPct}%` : "—"} />
              <Stat label="Shares · 24h" value={share.insights.windows.daily} />
              <Stat label="Shares · 7d" value={share.insights.windows.weekly} />
              <Stat label="Shares · 30d" value={share.insights.windows.monthly} />
              <Stat label="Methods used" value={share.insights.byMethod.length} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500 mb-3">Most shared content</div>
                {share.insights.topContent.length === 0 ? (
                  <p className="text-[12px] text-ink-500">No content shared yet.</p>
                ) : (
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="text-ink-500 text-[10px] uppercase tracking-[0.12em]">
                        <th className="text-left font-normal pb-2">Page</th>
                        <th className="text-right font-normal pb-2">Shares</th>
                        <th className="text-right font-normal pb-2">Visits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {share.insights.topContent.map((c) => (
                        <tr key={c.slug} className="border-t border-white/[0.06]">
                          <td className="py-1.5 text-ink-200 truncate max-w-[220px]">{c.label}</td>
                          <td className="py-1.5 text-right font-mono text-ink-100">{c.shares}</td>
                          <td className="py-1.5 text-right font-mono text-ink-400">{c.visits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500 mb-3">Share method popularity</div>
                <Bars items={share.insights.byMethod.map((m) => ({ label: m.method, n: m.n }))} empty="No share actions yet." />
              </div>
            </div>
          </div>
        )}
      </Panel>

      {/* Founder share campaigns */}
      <Panel title="Founder share campaigns">
        <div className="mb-3">
          <a href="/admin/campaigns" className="inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft">Create / manage campaigns →</a>
        </div>
        {share.campaigns.length === 0 ? (
          <p className="text-[12.5px] text-ink-500">No campaigns yet. Create one for a networking event, business card or social profile — each gets its own branded QR and attribution.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[520px]">
              <thead>
                <tr className="text-ink-500 text-[10.5px] uppercase tracking-[0.12em]">
                  <th className="text-left font-normal pb-2">Campaign</th>
                  <th className="text-right font-normal pb-2">QR scans</th>
                  <th className="text-right font-normal pb-2">Visits</th>
                  <th className="text-right font-normal pb-2">Subscribers</th>
                  <th className="text-right font-normal pb-2">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {share.campaigns.map((c) => (
                  <tr key={c.slug} className="border-t border-white/[0.06] font-mono">
                    <td className="py-2 text-ink-200">{c.name} <span className="text-ink-500">/r/{c.slug}</span></td>
                    <td className="py-2 text-right text-ink-300">{c.scans}</td>
                    <td className="py-2 text-right text-ink-300">{c.visits}</td>
                    <td className="py-2 text-right text-ink-100">{c.subscribers}</td>
                    <td className="py-2 text-right text-accent">{c.conversionPct != null ? `${c.conversionPct}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Experiments summary */}
      <Panel title="Experiments">
        <p className="text-[12.5px] text-ink-400">
          {runningExp} experiment{runningExp === 1 ? "" : "s"} running. <a href="/admin/experiments" className="text-accent">Open the experiment dashboard →</a>
        </p>
      </Panel>

      {/* Landing Page Experiment */}
      {(() => {
        const totalViews = g.variants.reduce((s, v) => s + v.views, 0);
        const ranked = [...g.variants].filter((v) => v.views > 0).sort((a, b) => (b.cvr ?? 0) - (a.cvr ?? 0));
        const best = ranked[0];
        const second = ranked[1];
        const lift = best && second && (second.cvr ?? 0) > 0 ? Math.round((((best.cvr ?? 0) - (second.cvr ?? 0)) / (second.cvr ?? 1)) * 100) : null;
        const minViews = Math.min(...g.variants.map((v) => v.views), 0);
        const totalSubs = g.variants.reduce((s, v) => s + v.signups, 0);
        const confidence: "LOW" | "MEDIUM" | "HIGH" =
          minViews >= 200 && totalSubs >= 30 && (lift ?? 0) >= 20 ? "HIGH" : minViews >= 50 && totalSubs >= 10 ? "MEDIUM" : "LOW";
        const status = confidence === "HIGH" ? "Complete" : "Running";
        const confColor = confidence === "HIGH" ? "text-signal-green" : confidence === "MEDIUM" ? "text-signal-amber" : "text-ink-400";
        return (
          <Panel title="Landing Page Experiment — headline">
            <div className="flex items-center gap-3 mb-4 text-[12px]">
              <span className={`px-2 py-0.5 rounded-full border ${status === "Complete" ? "border-signal-green/30 text-signal-green" : "border-accent/30 text-accent"}`}>{status}</span>
              <span className="text-ink-500">Confidence:</span>
              <span className={confColor}>{confidence}</span>
              {confidence === "HIGH" && best && (
                <span className="text-ink-300">· Winner <span className="text-signal-green font-medium">Variant {best.variant.toUpperCase()}</span>{lift != null ? ` (+${lift}% conv.)` : ""}</span>
              )}
            </div>
            {g.variants.length === 0 ? (
              <p className="text-[12.5px] text-ink-500">No landing traffic yet — variants populate once /start receives visitors.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px] min-w-[520px]">
                  <thead>
                    <tr className="text-ink-500 text-[10.5px] uppercase tracking-[0.12em]">
                      <th className="text-left font-normal pb-2">Variant</th>
                      <th className="text-right font-normal pb-2">Traffic</th>
                      <th className="text-right font-normal pb-2">Visitors</th>
                      <th className="text-right font-normal pb-2">CTA clicks</th>
                      <th className="text-right font-normal pb-2">Subscribers</th>
                      <th className="text-right font-normal pb-2">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.variants.map((v) => (
                      <tr key={v.variant} className="border-t border-white/[0.06] font-mono">
                        <td className="py-2.5 text-ink-200">Variant {v.variant.toUpperCase()}{best && best.variant === v.variant && confidence !== "LOW" ? " ★" : ""}</td>
                        <td className="py-2.5 text-right text-ink-400">{totalViews ? Math.round((v.views / totalViews) * 100) : 0}%</td>
                        <td className="py-2.5 text-right text-ink-300">{v.views}</td>
                        <td className="py-2.5 text-right text-ink-300">{v.ctaClicks}</td>
                        <td className="py-2.5 text-right text-ink-100">{v.signups}</td>
                        <td className="py-2.5 text-right text-accent">{v.cvr != null ? `${v.cvr}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-[11px] text-ink-500">Confidence is a sample-size + lift heuristic (not a formal significance test). Add experiments in src/lib/experiments.ts.</p>
          </Panel>
        );
      })()}

      {/* Most effective CTA */}
      <Panel title="Most effective CTA">
        <Bars items={g.topCTAs} empty="No CTA clicks yet." />
      </Panel>

      <p className="mt-6 pt-5 border-t border-white/[0.06] text-[11px] text-ink-500 max-w-2xl">
        Cost-per-subscriber uses manual ad spend (src/lib/data/adSpend.ts) joined with attributed signups. Email open
        rate needs Resend webhooks (not yet wired). First-party, privacy-friendly analytics.
      </p>
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-3">Internal</div>
        <h1 className="font-display text-[32px] lg:text-[40px] font-medium tracking-tightest text-ink-50">Growth dashboard</h1>
        <p className="mt-3 text-[13.5px] text-ink-300 max-w-2xl">The Monday-morning operating view — conversion, cost and campaigns.</p>
      </header>
      {children}
    </div>
  );
}
function Stat({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className="mt-1.5 font-mono text-[19px] text-ink-50 tabular-nums">{value == null ? "—" : typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0b0f15] px-3.5 py-3">
      <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-400">{label}</div>
      <div className="mt-1 font-mono text-[13px] text-ink-100">{value}</div>
    </div>
  );
}
function money(n: number, currency: string): string {
  const sym = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "";
  const v = Number.isInteger(n) ? n.toLocaleString() : n.toFixed(2);
  return sym ? `${sym}${v}` : `${v} ${currency}`;
}
function DimensionTable({ title, rows }: { title: string; rows: { key: string; visitors: number; signups: number; conversionPct: number | null }[] }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500 mb-3">{title}</div>
      {rows.length === 0 ? (
        <p className="text-[12px] text-ink-500">No tagged traffic yet.</p>
      ) : (
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-ink-500 text-[10px] uppercase tracking-[0.12em]">
              <th className="text-left font-normal pb-2">Name</th>
              <th className="text-right font-normal pb-2">Visitors</th>
              <th className="text-right font-normal pb-2">Subs</th>
              <th className="text-right font-normal pb-2">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-white/[0.06]">
                <td className="py-1.5 text-ink-200 font-mono text-[11.5px] truncate max-w-[180px]">{r.key}</td>
                <td className="py-1.5 text-right font-mono text-ink-300">{r.visitors}</td>
                <td className="py-1.5 text-right font-mono text-ink-100">{r.signups}</td>
                <td className="py-1.5 text-right font-mono text-accent">{r.conversionPct != null ? `${r.conversionPct}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="text-[12.5px] font-medium text-ink-100 mb-4 uppercase tracking-[0.16em]">{title}</h2>
      {children}
    </div>
  );
}
const DOT: Record<HealthStatus, string> = { ok: "✅", warn: "🟡", fail: "🔴" };
const RAG: Record<string, { dot: string; cls: string }> = {
  green: { dot: "🟢", cls: "border-signal-green/30 bg-signal-green/[0.06]" },
  amber: { dot: "🟡", cls: "border-signal-amber/30 bg-signal-amber/[0.06]" },
  red: { dot: "🔴", cls: "border-signal-red/30 bg-signal-red/[0.06]" },
};
function MarketingHealthCard({ h }: { h: MarketingHealth }) {
  const rag = RAG[h.overall];
  const t = h.timestamps;
  const when = (iso: string | null) => (iso ? timeAgo(iso) : "—");
  return (
    <section className={`rounded-xl border ${rag.cls} p-6`}>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-400 mb-1.5">Marketing Health</div>
          <div className="font-display text-[22px] text-ink-50">{rag.dot} {h.overallLabel}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-[28px] text-ink-50 tabular-nums">{h.score}<span className="text-[15px] text-ink-500"> / 10</span></div>
          <div className="text-[10.5px] text-ink-500">checked {timeAgo(h.lastVerified)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
        {h.checks.map((c) => (
          <div key={c.system} className="flex items-center gap-2 py-1.5 border-b border-white/[0.05]">
            <span className="text-[13px]">{DOT[c.status]}</span>
            <span className="text-[13px] text-ink-200 w-40 shrink-0">{c.system}</span>
            <span className="text-[11.5px] text-ink-500 truncate">{c.detail}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-[11px]">
        <LastItem label="Daily research" v={when(t.dailyResearch)} />
        <LastItem label="Weekly research" v={when(t.weeklyResearch)} />
        <LastItem label="Last email sent" v={when(t.emailSent)} />
        <LastItem label="Last analytics event" v={when(t.analyticsEvent)} />
        <LastItem label="Last visitor" v={when(t.visitor)} />
      </div>
    </section>
  );
}
function LastItem({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-ink-500 uppercase tracking-[0.12em] text-[9.5px]">{label}</div>
      <div className="text-ink-200 mt-0.5">{v}</div>
    </div>
  );
}
function Bars({ items, empty }: { items: { label: string; n: number }[]; empty?: string }) {
  if (!items.length) return <p className="text-[12.5px] text-ink-500">{empty ?? "No data yet."}</p>;
  const max = Math.max(...items.map((i) => i.n), 1);
  return (
    <div className="space-y-2.5">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex items-center justify-between text-[12px] mb-1">
            <span className="text-ink-200 truncate mr-2 font-mono">{i.label}</span>
            <span className="text-ink-400 tabular-nums">{i.n.toLocaleString()}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-accent/70" style={{ width: `${(i.n / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
