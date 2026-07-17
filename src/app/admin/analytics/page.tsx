import { growthDashboard, subscriberStats, type LabelCount } from "@/lib/analytics";
import { AdminLogin } from "@/components/AdminLogin";
import { SendTestEmailButton } from "@/components/SendTestEmailButton";
import { isAdmin, adminConfigured } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Growth analytics — halvinglens.com", robots: { index: false } };

// Founder growth dashboard. Admin-only (same session cookie as /admin/metrics).
// Focused on product learning: what users value, what they share, and where the
// email list grows from. Reads first-party Supabase analytics.
export default async function AdminAnalyticsPage() {
  if (!adminConfigured()) {
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl leading-relaxed">
          Set <code className="text-accent">ANALYTICS_DASHBOARD_KEY</code> in the environment to enable the dashboard.
        </p>
      </Shell>
    );
  }
  if (!isAdmin()) {
    return (
      <Shell>
        <AdminLogin />
      </Shell>
    );
  }

  const [a, subs] = await Promise.all([growthDashboard(), subscriberStats()]);
  if (!a.configured) {
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl">
          Supabase isn&apos;t configured yet — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and run{" "}
          <code className="text-accent">supabase/analytics.sql</code>.
        </p>
      </Shell>
    );
  }

  const acc = a.accumulation;
  const email = a.email;
  const brief = a.brief;
  const research = a.research;
  const landing = a.landing;

  return (
    <Shell>
      <div className="-mt-2">
        <a
          href="/admin/metrics"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-accent/25 bg-accent/[0.06] text-accent text-[12.5px] hover:bg-accent/[0.1] transition-colors"
        >
          ← Metrics dashboard
        </a>
      </div>

      {/* Headline totals */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Stat label="Page views" value={a.totals.pageViews} />
        <Stat label="Visitors" value={a.totals.visitors} />
        <Stat label="Returning" value={a.totals.returning} />
        <Stat label="Total signups" value={a.totals.signups} />
        <Stat label="Active subscribers" value={subs.active ?? a.totals.subscribers} />
        <Stat label="Views · 7d" value={a.windows.views7} />
      </section>

      {/* Yesterday — the morning glance */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Stat label="Visitors · 24h" value={a.windows.visitors1} />
        <Stat label="Views · 24h" value={a.windows.views1} />
        <Stat label="Signups · 24h" value={a.windows.signups1} />
        <Stat label="Signups · 7d" value={a.windows.signups7} />
      </section>

      {/* Traffic trend */}
      <Panel title="Traffic — last 30 days">
        <Trend points={a.trend} />
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11.5px] text-ink-400">
          <span>7d views: <span className="text-ink-100 font-mono">{a.windows.views7.toLocaleString()}</span></span>
          <span>30d views: <span className="text-ink-100 font-mono">{a.windows.views30.toLocaleString()}</span></span>
          <span>7d signups: <span className="text-ink-100 font-mono">{a.windows.signups7.toLocaleString()}</span></span>
          <span>30d signups: <span className="text-ink-100 font-mono">{a.windows.signups30.toLocaleString()}</span></span>
        </div>
      </Panel>

      {/* Email delivery */}
      <Panel title="Email delivery">
        <div className="mb-4 flex flex-col gap-3">
          <SendTestEmailButton query="test=1" label="Send test brief to me" />
          <p className="text-[11px] text-ink-500 -mt-1">
            Sends today&apos;s brief — rendered exactly as subscribers get it — to your admin address only
            (FOUNDER_EMAIL). No subscribers are emailed. Best way to check rendering and images in your own client.
          </p>
          <div className="h-px bg-white/[0.06] my-1" />
          <SendTestEmailButton label="Send daily brief to ALL subscribers" />
          <SendTestEmailButton endpoint="/api/admin/send-weekly" label="Send weekly research to ALL subscribers" />
          <p className="text-[11px] text-ink-500">
            The two buttons above send to <span className="text-signal-amber">all active subscribers</span> now,
            bypassing the once-per-day / Sunday guards.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-lg border border-white/[0.06] bg-white/[0.06] overflow-hidden mb-4">
          <MiniStat label="Emails sent" value={email.sent} />
          <MiniStat label="Delivered" value={email.delivered} />
          <MiniStat label="Delivery rate" value={email.deliveryRate != null ? `${email.deliveryRate}%` : "—"} />
          <MiniStat label="Failure rate" value={email.failureRate != null ? `${email.failureRate}%` : "—"} />
        </div>
        {email.recent.length === 0 ? (
          <p className="text-[12.5px] text-ink-500">No sends yet — connect RESEND_API_KEY and run supabase/email.sql.</p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex text-[10px] uppercase tracking-[0.12em] text-ink-500">
              <span className="w-1/3">Date</span>
              <span className="w-1/4 text-right">Sent</span>
              <span className="w-1/4 text-right">Delivered</span>
              <span className="w-1/6 text-right">Failed</span>
            </div>
            {email.recent.map((r) => (
              <div key={r.date} className="flex text-[12px] font-mono tabular-nums">
                <span className="w-1/3 text-ink-300">{r.date}</span>
                <span className="w-1/4 text-right text-ink-200">{r.sent}</span>
                <span className="w-1/4 text-right text-signal-green">{r.delivered}</span>
                <span className={`w-1/6 text-right ${r.failed ? "text-signal-red" : "text-ink-500"}`}>{r.failed}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Page performance — Accumulation + Daily Brief */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Accumulation Index performance">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px rounded-lg border border-white/[0.06] bg-white/[0.06] overflow-hidden">
            <MiniStat label="Page views" value={acc.views} />
            <MiniStat label="Signups here" value={acc.signups} />
            <MiniStat label="Avg time" value={acc.avgSeconds != null ? `${acc.avgSeconds}s` : "—"} />
            <MiniStat label="Avg scroll" value={acc.avgScroll != null ? `${acc.avgScroll}%` : "—"} />
            <MiniStat label="DCA tweaks" value={acc.dcaChanges} />
            <MiniStat label="Timeline + copies" value={acc.timelineChanges + acc.copies} />
          </div>
        </Panel>
        <Panel title="Daily Brief performance">
          <div className="grid grid-cols-3 gap-px rounded-lg border border-white/[0.06] bg-white/[0.06] overflow-hidden">
            <MiniStat label="Page views" value={brief.views} />
            <MiniStat label="Avg time" value={brief.avgSeconds != null ? `${brief.avgSeconds}s` : "—"} />
            <MiniStat label="Avg scroll" value={brief.avgScroll != null ? `${brief.avgScroll}%` : "—"} />
          </div>
        </Panel>
      </div>

      {/* /start landing conversion */}
      <Panel title="Landing &amp; conversion (/start)">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-lg border border-white/[0.06] bg-white/[0.06] overflow-hidden mb-4">
          <MiniStat label="Landing views" value={landing.views} />
          <MiniStat label="CTA clicks" value={landing.ctaClicks} />
          <MiniStat label="Signups" value={landing.signups} />
          <MiniStat label="Conversion" value={landing.conversionRate != null ? `${landing.conversionRate}%` : "—"} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500 mb-2">Top UTM sources</div>
            <Bars items={landing.topSources} empty="No campaign traffic yet." />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500 mb-2">Top campaigns</div>
            <Bars items={landing.topCampaigns} empty="No campaigns yet." />
          </div>
        </div>
      </Panel>

      {/* Morning Research Library */}
      <Panel title="Morning Research Library">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-lg border border-white/[0.06] bg-white/[0.06] overflow-hidden mb-4">
          <MiniStat label="Editions" value={research.totalEditions} />
          <MiniStat label="Avg read" value={research.avgReadMin != null ? `${research.avgReadMin} min` : "—"} />
          <MiniStat label="Library views" value={research.views} />
          <MiniStat label="Shares" value={research.topShared.reduce((s, x) => s + x.n, 0)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500 mb-2">Most viewed editions</div>
            <Bars items={research.topEditions} empty="No edition views yet." />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500 mb-2">Most shared editions</div>
            <Bars items={research.topShared} empty="No shares yet." />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500 mb-2">Most searched terms</div>
            <Bars items={research.topSearches} empty="No searches yet." />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500 mb-2">Most filtered features</div>
            <Bars items={research.topFeatures} empty="No filters used yet." />
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Top pages">
          <Bars items={a.topPages} />
        </Panel>
        <Panel title="Top signup sources">
          <Bars items={a.topSignupSources} empty="No signups yet." />
        </Panel>
        <Panel title="Most viewed metric pages">
          <Bars items={a.topMetrics} empty="No individual metric-page views yet." />
        </Panel>
        <Panel title="Most copied content">
          <Bars items={a.mostCopied} empty="No copy events yet." />
        </Panel>
        <Panel title="Most downloaded images">
          <Bars items={a.mostDownloaded} empty="No image downloads yet." />
        </Panel>
      </div>

      <p className="mt-8 pt-6 border-t border-white/[0.06] text-[11px] text-ink-500 max-w-2xl">
        First-party, privacy-friendly analytics (no cookies, no PII). Totals are all-time unless a
        window is noted. Engagement = time on page + max scroll depth, captured when a visitor leaves
        a page.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-3">Internal</div>
        <h1 className="font-display text-[32px] lg:text-[40px] font-medium tracking-tightest text-ink-50">
          Growth analytics
        </h1>
        <p className="mt-3 text-[13.5px] text-ink-300 max-w-2xl">
          What users value, what they share, and where the email list grows from.
        </p>
      </header>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className="mt-1.5 font-mono text-[20px] text-ink-50 tabular-nums">
        {value == null ? "—" : typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string | null }) {
  return (
    <div className="bg-[#0b0f15] px-3.5 py-3">
      <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-400">{label}</div>
      <div className="mt-1 font-mono text-[16px] text-ink-50 tabular-nums">
        {value == null ? "—" : typeof value === "number" ? value.toLocaleString() : value}
      </div>
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

function Bars({ items, empty }: { items: LabelCount[]; empty?: string }) {
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

function Trend({ points }: { points: { date: string; views: number }[] }) {
  if (!points.length) return <p className="text-[12.5px] text-ink-500">No data yet.</p>;
  const max = Math.max(...points.map((p) => p.views), 1);
  return (
    <div className="flex items-end gap-[3px] h-24">
      {points.map((p) => (
        <div key={p.date} className="flex-1 group relative flex items-end" title={`${p.date}: ${p.views} views`}>
          <div
            className="w-full rounded-sm bg-accent/60 group-hover:bg-accent transition-colors"
            style={{ height: `${Math.max(2, (p.views / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}
