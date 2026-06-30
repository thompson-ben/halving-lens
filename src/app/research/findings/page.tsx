import type { Metadata } from "next";
import { ResearchFindingsLibrary } from "@/components/ResearchFindingsLibrary";
import { ResearchHubNav } from "@/components/ResearchHubNav";
import { MythReality } from "@/components/MythReality";
import { BriefSignup } from "@/components/BriefSignup";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { allFindings, findingTopics, findingStats } from "@/lib/findings";
import { findingEngagement } from "@/lib/findingsAnalytics";
import { absoluteUrl } from "@/lib/site";

const GOLD = "#d9b96a";

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

      {/* Library */}
      <section>
        <ResearchFindingsLibrary findings={findings} topics={topics} engagement={engagement} />
      </section>

      {/* Myth vs Reality series */}
      <section>
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-1.5" style={{ color: GOLD }}>
          Myth vs Reality
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
