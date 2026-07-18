import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import type { EvidenceBrief } from "@/lib/evidenceBriefs";
import { briefStat } from "@/lib/evidenceBriefs";
import type { ResearchBadge } from "@/lib/researchBadges";
import { ResearchBadges } from "./ResearchBadges";

// Card for an Evidence Brief — used in the briefs index and as related content.
// Evergreen framing: leads with the permanent HL-E id and the tier, surfaces the
// live headline figure so the one-number answer is visible before the click, and
// demotes the publication date to dim secondary metadata.

const ACCENT = "#5eead4";

export function BriefCard({ b, badges }: { b: EvidenceBrief; badges?: ResearchBadge[] }) {
  const stat = briefStat(b);
  let dateLabel = b.datePublished;
  try {
    dateLabel = format(new Date(b.datePublished), "d MMM yyyy");
  } catch {
    /* keep ISO */
  }
  return (
    <Link href={`/research/briefs/${b.slug}`} className="card card-interactive p-5 flex flex-col h-full group">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] tracking-[0.14em] text-accent">{b.id}</span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-ink-500">Evidence Brief</span>
      </div>
      {badges && badges.length > 0 && <ResearchBadges badges={badges} className="mt-2.5" />}
      <h3 className="mt-3 font-display text-[18px] leading-snug text-ink-50">{b.question}</h3>
      {stat.available && (
        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-[30px] leading-none" style={{ color: ACCENT }}>
            {stat.headline}
          </span>
          <span className="text-[12px] text-ink-400 leading-tight">{stat.statement}</span>
        </div>
      )}
      <p className="mt-3 text-[13px] leading-relaxed text-ink-400 flex-1">{b.summary}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent">
          Read brief
          <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
        <span className="text-[10.5px] text-ink-600">Published {dateLabel}</span>
      </div>
    </Link>
  );
}
