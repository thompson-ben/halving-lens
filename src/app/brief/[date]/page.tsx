import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { BriefBody } from "@/components/BriefBody";
import { StoredBriefBody } from "@/components/StoredBriefBody";
import { buildBrief } from "@/lib/brief";
import {
  isValidSlug,
  isToday,
  formatSlugDate,
  todaySlug,
  storedBrief,
  allBriefSlugs,
} from "@/lib/briefArchive";

// Pre-render every stored brief + today for SEO.
export function generateStaticParams() {
  return allBriefSlugs().map((date) => ({ date }));
}

export function generateMetadata({ params }: { params: { date: string } }): Metadata {
  if (!isValidSlug(params.date)) return { title: "Daily Brief" };
  const label = formatSlugDate(params.date);
  const stored = storedBrief(params.date);
  const desc = stored
    ? `${stored.headline} — Bitcoin cycle brief for ${label}.`
    : `Bitcoin cycle summary for ${label}: where Bitcoin sits in the halving cycle, in plain English.`;
  return {
    title: `Bitcoin Cycle Brief — ${label} · halvinglens.com`,
    description: desc,
    alternates: { canonical: `/brief/${params.date}` },
    openGraph: {
      title: `Bitcoin Cycle Brief — ${label}`,
      description: desc,
      url: `/brief/${params.date}`,
      type: "article",
    },
  };
}

export default function DatedBriefPage({ params }: { params: { date: string } }) {
  if (!isValidSlug(params.date)) return notFound();
  const label = formatSlugDate(params.date);

  // Today → live brief.
  if (isToday(params.date)) return <BriefBody dateLabel={label} />;

  // Stored history → the real record of that day.
  const stored = storedBrief(params.date);
  if (stored) return <StoredBriefBody brief={stored} />;

  // No record for this date.
  const b = buildBrief();
  return (
    <div className="space-y-8">
      <Link
        href="/brief/archive"
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-accent transition-colors"
      >
        <ArrowLeft size={12} /> Brief archive
      </Link>
      <header className="space-y-4">
        <span className="inline-block px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-ink-400 text-[10px] font-medium tracking-wide uppercase">
          No brief for this date
        </span>
        <h1 className="font-display text-[32px] lg:text-[44px] font-medium tracking-tightest text-ink-50 leading-[1.08]">
          Bitcoin Cycle Brief — {label}
        </h1>
        <p className="text-[14px] text-ink-300 max-w-2xl leading-relaxed">
          We don&apos;t have a stored brief for this date — the daily archive began more recently.
          The current brief for {formatSlugDate(todaySlug())} is linked below.
        </p>
        <Link href="/brief" className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-soft">
          Read today&apos;s brief ({b.date})
        </Link>
      </header>
    </div>
  );
}
