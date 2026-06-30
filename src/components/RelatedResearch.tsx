import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { relatedFindings, type FindingTopic } from "@/lib/findings";

// Drops the relevant HL-R findings onto any page by topic, so research is
// referenced consistently across the platform. Renders nothing when no finding
// matches yet — safe to place anywhere.

const GOLD = "#d9b96a";

export function RelatedResearch({
  topics,
  exclude,
  heading = "Related Research",
  limit = 2,
  className = "",
}: {
  topics: FindingTopic[];
  exclude?: string;
  heading?: string;
  limit?: number;
  className?: string;
}) {
  const items = relatedFindings(topics, exclude, limit);
  if (!items.length) return null;
  return (
    <div className={className}>
      <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>
        {heading}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((f) => (
          <Link
            key={f.id}
            href={`/research/findings/${f.slug}`}
            className="card card-interactive p-4 group hover:border-accent/30"
          >
            <div className="font-mono text-[11px] tracking-[0.14em]" style={{ color: GOLD }}>
              {f.id}
            </div>
            <div className="mt-1.5 flex items-start justify-between gap-3">
              <span className="text-[13px] text-ink-100 leading-snug">{f.title}</span>
              <ArrowUpRight size={15} className="text-accent shrink-0 mt-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
