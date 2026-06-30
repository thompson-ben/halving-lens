import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { ResearchEdition } from "@/components/ResearchEdition";
import { ShareButtons } from "@/components/ShareButtons";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { RecordView } from "@/components/RecordView";
import { SaveButton } from "@/components/SaveButton";
import { getEdition, allEditionNumbers, adjacentEditions, relatedEditions } from "@/lib/research";
import { absoluteUrl } from "@/lib/site";

const GOLD = "#d9b96a";

// Pre-render every edition for SEO; the archive is static + permanent.
export function generateStaticParams() {
  return allEditionNumbers().map((n) => ({ n: String(n) }));
}

export function generateMetadata({ params }: { params: { n: string } }): Metadata {
  const e = getEdition(Number(params.n));
  if (!e) return { title: "Research — halvinglens.com" };
  const title = `Edition #${e.edition} — ${e.dateLabel} · HalvingLens Research`;
  const desc = e.take;
  return {
    title,
    description: desc,
    alternates: { canonical: `/research/${e.edition}` },
    openGraph: { title, description: desc, url: `/research/${e.edition}`, type: "article" },
    twitter: { card: "summary_large_image", title, description: desc },
  };
}

export default function EditionPage({ params }: { params: { n: string } }) {
  const n = Number(params.n);
  const e = getEdition(n);
  if (!e || !Number.isFinite(n)) notFound();

  const { prev, next } = adjacentEditions(n);
  const related = relatedEditions(e);
  const url = absoluteUrl(`/research/${e.edition}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `HalvingLens Research — Edition #${e.edition}`,
    description: e.take,
    datePublished: e.slug,
    author: { "@type": "Organization", name: "HalvingLens Research" },
    publisher: { "@type": "Organization", name: "HalvingLens" },
    url,
    isPartOf: { "@type": "Periodical", name: "HalvingLens Morning Research" },
    articleSection: e.feature.title,
  };

  return (
    <div className="space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RecordView kind="research" title={`Edition #${e.edition} · ${e.dateLabel}`} href={`/research/${e.edition}`} />

      <div className="flex items-center justify-between gap-3">
        <Link href="/research" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">
          <ArrowLeft size={13} /> Morning Research Library
        </Link>
        <div className="no-print">
          <SaveButton kind="research" title={`Edition #${e.edition} · ${e.dateLabel}`} href={`/research/${e.edition}`} />
        </div>
      </div>

      <ResearchEdition e={e} />

      {/* Share */}
      <section className="border-t border-white/[0.06] pt-6">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>Share this edition</div>
        <ShareButtons url={url} title={`HalvingLens Research #${e.edition}: ${e.take}`} edition={e.edition} />
      </section>

      {/* Related research */}
      {related.length > 0 && (
        <section>
          <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>Related Research</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {related.map((r) => (
              <Link key={r.edition.edition} href={`/research/${r.edition.edition}`} className="card card-interactive p-5 group hover:border-accent/30">
                <div className="text-[11px] text-ink-400">{r.label}</div>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <span className="font-display text-[15px] text-ink-100 line-clamp-2">{r.edition.take}</span>
                  <ArrowUpRight size={15} className="text-accent shrink-0" />
                </div>
                <div className="mt-2 text-[11px] font-mono" style={{ color: GOLD }}>#{r.edition.edition} · {r.edition.slug}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Prev / next */}
      <nav className="grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-6">
        {prev ? (
          <Link href={`/research/${prev.edition}`} className="card card-interactive p-4 hover:border-accent/30">
            <div className="text-[11px] text-ink-500 inline-flex items-center gap-1"><ArrowLeft size={12} /> Previous edition</div>
            <div className="mt-1 text-[13px] text-ink-200 line-clamp-1">#{prev.edition} · {prev.take}</div>
          </Link>
        ) : <div />}
        {next ? (
          <Link href={`/research/${next.edition}`} className="card card-interactive p-4 text-right hover:border-accent/30">
            <div className="text-[11px] text-ink-500 inline-flex items-center gap-1 justify-end w-full">Next edition <ArrowRight size={12} /></div>
            <div className="mt-1 text-[13px] text-ink-200 line-clamp-1">#{next.edition} · {next.take}</div>
          </Link>
        ) : <div />}
      </nav>

      <FeedbackWidget section="research_edition" contentType="research" label="Was this edition useful?" />
    </div>
  );
}
