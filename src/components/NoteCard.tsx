import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import type { ResearchNote } from "@/lib/researchNotes";
import type { ResearchBadge } from "@/lib/researchBadges";
import { ResearchBadges } from "./ResearchBadges";

// Card for a Research Note — used in the notes index and as related content.
// Evergreen framing: leads with the permanent HL-N id and the tier label, then
// the observation; the publication date is demoted to dim secondary metadata.

// headingLevel: h2 on the notes index (cards sit directly under the page h1),
// h3 as related content beneath an h2 section heading (PR132).
export function NoteCard({
  n,
  badges,
  headingLevel: Heading = "h3",
}: {
  n: ResearchNote;
  badges?: ResearchBadge[];
  headingLevel?: "h2" | "h3";
}) {
  let dateLabel = n.datePublished;
  try {
    dateLabel = format(new Date(n.datePublished), "d MMM yyyy");
  } catch {
    /* keep ISO */
  }
  return (
    <Link href={`/research/notes/${n.slug}`} className="card card-interactive p-5 flex flex-col h-full group">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] tracking-[0.14em] text-accent">{n.id}</span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-ink-500">Research Note</span>
      </div>
      {badges && badges.length > 0 && <ResearchBadges badges={badges} className="mt-2.5" />}
      <Heading className="mt-3 font-display text-[18px] leading-snug text-ink-50">{n.title}</Heading>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-400 flex-1">{n.summary}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent">
          Read note
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
        <span className="text-[10.5px] text-ink-600">Published {dateLabel}</span>
      </div>
    </Link>
  );
}
