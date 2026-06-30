import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { DashboardPersonal } from "@/components/DashboardPersonal";
import { RecordView } from "@/components/RecordView";
import { editionContent } from "@/lib/emailBrief";
import { accumulationRead } from "@/lib/accumulation";
import { sentimentRead, SENTIMENT_AVAILABLE } from "@/lib/sentiment";
import { latestFindings } from "@/lib/findings";

const GOLD = "#d9b96a";

export const metadata: Metadata = {
  title: "Your HalvingLens",
  description: "Your personalised home — today's cycle read, your saved and recently viewed research, and what's changed since your last visit.",
  alternates: { canonical: "/dashboard" },
  robots: { index: false }, // personalised utility page, not for organic indexing
};

// Phase 1 dashboard: a retention "home" built around the anonymous visitor
// (local-first). Live market context is server-rendered; the personalised
// sections hydrate from the local store. Architected to upgrade to per-account
// sync when magic-link auth lands (Phase 2) without changing these surfaces.
export default function DashboardPage() {
  const e = editionContent();
  const acc = accumulationRead();
  const sr = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  const findings = latestFindings(6).map((f) => ({ id: f.id, title: f.title, slug: f.slug, datePublished: f.datePublished }));
  const suggested = latestFindings(3);

  return (
    <div className="space-y-12">
      <RecordView kind="tool" title="Your dashboard" href="/dashboard" />

      <header className="border-b border-white/[0.08] pb-7">
        <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>Your HalvingLens</div>
        <h1 className="mt-3 font-display text-[30px] lg:text-[40px] leading-[1.05] text-ink-50 tracking-tight-2">Welcome back</h1>
        <p className="mt-3 text-[14px] text-ink-300 max-w-2xl">
          Your home for the cycle — today&apos;s read, what you&apos;ve been following, and what&apos;s changed since you were
          last here. Saved privately on this device.
        </p>
      </header>

      {/* Today — live market snapshot */}
      <section>
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>Today&apos;s read</div>
        <div className="card-glow p-6 sm:p-7">
          <p className="font-display text-[19px] sm:text-[23px] text-ink-50 leading-snug max-w-3xl">{e.take}</p>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
            <Snap label="Context Score" value={`${e.contextScore.score}/100`} sub={e.contextScore.label} />
            <Snap label="Accumulation Index" value={`${acc.score}/100`} sub={acc.band.label.replace("Historically ", "")} />
            <Snap label="Fear & Greed" value={sr ? `${sr.value}` : "—"} sub={sr ? sr.band.label : "Sentiment"} />
            <Snap label="Closest moment" value={e.historicalContext ? e.historicalContext.match : "—"} sub={e.historicalContext ? `${e.historicalContext.similarity}% match` : "Similar moments"} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/brief" className="inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft">Read today&apos;s Morning Brief <ArrowUpRight size={13} /></Link>
            <span className="text-ink-600">·</span>
            <Link href="/accumulation" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">Open the Accumulation Index <ArrowUpRight size={13} /></Link>
          </div>
        </div>
      </section>

      {/* Personalised (local-first) sections */}
      <DashboardPersonal findings={findings} />

      {/* Suggested research */}
      <section>
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>Suggested research</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {suggested.map((f) => (
            <Link key={f.id} href={`/research/findings/${f.slug}`} className="card card-interactive p-4 group hover:border-accent/30">
              <div className="font-mono text-[11px] tracking-[0.14em]" style={{ color: GOLD }}>{f.id}</div>
              <div className="mt-1.5 text-[13.5px] text-ink-100 leading-snug">{f.title}</div>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-[11px] text-ink-500 border-t border-white/[0.06] pt-5 max-w-2xl">
        Your dashboard is stored privately in this browser — no account needed. Sign-in to sync across devices is coming
        soon. Historical context, not advice.
      </p>
    </div>
  );
}

function Snap({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-5">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className="mt-1.5 font-display text-[22px] text-ink-50 leading-none">{value}</div>
      <div className="mt-1.5 text-[11.5px]" style={{ color: GOLD }}>{sub}</div>
    </div>
  );
}
