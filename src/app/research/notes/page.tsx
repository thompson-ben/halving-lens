import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ResearchHubNav } from "@/components/ResearchHubNav";
import { NoteCard } from "@/components/NoteCard";
import { BriefSignup } from "@/components/BriefSignup";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { allNotes, noteStats, noteBadges } from "@/lib/researchNotes";
import { SOURCE } from "@/lib/btcData";
import { absoluteUrl } from "@/lib/site";

const GOLD = "#d9b96a";

// Rebuild periodically so any live figures on the cards stay current.
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Research Notes",
  description:
    "Short, citable Bitcoin research notes — desk observations grounded in the historical record. Citable as HL-N###. Historical context, not prediction.",
  alternates: { canonical: "/research/notes" },
  openGraph: {
    title: "Research Notes",
    description: "Short desk observations grounded in the historical record. Historical context, not prediction.",
    url: "/research/notes",
    type: "website",
  },
};

export default function ResearchNotesPage() {
  const notes = allNotes();
  const stats = noteStats();
  const todayISO = (SOURCE.fetchedAt ?? "").slice(0, 10);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "HalvingLens Research Notes",
    description: "Short, citable Bitcoin research notes — desk observations grounded in the historical record.",
    url: absoluteUrl("/research/notes"),
    hasPart: notes.map((n) => ({
      "@type": "Report",
      name: `${n.id} — ${n.title}`,
      identifier: n.id,
      datePublished: n.datePublished,
      url: absoluteUrl(`/research/notes/${n.slug}`),
    })),
  };

  return (
    <div className="space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <ResearchHubNav active="notes" />

      {/* Masthead */}
      <header className="border-b border-white/[0.08] pb-8">
        <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
          HalvingLens Research
        </div>
        <h1 className="mt-3 font-display text-[32px] lg:text-[42px] leading-[1.05] text-ink-50 tracking-tight-2">
          Research Notes
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-300 max-w-2xl">
          Short observations from the desk — grounded in the historical record, quicker to publish than a full paper,
          and always more than a single figure. Each note carries a permanent, citable ID. Evidence first. Historical
          context, not prediction.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-[12.5px]">
          <Stat label="Notes published" value={String(stats.total)} />
          <Stat label="Latest" value={stats.latestId} />
          <Stat label="Citation format" value="HL-N###" />
        </div>
      </header>

      {/* The notes */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((n) => (
            <NoteCard key={n.id} n={n} badges={noteBadges(n, todayISO)} headingLevel="h2" />
          ))}
        </div>
      </section>

      {/* Where notes sit */}
      <section className="card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] mb-1.5" style={{ color: GOLD }}>
            The library
          </div>
          <p className="text-[14px] text-ink-300 max-w-xl">
            A note is a desk observation. For the single-figure version see the Evidence Briefs; for the full method and
            evidence in depth, the Research Papers.
          </p>
        </div>
        <div className="flex gap-4 shrink-0">
          <Link href="/research/briefs" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent whitespace-nowrap">
            Briefs <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/research/findings" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent whitespace-nowrap">
            Papers <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="card-glow rounded-2xl p-6 sm:p-8">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-2" style={{ color: GOLD }}>
          New research by email
        </div>
        <p className="text-[14px] text-ink-300 mb-4 max-w-xl">
          Get each new note, brief and finding when it&apos;s published, alongside the daily research brief.
        </p>
        <BriefSignup compact />
      </section>

      <FeedbackWidget section="research_notes_index" contentType="finding" label="Are these notes useful?" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-ink-500">{label}</div>
      <div className="text-ink-100 font-medium mt-0.5">{value}</div>
    </div>
  );
}
