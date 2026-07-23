import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CHAPTER_ACCENT, type Chapter } from "@/lib/journal";

// A single Chapter in the archive / on the Journal landing. Calm publication
// identity: chapter number, date, the defining headline, a one-line subtitle, a
// verdict pill, and a single meaning-bound accent (tone). Scales to hundreds.
export function ChapterCard({ chapter, featured = false }: { chapter: Chapter; featured?: boolean }) {
  const accent = CHAPTER_ACCENT[chapter.tone];
  return (
    <Link
      href={chapter.href}
      className={`card card-interactive group relative block overflow-hidden ${featured ? "p-6 sm:p-8" : "p-5"}`}
    >
      <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: accent }} aria-hidden />
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="font-mono text-ink-400">
          Chapter {chapter.number}
          {chapter.isCurrent && <span className="ml-2 text-accent">· This week, live</span>}
        </span>
        <span className="text-ink-500">{chapter.dateLabel}</span>
      </div>

      <h3
        className={`mt-3 font-display font-medium tracking-tight-2 text-ink-50 leading-snug ${featured ? "text-[24px] sm:text-[30px]" : "text-[18px]"}`}
      >
        {chapter.title}
      </h3>
      <p className={`mt-2 text-ink-400 leading-relaxed ${featured ? "text-[14px] max-w-2xl" : "text-[12.5px] line-clamp-2"}`}>
        {chapter.subtitle}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px]"
          style={{ color: accent, borderColor: `${accent}55`, background: `${accent}12` }}
        >
          {chapter.verdict}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-500">
          {chapter.readingMinutes} min read
          <ArrowUpRight size={14} className="text-accent" />
        </span>
      </div>
    </Link>
  );
}
