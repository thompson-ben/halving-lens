import type { Metadata } from "next";
import { ResearchHubNav } from "@/components/ResearchHubNav";
import { MythReality } from "@/components/MythReality";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { allFindings } from "@/lib/findings";
import { absoluteUrl } from "@/lib/site";

const GOLD = "#d9b96a";

export const metadata: Metadata = {
  title: "Myth vs Reality — HalvingLens Research",
  description:
    "Common Bitcoin assumptions tested against the historical record. Each myth links to the full HalvingLens research paper behind it. Evidence over folklore.",
  alternates: { canonical: "/research/myths" },
  openGraph: {
    title: "Myth vs Reality — HalvingLens Research",
    description: "Common Bitcoin assumptions tested against the historical record. Evidence over folklore.",
    url: "/research/myths",
    type: "website",
  },
};

export default function ResearchMythsPage() {
  const findings = allFindings();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "HalvingLens — Myth vs Reality",
    description: "Common Bitcoin assumptions tested against the historical record, each linked to its research paper.",
    url: absoluteUrl("/research/myths"),
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

      <ResearchHubNav active="myths" />

      {/* Masthead */}
      <header className="border-b border-white/[0.08] pb-8">
        <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
          HalvingLens Research
        </div>
        <h1 className="mt-3 font-display text-[32px] lg:text-[42px] leading-[1.05] text-ink-50 tracking-tight-2">
          Myth vs Reality — evidence over folklore
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-300 max-w-2xl">
          Every myth below is a common assumption about Bitcoin, set against what the historical record in our research
          actually showed — with a link to the full paper behind each one.
        </p>
      </header>

      {/* Every myth, drawn from the papers */}
      <section className="space-y-3">
        {findings.map((f) => (
          <MythReality
            key={f.id}
            myth={f.myth}
            reference={f.id}
            href={`/research/findings/${f.slug}`}
            evidence={f.headline}
          />
        ))}
      </section>

      <FeedbackWidget section="research_myths" contentType="finding" label="Is this useful?" />
    </div>
  );
}
