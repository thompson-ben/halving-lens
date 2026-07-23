import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { type Chapter } from "@/lib/journal";

// Book-style Previous / Next chapter navigation. For the current chapter there
// is no next, so the right slot links to the full archive instead. Additive
// chrome; hidden in presenter mode.
export function ChapterNav({ prev, next }: { prev?: Chapter | null; next?: Chapter | null }) {
  return (
    <nav className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Chapter navigation">
      {prev ? (
        <Link href={prev.href} className="card card-interactive p-4 group">
          <div className="flex items-center gap-1.5 text-[11px] text-ink-500">
            <ArrowLeft size={13} /> Previous Chapter
          </div>
          <div className="mt-1.5 text-[13.5px] text-ink-100 line-clamp-1">
            <span className="font-mono text-ink-500">#{prev.number}</span> · {prev.title}
          </div>
        </Link>
      ) : (
        <span />
      )}

      {next ? (
        <Link href={next.href} className="card card-interactive p-4 group text-right">
          <div className="flex items-center justify-end gap-1.5 text-[11px] text-ink-500">
            Next Chapter <ArrowRight size={13} />
          </div>
          <div className="mt-1.5 text-[13.5px] text-ink-100 line-clamp-1">
            <span className="font-mono text-ink-500">#{next.number}</span> · {next.title}
          </div>
        </Link>
      ) : (
        <Link href="/journal/archive" className="card card-interactive p-4 group text-right">
          <div className="flex items-center justify-end gap-1.5 text-[11px] text-ink-500">
            All Chapters <BookOpen size={13} />
          </div>
          <div className="mt-1.5 text-[13.5px] text-ink-100">Browse the full Journal</div>
        </Link>
      )}
    </nav>
  );
}
