import Link from "next/link";
import { CHAPTER_ACCENT, type Chapter } from "@/lib/journal";

// The subtle publication chrome that sits atop the current Chapter (The State of
// Bitcoin), so the page reads as "Chapter N of an ongoing publication" without
// touching its content or hierarchy. Additive only; hidden in presenter mode.
export function JournalMasthead({ chapter }: { chapter: Chapter }) {
  const accent = CHAPTER_ACCENT[chapter.tone];
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap border-b border-white/[0.06] pb-3">
      <div className="flex items-center gap-2.5 text-[11px]">
        <Link href="/journal" className="uppercase tracking-[0.22em] text-ink-500 hover:text-ink-300">
          The Journal
        </Link>
        <span className="text-ink-700" aria-hidden>·</span>
        <span className="font-mono text-ink-300">Chapter {chapter.number}</span>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} aria-hidden />
      </div>
      <div className="flex items-center gap-2.5 text-[11px] text-ink-500">
        <span>{chapter.dateLabel}</span>
        <span className="text-ink-700" aria-hidden>·</span>
        <span>{chapter.readingMinutes} min read</span>
      </div>
    </div>
  );
}
