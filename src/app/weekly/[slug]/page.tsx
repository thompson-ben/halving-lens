import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { WeeklyReport } from "@/components/WeeklyReport";
import { ShareButtons } from "@/components/ShareButtons";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { ArticleSubscribe } from "@/components/ArticleSubscribe";
import { getWeekly, allWeeklySlugs, allWeeklies, latestWeekly } from "@/lib/weekly";
import { absoluteUrl } from "@/lib/site";

const GOLD = "#d9b96a";

export function generateStaticParams() {
  return allWeeklySlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const w = getWeekly(params.slug);
  if (!w) return { title: "Weekly Research" };
  const title = `Weekly Research — ${w.weekLabel} · HalvingLens`;
  return {
    title,
    description: w.biggestStory.title,
    alternates: { canonical: `/weekly/${w.slug}` },
    openGraph: { title, description: w.biggestStory.title, url: `/weekly/${w.slug}`, type: "article" },
    twitter: { card: "summary_large_image", title, description: w.biggestStory.title },
  };
}

export default function WeeklySlugPage({ params }: { params: { slug: string } }) {
  const w = getWeekly(params.slug);
  if (!w) notFound();

  const all = allWeeklies(); // newest first
  const idx = all.findIndex((x) => x.slug === w.slug);
  const next = idx > 0 ? all[idx - 1] : null; // newer
  const prev = idx < all.length - 1 ? all[idx + 1] : null; // older
  const isLatest = latestWeekly()?.slug === w.slug;
  const url = absoluteUrl(`/weekly/${w.slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `HalvingLens Weekly Research — ${w.weekLabel}`,
    description: w.biggestStory.title,
    datePublished: w.generatedAt,
    author: { "@type": "Organization", name: "HalvingLens Research" },
    publisher: { "@type": "Organization", name: "HalvingLens" },
    url,
  };

  return (
    <div className="space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex items-center justify-between gap-4">
        <Link href="/weekly/archive" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">
          <ArrowLeft size={13} /> Weekly archive
        </Link>
        <a href={`/weekly/${w.slug}/print`} className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">
          Save as PDF
        </a>
      </div>

      <WeeklyReport w={w} liveChart={isLatest} />

      <section className="border-t border-white/[0.06] pt-6">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>Share this edition</div>
        <ShareButtons url={url} title={`HalvingLens Weekly Research: ${w.biggestStory.title}`} edition={w.edition} />
      </section>

      <nav className="grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-6">
        {prev ? (
          <Link href={`/weekly/${prev.slug}`} className="card card-interactive p-4 hover:border-accent/30">
            <div className="text-[11px] text-ink-500 inline-flex items-center gap-1"><ArrowLeft size={12} /> Previous week</div>
            <div className="mt-1 text-[13px] text-ink-200 line-clamp-1">{prev.weekLabel}</div>
          </Link>
        ) : <div />}
        {next ? (
          <Link href={`/weekly/${next.slug}`} className="card card-interactive p-4 text-right hover:border-accent/30">
            <div className="text-[11px] text-ink-500 inline-flex items-center gap-1 justify-end w-full">Next week <ArrowRight size={12} /></div>
            <div className="mt-1 text-[13px] text-ink-200 line-clamp-1">{next.weekLabel}</div>
          </Link>
        ) : <div />}
      </nav>

      <ArticleSubscribe />

      <FeedbackWidget section="weekly_edition" contentType="weekly" label="Was this weekly useful?" />
    </div>
  );
}
