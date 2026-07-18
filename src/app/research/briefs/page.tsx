import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { ResearchHubNav } from "@/components/ResearchHubNav";
import { BriefCard } from "@/components/BriefCard";
import { BriefSignup } from "@/components/BriefSignup";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { allBriefs, briefStats, briefBadges } from "@/lib/evidenceBriefs";
import { SOURCE } from "@/lib/btcData";
import { absoluteUrl } from "@/lib/site";

const GOLD = "#d9b96a";

// Rebuild periodically so the live headline figures on the cards stay current.
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Evidence Briefs · HalvingLens Research",
  description:
    "One-page Bitcoin evidence briefs — a single question, a single figure recomputed live from source. Citable as HL-E###. Historical context, not prediction.",
  alternates: { canonical: "/research/briefs" },
  openGraph: {
    title: "Evidence Briefs · HalvingLens Research",
    description: "A single question, a single figure, recomputed live. Historical context, not prediction.",
    url: "/research/briefs",
    type: "website",
  },
};

export default function ResearchBriefsPage() {
  const briefs = allBriefs();
  const stats = briefStats();
  const todayISO = (SOURCE.fetchedAt ?? "").slice(0, 10);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "HalvingLens Evidence Briefs",
    description: "One-page, citable Bitcoin evidence briefs — a single question answered with a single live figure.",
    url: absoluteUrl("/research/briefs"),
    hasPart: briefs.map((b) => ({
      "@type": "Report",
      name: `${b.id} — ${b.question}`,
      identifier: b.id,
      datePublished: b.datePublished,
      url: absoluteUrl(`/research/briefs/${b.slug}`),
    })),
  };

  return (
    <div className="space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <ResearchHubNav active="briefs" />

      {/* Masthead */}
      <header className="border-b border-white/[0.08] pb-8">
        <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
          HalvingLens Research
        </div>
        <h1 className="mt-3 font-display text-[32px] lg:text-[42px] leading-[1.05] text-ink-50 tracking-tight-2">
          Evidence Briefs
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-300 max-w-2xl">
          One question. One figure. A brief is the shortest unit of HalvingLens research — a single, citable answer whose
          headline number recomputes live from the same engine behind our flagship tools, so it can never drift from the
          data. Evidence first. Historical context, not prediction.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-[12.5px]">
          <Stat label="Briefs published" value={String(stats.total)} />
          <Stat label="Latest" value={stats.latestId} />
          <Stat label="Citation format" value="HL-E###" />
        </div>
      </header>

      {/* The briefs */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {briefs.map((b) => (
            <BriefCard key={b.id} b={b} badges={briefBadges(b, todayISO)} />
          ))}
        </div>
      </section>

      {/* Link back to the papers */}
      <section className="card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] mb-1.5" style={{ color: GOLD }}>
            Go deeper
          </div>
          <p className="text-[14px] text-ink-300 max-w-xl">
            A brief is the one-number version. The full research papers carry the method, the evidence in depth, and the
            caveats.
          </p>
        </div>
        <Link href="/research/findings" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent whitespace-nowrap shrink-0">
          Research papers
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* CTA */}
      <section className="card-glow rounded-2xl p-6 sm:p-8">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-2" style={{ color: GOLD }}>
          New research by email
        </div>
        <p className="text-[14px] text-ink-300 mb-4 max-w-xl">
          Get each new brief and research finding when it&apos;s published, alongside the daily research brief.
        </p>
        <BriefSignup compact />
      </section>

      <FeedbackWidget section="research_briefs_index" contentType="finding" label="Are these briefs useful?" />
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
