import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ChapterCard } from "@/components/journal/ChapterCard";
import { chapters, chapterCount } from "@/lib/journal";

export const dynamic = "force-dynamic";

const DESC =
  "Every Chapter of The Journal — HalvingLens's week-by-week record of the Bitcoin cycle, preserved exactly as it was written. Historical context, never prediction.";

export const metadata = {
  title: "The Journal — Archive",
  description: DESC,
  alternates: { canonical: "/journal/archive" },
  openGraph: { title: "The Journal — Archive", description: DESC, url: "/journal/archive", type: "website" },
};

const GOLD = "#d9b96a";

export default function JournalArchivePage() {
  const all = chapters();
  const total = chapterCount();

  return (
    <div className="space-y-8">
      <Link href="/journal" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">
        <ArrowLeft size={13} /> The Journal
      </Link>

      <header className="pt-1 max-w-3xl">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>The Journal</div>
        <h1 className="font-display text-[32px] sm:text-[44px] font-medium tracking-tightest text-ink-50 leading-[1.05]">
          Every Chapter
        </h1>
        <p className="mt-4 text-[14px] text-ink-300 leading-relaxed">
          The complete record of the Bitcoin cycle, one edition per week — preserved exactly as it was written.
          {total > 0 && <span className="text-ink-100"> {total} Chapter{total === 1 ? "" : "s"} and counting.</span>}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {all.map((c) => (
          <ChapterCard key={c.slug} chapter={c} />
        ))}
      </div>

      <p className="text-[11px] text-ink-600 pt-2">
        Historical context. Not prediction. Not financial advice.
      </p>
    </div>
  );
}
