import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import type { ResearchFinding } from "@/lib/findings";
import type { ResearchBadge } from "@/lib/researchBadges";
import { ResearchBadges } from "./ResearchBadges";
import { FindingStatusBadge } from "./FindingStatusBadge";

// Canonical card for a Research Finding — used on the homepage feature row and in
// the Research Findings library. Evergreen framing: it leads with the permanent
// citation ID and the finding's tier, then the editorial badge row; the
// publication date is demoted to small, dim secondary metadata.

function tierLabel(f: ResearchFinding): string {
  return f.foundational ? "Foundational Research" : "Research Paper";
}

// headingLevel: h2 in the findings library/index (cards sit directly under the
// page h1), h3 under an h2 section (homepage feature row, related research)
// (PR132).
export function ResearchFindingCard({
  f,
  badges,
  headingLevel: Heading = "h3",
}: {
  f: ResearchFinding;
  badges?: ResearchBadge[];
  headingLevel?: "h2" | "h3";
}) {
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
        <span className="text-[10px] uppercase tracking-[0.14em] text-ink-500">{tierLabel(f)}</span>
      </div>
      {badges && badges.length > 0 && <ResearchBadges badges={badges} className="mt-2.5" />}
      <Heading className="mt-3 font-display text-[18px] leading-snug text-ink-50">{f.title}</Heading>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-400 flex-1">{f.summary}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent">
          Read research
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="text-[10.5px] text-ink-600">Published {dateLabel}</span>
          {f.status !== "active" && <FindingStatusBadge status={f.status} />}
        </span>
      </div>
    </Link>
  );
}
