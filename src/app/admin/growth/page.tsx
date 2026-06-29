import { cookies } from "next/headers";
import { growthDashboard } from "@/lib/analytics";
import { AdminLogin } from "@/components/AdminLogin";
import { weeklyStats } from "@/lib/weekly";

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

  const a = await growthDashboard();
  if (!a.configured)
    return <Shell><p className="text-[14px] text-ink-300">Supabase isn&apos;t configured — set the keys and run supabase/analytics.sql.</p></Shell>;

  const g = a.growth;
  const weeklies = weeklyStats();
  const overallCps = g.adSpendTotal > 0 && a.landing.signups > 0 ? Math.round((g.adSpendTotal / a.landing.signups) * 100) / 100 : null;
  const winner = [...g.variants].filter((v) => v.views >= 1).sort((x, y) => (y.cvr ?? 0) - (x.cvr ?? 0))[0];

  return (
    <Shell>
      <div className="-mt-2">
        <a href="/admin/analytics" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-accent/25 bg-accent/[0.06] text-accent text-[12.5px] hover:bg-accent/[0.1]">Full analytics →</a>
      </div>

      {/* KPI grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Stat label="Visitors · 24h" value={a.windows.visitors1} />
        <Stat label="Returning" value={a.totals.returning} />
        <Stat label="Subscribers" value={a.totals.subscribers} />
        <Stat label="Signups · 7d" value={a.windows.signups7} />
        <Stat label="Landing conv." value={a.landing.conversionRate != null ? `${a.landing.conversionRate}%` : "—"} />
        <Stat label="Cost / sub" value={overallCps != null ? `£${overallCps}` : "—"} />
        <Stat label="Avg session" value={g.avgSessionSeconds != null ? `${g.avgSessionSeconds}s` : "—"} />
        <Stat label="Avg scroll" value={g.avgScroll != null ? `${g.avgScroll}%` : "—"} />
        <Stat label="Email delivery" value={a.email.deliveryRate != null ? `${a.email.deliveryRate}%` : "—"} />
        <Stat label="Referral signups" value={g.referralSignups} />
        <Stat label="Morning editions" value={a.research.totalEditions} />
        <Stat label="Weekly reports" value={weeklies.total} />
      </section>

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

      {/* A/B variants */}
      <Panel title="Landing A/B — headline experiment">
        {g.variants.length === 0 ? (
          <p className="text-[12.5px] text-ink-500">No landing traffic yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-px rounded-lg border border-white/[0.06] bg-white/[0.06] overflow-hidden">
              <Mini label="Header" value="Views · Subs · CVR" />
              {g.variants.map((v) => (
                <Mini key={v.variant} label={`Variant ${v.variant.toUpperCase()}${winner && winner.variant === v.variant ? " · winning" : ""}`} value={`${v.views} · ${v.signups} · ${v.cvr != null ? v.cvr + "%" : "—"}`} />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-ink-500">Winner is the highest conversion-rate variant. Add experiments in src/lib/experiments.ts.</p>
          </>
        )}
      </Panel>

      <p className="mt-6 pt-5 border-t border-white/[0.06] text-[11px] text-ink-500 max-w-2xl">
        Cost-per-subscriber uses manual ad spend (src/lib/data/adSpend.ts) joined with attributed signups. Email open
        rate needs Resend webhooks (not yet wired). First-party, privacy-friendly analytics.
      </p>
    </Shell>
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
