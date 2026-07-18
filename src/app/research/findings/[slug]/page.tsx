import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Printer } from "lucide-react";
import type { Metadata } from "next";
import { format } from "date-fns";
import { findingBySlug, findingSlugs, relatedFindings } from "@/lib/findings";
import { findingEngagement } from "@/lib/findingsAnalytics";
import { findingBadges, findingLeaders } from "@/lib/researchBadges";
import { ResearchBadges } from "@/components/ResearchBadges";
import { SOURCE } from "@/lib/btcData";
import { findingContentPack } from "@/lib/findingContent";
import { DcaThreeWayEvidence } from "@/components/DcaThreeWayEvidence";
import { FearForwardEvidence } from "@/components/FearForwardEvidence";
import { MythReality } from "@/components/MythReality";
import { FindingShareKit } from "@/components/FindingShareKit";
import { FindingStatusBadge } from "@/components/FindingStatusBadge";
import { RecordView } from "@/components/RecordView";
import { SaveButton } from "@/components/SaveButton";
import { ResearchFindingCard } from "@/components/ResearchFindingCard";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { absoluteUrl } from "@/lib/site";

const GOLD = "#d9b96a";

export function generateStaticParams() {
  return findingSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const f = findingBySlug(params.slug);
  if (!f) return { title: "Research Finding — halvinglens.com" };
  const title = `${f.id} — ${f.title} · HalvingLens Research`;
  const desc = f.summary;
  const path = `/research/findings/${f.slug}`;
  return {
    title,
    description: desc,
    alternates: { canonical: path },
    openGraph: { title, description: desc, url: path, type: "article", images: [{ url: `${path}/opengraph-image`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description: desc },
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

export default async function FindingPage({ params }: { params: { slug: string } }) {
  const f = findingBySlug(params.slug);
  if (!f) notFound();

  const url = absoluteUrl(`/research/findings/${f.slug}`);
  const ogImagePath = `/research/findings/${f.slug}/opengraph-image`;
  const pack = findingContentPack(f);
  const related = relatedFindings(f.topics, f.slug);

  // Deterministic editorial badges from real engagement + the site's committed "today".
  const engagement = await findingEngagement();
  const leaders = findingLeaders(engagement);
  const todayISO = (SOURCE.fetchedAt ?? "").slice(0, 10);
  const badgesFor = (x: typeof f) => findingBadges(x, { engagement, leaders, todayISO });
  const tier = f.foundational ? "Foundational Research" : "Research Paper";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Report",
    headline: f.title,
    name: `${f.id} — ${f.title}`,
    description: f.summary,
    abstract: f.keyConclusion,
    datePublished: f.datePublished,
    identifier: f.id,
    inLanguage: "en",
    keywords: f.topics.join(", "),
    author: { "@type": "Organization", name: "HalvingLens Research" },
    publisher: { "@type": "Organization", name: "HalvingLens", url: absoluteUrl("/") },
    isPartOf: { "@type": "Periodical", name: "HalvingLens Research Findings" },
    url,
  };

  return (
    <article className="max-w-3xl mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RecordView kind="finding" title={`${f.id} — ${f.title}`} href={`/research/findings/${f.slug}`} />

      <div className="flex items-center justify-between gap-3">
        <Link href="/research/findings" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">
          <ArrowLeft size={13} /> Research Findings
        </Link>
        <div className="flex items-center gap-2 no-print">
          <SaveButton kind="finding" title={`${f.id} — ${f.title}`} href={`/research/findings/${f.slug}`} />
          <Link
            href={`/research/findings/${f.slug}/print`}
            className="inline-flex items-center gap-1.5 text-[12px] text-ink-500 hover:text-ink-300"
          >
            <Printer size={13} /> Print / PDF
          </Link>
        </div>
      </div>

      {/* Masthead */}
      <header className="mt-6 border-b border-white/[0.08] pb-7">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
            {tier}
          </span>
          <span className="font-mono text-[12px] tracking-[0.16em]" style={{ color: GOLD }}>
            {f.id}
          </span>
          <FindingStatusBadge status={f.status} />
        </div>
        <ResearchBadges badges={badgesFor(f)} className="mt-3" />
        <h1 className="mt-3 font-display text-[30px] lg:text-[38px] leading-[1.1] text-ink-50 tracking-tight-2">{f.title}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-200">{f.headline}</p>
        <p className="mt-3 text-[11px] text-ink-500">
          HalvingLens Research · Published {dateLabel(f.datePublished)}
          {f.status === "updated" && f.lastUpdated && <> · Updated {dateLabel(f.lastUpdated)}</>}
        </p>
        {f.status === "updated" && f.lastUpdated && (
          <p className="mt-2 text-[12px] text-ink-500">The permanent ID {f.id} is unchanged.</p>
        )}
        {f.status === "superseded" && f.supersededBy && (
          <p className="mt-2 text-[12px] text-ink-500">
            Superseded by{" "}
            <Link href={`/research/findings/${f.supersededBy.toLowerCase()}`} className="text-accent">
              {f.supersededBy}
            </Link>
            . This note remains permanently citable as {f.id}.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {f.topics.map((t) => (
            <span key={t} className="px-2.5 py-1 rounded-full text-[11px] border border-white/[0.08] text-ink-400">
              {t}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-8 space-y-10">
        {/* Summary */}
        <section>
          <SectionHead>Summary</SectionHead>
          <p className="text-[15px] leading-relaxed text-ink-300">{f.summary}</p>
        </section>

        {/* Key conclusion */}
        <section>
          <div className="card-glow p-5 sm:p-6 rounded-2xl">
            <SectionHead>Key Conclusion</SectionHead>
            <p className="text-[15.5px] leading-relaxed text-ink-100">{f.keyConclusion}</p>
          </div>
        </section>

        {/* Background */}
        <section>
          <SectionHead>Background</SectionHead>
          <div className="space-y-3">
            {f.background.map((p, i) => (
              <p key={i} className="text-[14.5px] leading-relaxed text-ink-300">{p}</p>
            ))}
          </div>
        </section>

        {/* Methodology */}
        <section>
          <SectionHead>Methodology</SectionHead>
          <ol className="space-y-2.5 list-none">
            {f.methodology.map((p, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-ink-300">
                <span className="font-mono text-[11px] text-ink-500 pt-1 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Historical evidence */}
        <section>
          <SectionHead>Historical Evidence</SectionHead>
          <div className="space-y-3 mb-5">
            {f.evidenceIntro.map((p, i) => (
              <p key={i} className="text-[14.5px] leading-relaxed text-ink-300">{p}</p>
            ))}
          </div>
          {f.evidence && (
            <div className="card p-5 sm:p-6 relative">
              {f.evidence === "dca-threeway" && <DcaThreeWayEvidence presetKey="balanced" />}
              {f.evidence === "fear-forward" && <FearForwardEvidence />}
              <div className="watermark">halvinglens.com · {f.id}</div>
            </div>
          )}
        </section>

        {/* Myth vs Reality */}
        <section>
          <SectionHead>Myth vs Reality</SectionHead>
          <MythReality myth={f.myth} reference={f.id} href={url} evidence={f.headline} />
        </section>

        {/* Limitations */}
        <section>
          <SectionHead>Limitations</SectionHead>
          <ul className="space-y-2.5">
            {f.limitations.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-ink-400">
                <span className="text-ink-600 pt-2 shrink-0 w-1 h-1 rounded-full bg-ink-600 mt-2" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Why this matters */}
        <section>
          <SectionHead>Why This Matters</SectionHead>
          <div className="space-y-3">
            {f.whyThisMatters.map((p, i) => (
              <p key={i} className="text-[14.5px] leading-relaxed text-ink-300">{p}</p>
            ))}
          </div>
        </section>

        {/* Citation + Share kit */}
        <section className="border-t border-white/[0.08] pt-7">
          <SectionHead>Cite &amp; Share</SectionHead>
          <p className="text-[13px] text-ink-400 mb-4">
            Reference this note as <span className="font-mono" style={{ color: GOLD }}>{f.id}</span>. Permanent URL:{" "}
            <span className="text-ink-300 break-all">{url}</span>
          </p>
          <FindingShareKit pack={pack} findingId={f.id} slug={f.slug} url={url} ogImagePath={ogImagePath} />
        </section>

        {/* Related research */}
        <section>
          <SectionHead>Related Research</SectionHead>
          {related.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {related.map((r) => (
                <ResearchFindingCard key={r.id} f={r} badges={badgesFor(r)} />
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {f.related.map((r) => (
              <Link key={r.href} href={r.href} className="card card-interactive p-4 group hover:border-accent/30 flex items-center justify-between gap-3">
                <span className="text-[13px] text-ink-200">{r.label}</span>
                <ArrowUpRight size={15} className="text-accent shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        <p className="text-[11px] text-ink-500 leading-relaxed border-t border-white/[0.06] pt-5">
          HalvingLens Research is educational and historical in nature. It is not investment advice, not a prediction,
          and not a recommendation to buy or sell any asset. Figures describe how mechanical rules would have behaved on
          past data, within the assumptions stated. Past behaviour is not a guide to future results.
        </p>

        <FeedbackWidget section="research_finding" contentType="finding" label="Was this research useful?" />
      </div>
    </article>
  );
}
