import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { AdminLogin } from "@/components/AdminLogin";
import { isAdmin, adminConfigured } from "@/lib/adminAuth";
import { IntelligenceQueue } from "@/components/IntelligenceQueue";
import { getIntelligenceQueue } from "@/lib/intelligenceStore";

export const dynamic = "force-dynamic";
export const metadata = { title: "Intelligence Queue — halvinglens.com", robots: { index: false } };

// The Founder Studio — the publishing dashboard. Today's most significant,
// genuinely publishable events, ranked, each with a recommended creative and the
// reasoning behind it. Powered by the Intelligence Events Engine (the platform's
// single source of truth for significance); Founder Alerts are simply its first
// consumer. Admin-gated, noindex.
export default async function AdminSocialPage() {
  if (!adminConfigured())
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl leading-relaxed">
          Set <code className="text-accent">ANALYTICS_DASHBOARD_KEY</code> in the environment to enable the studio.
        </p>
      </Shell>
    );
  if (!isAdmin())
    return (
      <Shell>
        <AdminLogin />
      </Shell>
    );

  const q = await getIntelligenceQueue();
  const asOf = new Date(q.generatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

  return (
    <Shell asOf={asOf}>
      <div className="-mt-2 flex items-center gap-3 flex-wrap">
        <Link
          href="/admin/content"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-accent/25 bg-accent/[0.06] text-accent text-[12.5px] hover:bg-accent/[0.1] transition-colors"
        >
          Content Pack Studio <ArrowUpRight size={13} />
        </Link>
        <span className="text-[12px] text-ink-500">{q.considered} stories evaluated · {q.events.length} publishable</span>
      </div>

      <section className="card p-5">
        <div className="mb-4">
          <h2 className="text-[13px] font-medium text-ink-100">Today&apos;s Top Intelligence</h2>
          <p className="mt-0.5 text-[11px] text-ink-500 leading-relaxed max-w-2xl">
            Genuinely publishable events only — ranked by significance, never by frequency. Each carries a recommended pack,
            suggested platforms and the reasoning behind it. Generate the creative, or snooze/dismiss to keep the queue clean.
          </p>
        </div>
        <IntelligenceQueue events={q.events} configured={q.configured} note={q.note} />
      </section>

      <p className="mt-6 pt-5 border-t border-white/[0.06] text-[11px] text-ink-500 max-w-3xl leading-relaxed">
        The Intelligence Events Engine is HalvingLens&apos; single source of truth for significance. It reads the Story Engine&apos;s
        ranked output and decides what is publishable — threshold crossings, regime changes, historically rare readings,
        confirmed narratives — then applies cooldowns, duplicate suppression, grouping and dominance rules so one excellent
        event beats several mediocre ones. Founder Alerts are one consumer; the Daily Brief, Weekly Report, Social Engine and
        future Pro/API all read the same events. Historical context, not financial advice.
      </p>
    </Shell>
  );
}

function Shell({ children, asOf }: { children: React.ReactNode; asOf?: string }) {
  return (
    <div className="space-y-5">
      <header className="pt-2">
        <Link href="/admin/metrics" className="inline-flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-ink-200 mb-4">
          <ArrowLeft size={13} /> Metrics dashboard
        </Link>
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-3">Internal · Intelligence</div>
        <h1 className="font-display text-[32px] lg:text-[40px] font-medium tracking-tightest text-ink-50">Intelligence Queue</h1>
        <p className="mt-3 text-[12.5px] text-ink-400">
          {asOf ? (
            <>the founder&apos;s publishing dashboard · as of <span className="text-ink-200 tabular-nums">{asOf} UTC</span> · what genuinely changed today.</>
          ) : (
            "What genuinely changed today — and what's worth publishing."
          )}
        </p>
      </header>
      {children}
    </div>
  );
}
