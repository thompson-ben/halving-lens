import { cookies } from "next/headers";
import { analyticsSummary } from "@/lib/analytics";
import { AdminLogin } from "@/components/AdminLogin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Internal metrics — halvinglens.com", robots: { index: false } };

// Lightweight internal PM dashboard. Auth via a session cookie (set by a
// password box) OR a ?key= match against ANALYTICS_DASHBOARD_KEY. Noindex,
// unlinked. Reads first-party Supabase analytics.
export default async function AdminMetricsPage({
  searchParams,
}: {
  searchParams: { key?: string };
}) {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;

  if (!expected) {
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl leading-relaxed">
          Set <code className="text-accent">ANALYTICS_DASHBOARD_KEY</code> in the environment to
          enable the dashboard.
        </p>
      </Shell>
    );
  }

  const cookieKey = cookies().get("hl_admin")?.value;
  const authed = cookieKey === expected || searchParams.key === expected;
  if (!authed) {
    return (
      <Shell>
        <AdminLogin />
      </Shell>
    );
  }

  const a = await analyticsSummary();
  if (!a.configured) {
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl">
          Supabase isn&apos;t configured yet — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and run
          <code className="text-accent"> supabase/analytics.sql</code>.
        </p>
      </Shell>
    );
  }

  const helpfulPct =
    a.totals.feedbackHelpful != null && a.totals.feedbackNotHelpful != null
      ? (() => {
          const tot = (a.totals.feedbackHelpful ?? 0) + (a.totals.feedbackNotHelpful ?? 0);
          return tot ? Math.round(((a.totals.feedbackHelpful ?? 0) / tot) * 100) : null;
        })()
      : null;
  const signupConv =
    a.totals.signups != null && a.totals.sessions
      ? ((a.totals.signups / a.totals.sessions) * 100).toFixed(1)
      : null;

  return (
    <Shell>
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Stat label="Page views" value={a.totals.pageViews} />
        <Stat label="Sessions" value={a.totals.sessions} />
        <Stat label="New visitors" value={a.totals.newVisitors} />
        <Stat label="Returning" value={a.totals.sessions != null && a.totals.newVisitors != null ? Math.max(0, a.totals.sessions - a.totals.newVisitors) : null} />
        <Stat label="Signups" value={a.totals.signups} />
        <Stat label="Signup conv." value={signupConv != null ? `${signupConv}%` : "—"} />
        <Stat label="Shares" value={a.totals.shares} />
        <Stat label="Subscribers" value={a.subscribers} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Panel title="Top pages">
          <Bars items={a.topPages.map((p) => ({ label: p.path, n: p.views }))} />
        </Panel>
        <Panel title="Top sections (viewed)">
          <Bars items={a.topSections.map((s) => ({ label: s.section, n: s.views }))} />
        </Panel>
        <Panel title='"What should we build next?" votes'>
          <Bars items={a.featureVotes.map((v) => ({ label: v.feature, n: v.votes }))} />
        </Panel>
        <Panel title="Page feedback">
          <div className="flex items-baseline gap-6">
            <div>
              <div className="font-display text-[32px] text-signal-green tabular-nums">{a.totals.feedbackHelpful ?? 0}</div>
              <div className="text-[11px] text-ink-400">Helpful</div>
            </div>
            <div>
              <div className="font-display text-[32px] text-signal-amber tabular-nums">{a.totals.feedbackNotHelpful ?? 0}</div>
              <div className="text-[11px] text-ink-400">Not helpful</div>
            </div>
            {helpfulPct != null && (
              <div>
                <div className="font-display text-[32px] text-ink-100 tabular-nums">{helpfulPct}%</div>
                <div className="text-[11px] text-ink-400">Helpful rate</div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      <p className="mt-8 text-[11px] text-ink-500">
        First-party, privacy-friendly analytics (no cookies, no PII). Counts are all-time.
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
          Metrics dashboard
        </h1>
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="text-[12.5px] font-medium text-ink-100 mb-4 uppercase tracking-[0.16em]">{title}</h2>
      {children}
    </div>
  );
}

function Bars({ items }: { items: { label: string; n: number }[] }) {
  if (!items.length) return <p className="text-[12.5px] text-ink-500">No data yet.</p>;
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
