import { briefFunnel, growthDashboard, proWaitlistStats, subscriberStats, type LabelCount } from "@/lib/analytics";
import { AdminLogin } from "@/components/AdminLogin";
import { SendTestEmailButton } from "@/components/SendTestEmailButton";
import { isAdmin, adminConfigured } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Growth analytics — halvinglens.com", robots: { index: false } };

// Format an average time-on-page (seconds) as a readable duration. Raw seconds
// like "1878s" are hard to read and easy to misjudge; "31m 18s" is instantly
// legible. This is dwell time (captured when the visitor leaves the page), so a
// large value usually means tabs left open — not active reading time.
function fmtDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

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

  const [a, subs, pro, funnel] = await Promise.all([growthDashboard(), subscriberStats(), proWaitlistStats(), briefFunnel()]);
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

      {/* Pro demand — the canonical waitlist count (D1). The primary number is
          COUNT(*) of pro_waitlist (one row = one unique email — the table is
          the authoritative demand count; analytics events are never counted).
          The second tile is a DIFFERENT, subordinate population: members whose
          email is also a Brief subscriber — shown as "—" whenever it cannot be
          computed completely rather than as a capped wrong number. */}
      <section className="grid grid-cols-2 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Stat label="Pro waitlist" value={pro.members} />
        <Stat label="Waitlist members who are also Brief subscribers" value={pro.alsoBriefSubscribers} />
      </section>

      {/* Brief → Dashboard qualified visits (PR2) — PROSPECTIVE measurement
          only, from the first observed marker onward. Counts and denominators;
          no optimisation reads: INSTRUMENT → ACCUMULATE → INTERPRET WHEN
          MATURE. Qualified = ≥60s engagement OR ≥2 allowlisted interactions
          in a Brief-attributed dashboard session (canonical predicate in
          briefFunnel.ts). */}
      <section className="space-y-2">
        <h2 className="eyebrow text-ink-500">Brief → Dashboard (prospective)</h2>
        <div className="grid grid-cols-3 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
          <Stat label="Brief-attributed arrivals" value={funnel.arrivals} />
          <Stat label="Qualified visits" value={funnel.qualified} />
          <Stat
            label="Qualified-visit rate"
            value={funnel.arrivals != null && funnel.qualified != null && funnel.arrivals > 0 ? `${funnel.qualified}/${funnel.arrivals} (${Math.round((funnel.qualified / funnel.arrivals) * 100)}%)` : "—"}
          />
        </div>
        <p className="text-micro text-ink-600">
          {funnel.measuringSince
            ? `Measuring since ${funnel.measuringSince} — data accumulating; no engagement conclusions at this volume.`
            : "Instrument deployed — no Brief-attributed arrival observed yet."}
          {!funnel.complete && funnel.configured ? " Partial read — figures are a floor, not a total." : ""}
        </p>
        {funnel.byCampaign.length > 0 && (
          <div className="text-caption text-ink-400 space-y-1">
            {funnel.byCampaign.map((c) => (
              <div key={c.campaign} className="flex justify-between">
                <span>{c.campaign}</span>
                <span>
                  {c.qualified}/{c.arrivals} qualified
                </span>
              </div>
            ))}
          </div>
        )}
        {funnel.clicksByLabel.length > 0 && (
          <div className="text-caption text-ink-500 space-y-1">
            <div className="text-micro text-ink-600">Brief click mix by content label (aggregate, all daily editions)</div>
            {funnel.clicksByLabel.map((l) => (
              <div key={l.label} className="flex justify-between">
                <span>{l.label}</span>
                <span>{l.n}</span>
              </div>
            ))}
          </div>
        )}
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
        <Panel title="Accumulation Index performance" subtitle="All-time · the Accumulation Index page (/accumulation). Avg time on page is dwell captured on exit, not active reading time.">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px rounded-lg border border-white/[0.06] bg-white/[0.06] overflow-hidden">
            <MiniStat label="Page views" value={acc.views} />
            <MiniStat label="Signups here" value={acc.signups} />
            <MiniStat label="Avg time on page" value={fmtDuration(acc.avgSeconds)} />
            <MiniStat label="Avg scroll" value={acc.avgScroll != null ? `${acc.avgScroll}%` : "—"} />
            <MiniStat label="DCA tweaks" value={acc.dcaChanges} />
            <MiniStat label="Timeline + copies" value={acc.timelineChanges + acc.copies} />
          </div>
        </Panel>
        <Panel title="Daily Brief performance" subtitle="All-time · the live Daily Brief page (/brief), across all visitors. Avg time on page is dwell captured on exit — not active reading time, so tabs left open inflate it.">
          <div className="grid grid-cols-3 gap-px rounded-lg border border-white/[0.06] bg-white/[0.06] overflow-hidden">
            <MiniStat label="Page views" value={brief.views} />
            <MiniStat label="Avg time on page" value={fmtDuration(brief.avgSeconds)} />
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
        <Panel title="Visitor journeys">
          <p className="text-[12.5px] text-ink-300 leading-relaxed">
            Page-view rankings answer &ldquo;which pages got traffic?&rdquo; — not &ldquo;how do visitors discover value?&rdquo;.
            That story now lives in <span className="text-ink-100">Visitor Journey Intelligence</span>: explorer rate, journey depth,
            the paths that create subscribers, exits and visitor flow.
          </p>
          <a
            href="/admin/journeys"
            className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-accent/25 bg-accent/[0.06] text-accent text-[12.5px] hover:bg-accent/[0.1] transition-colors"
          >
            Open Visitor Journey Intelligence →
          </a>
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

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="text-[12.5px] font-medium text-ink-100 uppercase tracking-[0.16em]">{title}</h2>
      {subtitle && <p className="mt-1 mb-4 text-[11px] text-ink-500 leading-relaxed normal-case tracking-normal">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
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
