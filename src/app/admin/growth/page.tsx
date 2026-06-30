import { cookies } from "next/headers";
import { growthDashboard } from "@/lib/analytics";
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
import { marketingHealth, type MarketingHealth, type HealthStatus } from "@/lib/marketingHealth";
import { AdminLogin } from "@/components/AdminLogin";
import { SendTestEmailButton } from "@/components/SendTestEmailButton";
import { weeklyStats } from "@/lib/weekly";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Growth — halvinglens.com", robots: { index: false } };

// The Monday-morning operating dashboard: only the metrics that matter for
// growth — visitors, conversion, cost-per-subscriber, campaigns, A/B winner.
export default async function GrowthPage({ searchParams }: { searchParams: { key?: string } }) {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;
  const cookieKey = cookies().get("hl_admin")?.value;
  const authed = !!expected && (cookieKey === expected || searchParams.key === expected);
  if (!authed)
    return (
      <Shell>{expected ? <AdminLogin /> : <p className="text-[14px] text-ink-300">Set ANALYTICS_DASHBOARD_KEY to enable.</p>}</Shell>
    );

  const [health, a, email, funnel, waes, v2w, referral, experiments] = await Promise.all([
    marketingHealth(),
    growthDashboard(),
    emailEngagement(),
    growthFunnel(),
    weeklyActiveEngaged(),
    visitorToWaes(),
    referralAnalytics(),
    experimentResults(),
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
        <a href="/api/admin/founder-report-preview" target="_blank" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/[0.1] text-ink-300 text-[12.5px] hover:text-ink-100 hover:border-accent/30">Preview founder report →</a>
        <SendTestEmailButton endpoint="/api/admin/send-founder-report" label="Send founder report now" />
      </div>

      {/* Marketing Health — the pre-flight checklist */}
      <MarketingHealthCard h={health} />

      {!a.configured ? (
        <p className="text-[14px] text-ink-300">Supabase isn&apos;t configured — set the keys and run supabase/analytics.sql to populate the metrics below.</p>
      ) : (
        <GrowthBody a={a} email={email} funnel={funnel} waes={waes} v2w={v2w} referral={referral} recommendations={recommendations} runningExp={runningExp} />
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
}: {
  a: Awaited<ReturnType<typeof growthDashboard>>;
  email: EmailEngagement;
  funnel: FunnelStage[];
  waes: WaesResult;
  v2w: VisitorToWaes;
  referral: ReferralAnalytics;
  recommendations: Recommendation[];
  runningExp: number;
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
          Visitor→WAES = WAES ÷ unique visitors (7d). Measured click-bridged until magic-link auth links email and web
          identities — at which point WAES becomes the exact opened-and-visited count.
        </p>
      </section>

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
        <Stat label="Subscribers" value={a.totals.subscribers} />
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
