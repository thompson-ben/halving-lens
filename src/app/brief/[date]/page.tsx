import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { BriefBody } from "@/components/BriefBody";
import { buildBrief } from "@/lib/brief";
import { isValidSlug, isToday, formatSlugDate, todaySlug } from "@/lib/briefArchive";

export function generateMetadata({ params }: { params: { date: string } }): Metadata {
  if (!isValidSlug(params.date)) return { title: "Brief — halving.lens" };
  const label = formatSlugDate(params.date);
  return {
    title: `Bitcoin Cycle Brief — ${label} · halving.lens`,
    description: `Bitcoin cycle summary for ${label}: where Bitcoin sits in the halving cycle, in plain English.`,
  };
}

export default function DatedBriefPage({ params }: { params: { date: string } }) {
  if (!isValidSlug(params.date)) return notFound();
  const label = formatSlugDate(params.date);

  // Briefs are generated live from the current snapshot. Past/future dates
  // aren't archived yet — show an honest state, never fabricated history.
  if (!isToday(params.date)) {
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
            Not archived yet
          </span>
          <h1 className="font-display text-[32px] lg:text-[44px] font-medium tracking-tightest text-ink-50 leading-[1.08]">
            Bitcoin Cycle Brief — {label}
          </h1>
          <p className="text-[14px] text-ink-300 max-w-2xl leading-relaxed">
            We don&apos;t have a stored brief for this date yet. The daily brief is generated live
            from the latest data — a dated archive of past briefs is being built. The current brief
            for {formatSlugDate(todaySlug())} is below.
          </p>
          <Link href="/brief" className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-soft">
            Read today&apos;s brief ({b.date})
          </Link>
        </header>
      </div>
    );
  }

  return <BriefBody dateLabel={label} />;
}
