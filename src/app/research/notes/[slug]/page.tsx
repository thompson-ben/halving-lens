import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { format } from "date-fns";
import { allNotes, noteBySlug, noteSlugs, noteBadges } from "@/lib/researchNotes";
import { NoteEvidence } from "@/components/NoteEvidence";
import { NoteCard } from "@/components/NoteCard";
import { BriefShareKit } from "@/components/BriefShareKit";
import { ResearchBadges } from "@/components/ResearchBadges";
import { FindingStatusBadge } from "@/components/FindingStatusBadge";
import { RecordView } from "@/components/RecordView";
import { SaveButton } from "@/components/SaveButton";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { SOURCE } from "@/lib/btcData";
import { absoluteUrl } from "@/lib/site";

const GOLD = "#d9b96a";

export function generateStaticParams() {
  return noteSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const n = noteBySlug(params.slug);
  if (!n) return { title: "Research Note — halvinglens.com" };
  const title = `${n.id} — ${n.title} · HalvingLens Research`;
  const path = `/research/notes/${n.slug}`;
  return {
    title,
    description: n.summary,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: n.summary,
      url: path,
      type: "article",
      images: [{ url: `${path}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description: n.summary },
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

export default function NotePage({ params }: { params: { slug: string } }) {
  const n = noteBySlug(params.slug);
  if (!n) notFound();

  const url = absoluteUrl(`/research/notes/${n.slug}`);
  const ogImagePath = `/research/notes/${n.slug}/opengraph-image`;
  const todayISO = (SOURCE.fetchedAt ?? "").slice(0, 10);
  const related = allNotes().filter((x) => x.slug !== n.slug).slice(0, 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Report",
    headline: n.title,
    name: `${n.id} — ${n.title}`,
    description: n.summary,
    datePublished: n.datePublished,
    identifier: n.id,
    inLanguage: "en",
    keywords: n.topics.join(", "),
    author: { "@type": "Organization", name: "HalvingLens Research" },
    publisher: { "@type": "Organization", name: "HalvingLens", url: absoluteUrl("/") },
    isPartOf: { "@type": "Periodical", name: "HalvingLens Research Notes" },
    url,
  };

  return (
    <article className="max-w-3xl mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RecordView kind="note" title={`${n.id} — ${n.title}`} href={`/research/notes/${n.slug}`} />

      <div className="flex items-center justify-between gap-3">
        <Link href="/research/notes" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">
          <ArrowLeft size={13} /> Research Notes
        </Link>
        <div className="no-print">
          <SaveButton kind="note" title={`${n.id} — ${n.title}`} href={`/research/notes/${n.slug}`} />
        </div>
      </div>

      {/* Masthead */}
      <header className="mt-6 border-b border-white/[0.08] pb-7">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
            Research Note
          </span>
          <span className="font-mono text-[12px] tracking-[0.16em] text-accent">{n.id}</span>
          <FindingStatusBadge status={n.status} />
        </div>
        <ResearchBadges badges={noteBadges(n, todayISO)} className="mt-3" />
        <h1 className="mt-3 font-display text-[30px] lg:text-[38px] leading-[1.1] text-ink-50 tracking-tight-2">{n.title}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-200">{n.observation}</p>
        <p className="mt-3 text-[11px] text-ink-500">HalvingLens Research · Published {dateLabel(n.datePublished)}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {n.topics.map((t) => (
            <span key={t} className="px-2.5 py-1 rounded-full text-[11px] border border-white/[0.08] text-ink-400">
              {t}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-8 space-y-10">
        {/* The observation */}
        <section>
          <SectionHead>The observation</SectionHead>
          <div className="space-y-3">
            {n.body.map((p, i) => (
              <p key={i} className="text-[14.5px] leading-relaxed text-ink-300">{p}</p>
            ))}
          </div>
        </section>

        {/* Live data strip */}
        {n.metric && (
          <section>
            <SectionHead>The data</SectionHead>
            <NoteEvidence note={n} />
          </section>
        )}

        {/* Takeaway */}
        <section>
          <div className="card-glow p-5 sm:p-6 rounded-2xl">
            <SectionHead>Takeaway</SectionHead>
            <p className="text-[15.5px] leading-relaxed text-ink-100">{n.takeaway}</p>
          </div>
        </section>

        {/* Limitations */}
        <section>
          <SectionHead>Limitations</SectionHead>
          <ul className="space-y-2.5">
            {n.limitations.map((p, i) => (
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
            Reference this note as <span className="font-mono text-accent">{n.id}</span>. Permanent URL:{" "}
            <span className="text-ink-300 break-all">{url}</span>
          </p>
          <BriefShareKit briefId={n.id} question={n.title} url={url} ogImagePath={ogImagePath} />
        </section>

        {/* Related */}
        <section>
          <SectionHead>Related</SectionHead>
          {related.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              {related.map((r) => (
                <NoteCard key={r.id} n={r} badges={noteBadges(r, todayISO)} />
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {n.related.map((r) => (
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

        <FeedbackWidget section="research_note" contentType="finding" label="Was this note useful?" />
      </div>
    </article>
  );
}
