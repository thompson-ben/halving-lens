import { cookies } from "next/headers";
import { analyticsSummary, type SectionFeedback } from "@/lib/analytics";
import { AdminLogin } from "@/components/AdminLogin";
import { ExcludeToggle } from "@/components/ExcludeToggle";
import { timeAgo } from "@/lib/format";

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
      <div className="-mt-2 flex items-center gap-3 flex-wrap">
        <ExcludeToggle />
        <a
          href="/admin/content"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-accent/25 bg-accent/[0.06] text-accent text-[12.5px] hover:bg-accent/[0.1] transition-colors"
        >
          Content Pack Generator →
        </a>
      </div>
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

      <FeedbackReport feedback={a.sectionFeedback} comments={a.recentComments} />

      <p className="mt-8 text-[11px] text-ink-500">
        First-party, privacy-friendly analytics (no cookies, no PII). Counts are all-time.
      </p>
    </Shell>
  );
}

function FeedbackReport({
  feedback,
  comments,
}: {
  feedback: SectionFeedback[];
  comments: { key: string; helpful: boolean; message: string; when: string }[];
}) {
  const withVotes = feedback.filter((f) => f.total > 0);
  const topRated = [...withVotes].sort((a, b) => b.pct - a.pct || b.total - a.total).slice(0, 6);
  const lowestRated = [...withVotes].sort((a, b) => a.pct - b.pct || b.total - a.total).slice(0, 6);
  const mostFeedback = withVotes.slice(0, 6); // already sorted by total desc

  return (
    <section className="mt-10">
      <h2 className="text-[12.5px] font-medium text-ink-100 mb-4 uppercase tracking-[0.16em]">
        User feedback — &ldquo;Was this useful?&rdquo;
      </h2>
      {withVotes.length === 0 ? (
        <p className="text-[12.5px] text-ink-500">No feedback votes yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Panel title="Top rated">
              <FeedbackList items={topRated} />
            </Panel>
            <Panel title="Lowest rated">
              <FeedbackList items={lowestRated} />
            </Panel>
            <Panel title="Most feedback">
              <FeedbackList items={mostFeedback} showCountBar />
            </Panel>
          </div>
          {comments.length > 0 && (
            <div className="mt-6">
              <Panel title="Recent comments">
                <ul className="space-y-3.5">
                  {comments.map((c, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`mt-0.5 text-[12px] ${c.helpful ? "text-signal-green" : "text-signal-amber"}`}>
                        {c.helpful ? "▲" : "▼"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12.5px] text-ink-200 leading-relaxed">{c.message}</p>
                        <p className="text-[10.5px] text-ink-500 mt-0.5">
                          <span className="font-mono">{c.key}</span> · {timeAgo(c.when)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function FeedbackList({ items, showCountBar }: { items: SectionFeedback[]; showCountBar?: boolean }) {
  if (!items.length) return <p className="text-[12.5px] text-ink-500">No data yet.</p>;
  const maxTotal = Math.max(...items.map((i) => i.total), 1);
  const pctColor = (pct: number) =>
    pct >= 70 ? "text-signal-green" : pct >= 40 ? "text-signal-amber" : "text-signal-red";
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <div key={i.key}>
          <div className="flex items-center justify-between text-[12px] mb-1">
            <span className="text-ink-200 truncate mr-2 font-mono">{i.key}</span>
            <span className="tabular-nums">
              <span className={pctColor(i.pct)}>{i.pct}%</span>
              <span className="text-ink-500 ml-2">{i.total} vote{i.total === 1 ? "" : "s"}</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full ${showCountBar ? "bg-accent/70" : i.pct >= 70 ? "bg-signal-green/70" : i.pct >= 40 ? "bg-signal-amber/70" : "bg-signal-red/70"}`}
              style={{ width: `${showCountBar ? (i.total / maxTotal) * 100 : i.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
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
