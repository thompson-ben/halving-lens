import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ChapterCard } from "@/components/journal/ChapterCard";
import { currentChapter, previousChapters, chapterCount } from "@/lib/journal";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const DESC =
  "The Journal is HalvingLens's ongoing record of the Bitcoin cycle — one edition every week, documenting where Bitcoin stands, what changed, and how our reading held up. Historical context, never prediction.";

export const metadata = {
  title: "The Journal",
  description: DESC,
  alternates: { canonical: "/journal" },
  openGraph: { title: "The Journal — HalvingLens", description: DESC, url: "/journal", type: "website" },
  twitter: { card: "summary_large_image", title: "The Journal — HalvingLens", description: DESC },
};

const GOLD = "#d9b96a";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "The Journal",
  description: DESC,
  url: absoluteUrl("/journal"),
  isPartOf: { "@type": "WebSite", name: "HalvingLens", url: absoluteUrl("/") },
};

export default function JournalPage() {
  const current = currentChapter();
  const previous = previousChapters();
  const total = chapterCount();
  const recent = previous.slice(0, 6);

  return (
    <div className="space-y-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* Masthead — introduce the publication, not the data */}
      <header className="pt-2 max-w-3xl">
        <div className="text-[10.5px] uppercase tracking-[0.24em] mb-4" style={{ color: GOLD }}>HalvingLens</div>
        <h1 className="font-display text-[40px] sm:text-[56px] font-medium tracking-tightest text-ink-50 leading-[1.04]">
          The Journal
        </h1>
        <p className="mt-5 text-[16px] sm:text-[18px] text-ink-200 leading-relaxed">
          An ongoing record of the Bitcoin cycle — one edition every week. Each Chapter documents where Bitcoin stands,
          what changed over the last seven days, and how the evidence read at that moment.
        </p>
        <p className="mt-3 text-[13.5px] text-ink-400 leading-relaxed max-w-2xl">
          Written as it happens, and kept exactly as it was written. No rewriting, no hindsight — only what the evidence
          actually said, week after week. This is Chapter {current.number}.
        </p>
      </header>

      {/* This week's Chapter — read live */}
      <section>
        <div className="text-[10.5px] uppercase tracking-[0.2em] text-accent mb-4">This week&rsquo;s Chapter</div>
        <ChapterCard chapter={current} featured />
      </section>

      {/* Previous Chapters */}
      {recent.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <div className="text-[10.5px] uppercase tracking-[0.2em] text-ink-500">Previous Chapters</div>
            <Link href="/journal/archive" className="inline-flex items-center gap-1.5 text-[12px] text-accent hover:text-accent-soft">
              All {total} Chapters <ArrowRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recent.map((c) => (
              <ChapterCard key={c.slug} chapter={c} />
            ))}
          </div>
        </section>
      )}

      {/* Why it exists */}
      <section className="card p-6 sm:p-8 max-w-3xl">
        <div className="text-[10.5px] uppercase tracking-[0.2em] mb-3" style={{ color: GOLD }}>Why the Journal exists</div>
        <p className="text-[14.5px] text-ink-200 leading-relaxed">
          Most Bitcoin commentary is written to be forgotten — and quietly edited when it&rsquo;s wrong. The Journal is
          the opposite: a permanent, week-by-week record of what the evidence suggested, preserved so it can be read
          back years later exactly as it stood. It is documentation, not prediction.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/state-of-bitcoin" className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-accent text-ink-950 text-[13px] font-medium hover:bg-accent-soft transition-colors">
            Read this week&rsquo;s Chapter <ArrowRight size={15} />
          </Link>
          <Link href="/journal/archive" className="text-[12.5px] text-ink-400 hover:text-ink-200">Browse the archive</Link>
        </div>
      </section>

      <p className="text-[11px] text-ink-600">
        Historical context. Not prediction. Not financial advice.
      </p>
    </div>
  );
}
