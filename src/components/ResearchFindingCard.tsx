import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import type { ResearchFinding } from "@/lib/findings";

// Canonical card for a Research Finding — used on the homepage feature row and in
// the Research Findings library. Leads with the permanent citation ID.

export function ResearchFindingCard({ f }: { f: ResearchFinding }) {
  let dateLabel = f.datePublished;
  try {
    dateLabel = format(new Date(f.datePublished), "d MMM yyyy");
  } catch {
    /* keep ISO */
  }
  return (
    <Link
      href={`/research/findings/${f.slug}`}
      className="card card-interactive p-5 flex flex-col h-full group"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] tracking-[0.14em] text-[#d9b96a]">{f.id}</span>
        <span className="text-[11px] text-ink-500">{dateLabel}</span>
      </div>
      <h3 className="mt-3 font-display text-[18px] leading-snug text-ink-50">{f.title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-400 flex-1">{f.summary}</p>
      <div className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-accent">
        Read research
        <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  );
}
