import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { format } from "date-fns";
import { allBriefs, briefBySlug, briefSlugs, briefBadges } from "@/lib/evidenceBriefs";
import { BriefEvidence } from "@/components/BriefEvidence";
import { BriefShareKit } from "@/components/BriefShareKit";
import { BriefCard } from "@/components/BriefCard";
import { ResearchBadges } from "@/components/ResearchBadges";
import { FindingStatusBadge } from "@/components/FindingStatusBadge";
import { RecordView } from "@/components/RecordView";
import { SaveButton } from "@/components/SaveButton";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { SOURCE } from "@/lib/btcData";
import { absoluteUrl } from "@/lib/site";

const GOLD = "#d9b96a";

export function generateStaticParams() {
  return briefSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const b = briefBySlug(params.slug);
  if (!b) return { title: "Evidence Brief" };
  const title = `${b.id} — ${b.question} · HalvingLens Research`;
  const path = `/research/briefs/${b.slug}`;
  return {
    title,
    description: b.summary,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: b.summary,
      url: path,
      type: "article",
      images: [{ url: `${path}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description: b.summary },
  };
}

function dateLabel(iso: string): string {
  try {
    return format(new Date(iso), "d MMMM yyyy");
  } catch {
    return iso;
  }
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>
      {children}
    </div>
  );
}

export default function BriefPage({ params }: { params: { slug: string } }) {
  const b = briefBySlug(params.slug);
  if (!b) notFound();

  const url = absoluteUrl(`/research/briefs/${b.slug}`);
  const ogImagePath = `/research/briefs/${b.slug}/opengraph-image`;
  const todayISO = (SOURCE.fetchedAt ?? "").slice(0, 10);
  const related = allBriefs().filter((x) => x.slug !== b.slug).slice(0, 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Report",
    headline: b.question,
    name: `${b.id} — ${b.question}`,
    description: b.summary,
    datePublished: b.datePublished,
    identifier: b.id,
    inLanguage: "en",
    keywords: b.topics.join(", "),
    author: { "@type": "Organization", name: "HalvingLens Research" },
    publisher: { "@type": "Organization", name: "HalvingLens", url: absoluteUrl("/") },
    isPartOf: { "@type": "Periodical", name: "HalvingLens Evidence Briefs" },
    url,
  };

  return (
    <article className="max-w-3xl mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RecordView kind="brief" title={`${b.id} — ${b.question}`} href={`/research/briefs/${b.slug}`} />

      <div className="flex items-center justify-between gap-3">
        <Link href="/research/briefs" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">
          <ArrowLeft size={13} /> Evidence Briefs
        </Link>
        <div className="no-print">
          <SaveButton kind="brief" title={`${b.id} — ${b.question}`} href={`/research/briefs/${b.slug}`} />
        </div>
      </div>

      {/* Masthead */}
      <header className="mt-6 border-b border-white/[0.08] pb-7">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
            Evidence Brief
          </span>
          <span className="font-mono text-[12px] tracking-[0.16em] text-accent">{b.id}</span>
          <FindingStatusBadge status={b.status} />
        </div>
        <ResearchBadges badges={briefBadges(b, todayISO)} className="mt-3" />
        <h1 className="mt-3 font-display text-[30px] lg:text-[38px] leading-[1.1] text-ink-50 tracking-tight-2">{b.question}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-200">{b.answer}</p>
        <p className="mt-3 text-[11px] text-ink-500">HalvingLens Research · Published {dateLabel(b.datePublished)}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {b.topics.map((t) => (
            <span key={t} className="px-2.5 py-1 rounded-full text-[11px] border border-white/[0.08] text-ink-400">
              {t}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-8 space-y-10">
        {/* The figure */}
        <section>
          <SectionHead>The evidence</SectionHead>
          <BriefEvidence brief={b} />
        </section>

        {/* Context */}
        <section>
          <SectionHead>Context</SectionHead>
          <div className="space-y-3">
            {b.context.map((p, i) => (
              <p key={i} className="text-[14.5px] leading-relaxed text-ink-300">{p}</p>
            ))}
          </div>
        </section>

        {/* Limitations */}
        <section>
          <SectionHead>Limitations</SectionHead>
          <ul className="space-y-2.5">
            {b.limitations.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-ink-400">
                <span className="shrink-0 w-1 h-1 rounded-full bg-ink-600 mt-2" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Cite & share */}
        <section className="border-t border-white/[0.08] pt-7">
          <SectionHead>Cite &amp; Share</SectionHead>
          <p className="text-[13px] text-ink-400 mb-4">
            Reference this brief as <span className="font-mono text-accent">{b.id}</span>. Permanent URL:{" "}
            <span className="text-ink-300 break-all">{url}</span>
          </p>
          <BriefShareKit briefId={b.id} question={b.question} url={url} ogImagePath={ogImagePath} />
        </section>

        {/* Related */}
        <section>
          <SectionHead>Related</SectionHead>
          {related.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {related.map((r) => (
                <BriefCard key={r.id} b={r} badges={briefBadges(r, todayISO)} />
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {b.related.map((r) => (
              <Link key={r.href} href={r.href} className="card card-interactive p-4 group hover:border-accent/30 flex items-center justify-between gap-3">
                <span className="text-[13px] text-ink-200">{r.label}</span>
                <ArrowUpRight size={15} className="text-accent shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        <p className="text-[11px] text-ink-500 leading-relaxed border-t border-white/[0.06] pt-5">
          HalvingLens Research is educational and historical in nature. It is not investment advice, not a prediction,
          and not a recommendation to buy or sell any asset. Figures describe how the historical record behaved, within
          the assumptions stated. Past behaviour is not a guide to future results.
        </p>

        <FeedbackWidget section="research_brief" contentType="finding" label="Was this brief useful?" />
      </div>
    </article>
  );
}
