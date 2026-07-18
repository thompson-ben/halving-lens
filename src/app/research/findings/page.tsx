import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ResearchFindingsLibrary } from "@/components/ResearchFindingsLibrary";
import { ResearchHubNav } from "@/components/ResearchHubNav";
import { MythReality } from "@/components/MythReality";
import { ResearchFindingCard } from "@/components/ResearchFindingCard";
import { BriefSignup } from "@/components/BriefSignup";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { allFindings, findingTopics, findingStats } from "@/lib/findings";
import { findingEngagement } from "@/lib/findingsAnalytics";
import { findingBadges, findingLeaders } from "@/lib/researchBadges";
import { SOURCE } from "@/lib/btcData";
import { absoluteUrl } from "@/lib/site";

const GOLD = "#d9b96a";

// The five tiers of the research library, in reading order. `href === null`
// marks a tier that is planned but not yet populated — shown honestly as
// "In development" rather than as a live link.
const LIBRARY_TIERS: { key: string; label: string; blurb: string; href: string | null }[] = [
  { key: "foundational", label: "Foundational", blurb: "Start-here papers every reader should begin with", href: "#start-here" },
  { key: "papers", label: "Research Papers", blurb: "Full, citable findings with live evidence", href: "#library" },
  { key: "notes", label: "Research Notes", blurb: "Shorter observations from the daily desk", href: null },
  { key: "briefs", label: "Evidence Briefs (HL-E)", blurb: "One-chart answers to a single question", href: null },
  { key: "myths", label: "Myth vs Reality", blurb: "Common assumptions tested against the record", href: "/research/myths" },
];

// Rebuild engagement-driven rankings periodically (30 min) without going fully
// dynamic — keeps the library fast while the "most read / shared" sorts refresh.
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Research Findings · HalvingLens Research",
  description:
    "Original, citable Bitcoin research from HalvingLens. A permanent library of historical findings — evidence first, conclusions second. Historical context, not prediction.",
  alternates: { canonical: "/research/findings" },
  openGraph: {
    title: "Research Findings · HalvingLens Research",
    description: "Original, citable Bitcoin research. Historical context, not prediction.",
    url: "/research/findings",
    type: "website",
  },
};

export default async function ResearchFindingsPage() {
  const findings = allFindings();
  const topics = findingTopics();
  const stats = findingStats();
  const engagement = await findingEngagement();
  const leaders = findingLeaders(engagement);
  const todayISO = (SOURCE.fetchedAt ?? "").slice(0, 10);
  const foundational = findings.filter((f) => f.foundational);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "HalvingLens Research Findings",
    description: "A permanent library of original, citable Bitcoin research findings.",
    url: absoluteUrl("/research/findings"),
    hasPart: findings.map((f) => ({
      "@type": "Report",
      name: `${f.id} — ${f.title}`,
      identifier: f.id,
      datePublished: f.datePublished,
      url: absoluteUrl(`/research/findings/${f.slug}`),
    })),
  };

  return (
    <div className="space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <ResearchHubNav active="findings" />

      {/* Masthead */}
      <header className="border-b border-white/[0.08] pb-8">
        <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
          HalvingLens Research
        </div>
        <h1 className="mt-3 font-display text-[32px] lg:text-[42px] leading-[1.05] text-ink-50 tracking-tight-2">
          Research Findings
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-300 max-w-2xl">
          Original, citable Bitcoin research — a permanent library of historical discoveries. Every finding receives a
          permanent HalvingLens Research ID and is supported by the data already inside the platform. Evidence first,
          conclusions second. Historical context, not prediction.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-[12.5px]">
          <Stat label="Findings published" value={String(stats.total)} />
          <Stat label="Latest" value={stats.latestId} />
          <Stat label="Citation format" value="HL-R###" />
        </div>
      </header>

      {/* The research library — the tiers, in reading order */}
      <section>
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-1.5" style={{ color: GOLD }}>
          The research library
        </div>
        <p className="text-[13px] text-ink-400 mb-5 max-w-2xl">
          A layered library, built in tiers. Start with the foundational papers, then work outward. Tiers marked
          &ldquo;In development&rdquo; are planned but not yet published — we don&rsquo;t link to what isn&rsquo;t there.
        </p>
        <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LIBRARY_TIERS.map((t, i) => {
            const inner = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-ink-500">{String(i + 1).padStart(2, "0")}</span>
                  {t.href ? (
                    <ArrowUpRight size={14} className="text-accent shrink-0" />
                  ) : (
                    <span className="text-[9.5px] uppercase tracking-[0.14em] text-ink-600 border border-white/[0.08] rounded-full px-2 py-0.5">
                      In development
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[14px] font-medium text-ink-100">{t.label}</div>
                <div className="mt-1 text-[12px] text-ink-400 leading-relaxed">{t.blurb}</div>
              </>
            );
            return t.href ? (
              <li key={t.key}>
                <Link href={t.href} className="card card-interactive p-4 h-full block group hover:border-accent/30">
                  {inner}
                </Link>
              </li>
            ) : (
              <li key={t.key} className="card p-4 h-full opacity-70">
                {inner}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Start here — Foundational */}
      {foundational.length > 0 && (
        <section id="start-here" className="scroll-mt-24">
          <div className="text-[10.5px] uppercase tracking-[0.22em] mb-1.5" style={{ color: GOLD }}>
            Start here — Foundational
          </div>
          <p className="text-[13px] text-ink-400 mb-5 max-w-2xl">
            The paper every subscriber should read first. It sets the method and the standard for everything that follows.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {foundational.map((f) => (
              <ResearchFindingCard key={f.id} f={f} badges={findingBadges(f, { engagement, leaders, todayISO })} />
            ))}
          </div>
        </section>
      )}

      {/* Library */}
      <section id="library" className="scroll-mt-24">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
          All research papers
        </div>
        <ResearchFindingsLibrary findings={findings} topics={topics} engagement={engagement} todayISO={todayISO} />
      </section>

      {/* Myth vs Reality preview */}
      <section>
        <div className="flex items-end justify-between gap-3 mb-1.5">
          <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
            Myth vs Reality
          </div>
          <Link href="/research/myths" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent whitespace-nowrap">
            See all myths
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <p className="text-[13px] text-ink-400 mb-5 max-w-2xl">
          A recurring series: a common assumption, what the historical data actually showed, and where to read the full
          evidence.
        </p>
        <div className="space-y-3">
          {findings.map((f) => (
            <MythReality key={f.id} myth={f.myth} reference={f.id} href={`/research/findings/${f.slug}`} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="card-glow rounded-2xl p-6 sm:p-8">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-2" style={{ color: GOLD }}>
          New findings by email
        </div>
        <p className="text-[14px] text-ink-300 mb-4 max-w-xl">
          Get each new research finding when it&apos;s published, alongside the daily research brief.
        </p>
        <BriefSignup compact />
      </section>

      <FeedbackWidget section="research_findings_index" contentType="finding" label="Is this research useful?" />
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
