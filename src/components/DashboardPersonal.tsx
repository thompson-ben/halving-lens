"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Bookmark, Clock, Sparkles } from "lucide-react";
import { getRecent, getSaved, peekLastVisit, markVisit, type PersonalItem } from "@/lib/personalize";
import { track } from "@/lib/track";

interface FindingLite {
  id: string;
  title: string;
  slug: string;
  datePublished: string;
}

// Client-rendered personalised sections of the dashboard, driven by the local
// store. Renders after mount (localStorage is client-only), so it shows a calm
// empty state on first visit and fills in as the reader explores.
export function DashboardPersonal({ findings }: { findings: FindingLite[] }) {
  const [ready, setReady] = useState(false);
  const [recent, setRecent] = useState<PersonalItem[]>([]);
  const [saved, setSaved] = useState<PersonalItem[]>([]);
  const [sinceVisit, setSinceVisit] = useState<FindingLite[]>([]);
  const [firstVisit, setFirstVisit] = useState(false);

  useEffect(() => {
    const last = peekLastVisit();
    setFirstVisit(last == null);
    if (last != null) {
      setSinceVisit(findings.filter((f) => Date.parse(`${f.datePublished}T00:00:00Z`) > last));
    }
    setRecent(getRecent());
    setSaved(getSaved());
    setReady(true);
    track("dashboard_view", {});
    markVisit(); // stamp this visit last, so "since last visit" reflects the prior one
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return <div className="card p-6 text-[13px] text-ink-500">Loading your dashboard…</div>;
  }

  const research = recent.filter((r) => r.kind === "research" || r.kind === "finding" || r.kind === "weekly");
  const metrics = recent.filter((r) => r.kind === "metric");
  const continueItem = research[0];

  return (
    <div className="space-y-10">
      {/* Since your last visit */}
      <section>
        <Head icon={<Clock size={13} />}>Since your last visit</Head>
        {firstVisit ? (
          <p className="text-[13px] text-ink-400">Welcome — this is your home for everything you read on HalvingLens. Explore the research and it&apos;ll start filling up here.</p>
        ) : sinceVisit.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sinceVisit.map((f) => (
              <Card key={f.id} href={`/research/findings/${f.slug}`} kicker={`${f.id} · new`} title={f.title} />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-ink-400">Nothing new published since you were last here. Today&apos;s brief is below.</p>
        )}
      </section>

      {/* Continue reading */}
      {continueItem && (
        <section>
          <Head icon={<BookOpen size={13} />}>Continue reading</Head>
          <Card href={continueItem.href} kicker={continueItem.kind} title={continueItem.title} />
        </section>
      )}

      {/* Saved research */}
      <section>
        <Head icon={<Bookmark size={13} />}>Saved research</Head>
        {saved.length === 0 ? (
          <p className="text-[13px] text-ink-400">Nothing saved yet. Tap “Save” on any research note to keep it here.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {saved.slice(0, 8).map((s) => (
              <Card key={s.href} href={s.href} kicker={s.kind} title={s.title} />
            ))}
          </div>
        )}
      </section>

      {/* Recently viewed research */}
      {research.length > 0 && (
        <section>
          <Head icon={<Clock size={13} />}>Recently viewed</Head>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {research.slice(0, 6).map((r) => (
              <Card key={r.href} href={r.href} kicker={r.kind} title={r.title} />
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed indicators */}
      {metrics.length > 0 && (
        <section>
          <Head icon={<Sparkles size={13} />}>Recently viewed indicators</Head>
          <div className="flex flex-wrap gap-2">
            {metrics.slice(0, 10).map((m) => (
              <Link key={m.href} href={m.href} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.08] text-[12px] text-ink-300 hover:text-ink-100 hover:border-accent/30">
                {m.title}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Head({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: "#d9b96a" }}>
      {icon}
      {children}
    </div>
  );
}

function Card({ href, kicker, title }: { href: string; kicker: string; title: string }) {
  return (
    <Link href={href} className="card card-interactive p-4 group hover:border-accent/30 flex items-start justify-between gap-3">
      <div>
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-500">{kicker}</div>
        <div className="mt-1 text-[13.5px] text-ink-100 leading-snug">{title}</div>
      </div>
      <ArrowUpRight size={15} className="text-accent shrink-0 mt-0.5" />
    </Link>
  );
}
