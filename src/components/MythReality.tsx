import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { FindingMyth } from "@/lib/findings";

// Myth vs Reality — the recurring research series. A reusable template:
//   MYTH ↓ REALITY ↓ Historical evidence ↓ Key takeaway ↓ Read the full research
// `reference` (an HL-R id) and `href` make it citable and clickable.

export function MythReality({
  myth,
  reference,
  href,
  evidence,
}: {
  myth: FindingMyth;
  reference?: string;
  href?: string;
  evidence?: string;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="grid sm:grid-cols-2">
        <div className="p-5 sm:p-6 border-b sm:border-b-0 sm:border-r border-white/[0.06]">
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-signal-red/90">Myth</div>
          <p className="mt-2 text-[15px] leading-snug text-ink-100">{myth.myth}</p>
        </div>
        <div className="p-5 sm:p-6">
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent">Reality</div>
          <p className="mt-2 text-[15px] leading-snug text-ink-50">{myth.reality}</p>
        </div>
      </div>
      <div className="px-5 sm:px-6 py-4 border-t border-white/[0.06] bg-white/[0.015]">
        {evidence && <p className="text-[12.5px] leading-relaxed text-ink-400">{evidence}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-ink-200">
            <span className="text-ink-500">Takeaway · </span>
            {myth.takeaway}
          </p>
          {href && (
            <Link href={href} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent whitespace-nowrap">
              {reference ? `Read ${reference}` : "Read the full research"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
