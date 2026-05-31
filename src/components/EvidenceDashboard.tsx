import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cycleSummary } from "@/lib/cycleSummary";
import { DataBadge } from "./DataBadge";

// "Evidence behind the cycle reading" — appears AFTER the narrative. Each card:
// status, simple reading, why it matters, link to go deeper.
export function EvidenceDashboard() {
  const s = cycleSummary();

  return (
    <section>
      <div className="mb-6">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
          The evidence
        </div>
        <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-tight">
          Evidence behind the cycle reading
        </h2>
        <p className="mt-2.5 text-[14px] text-ink-300 max-w-2xl leading-relaxed">
          The signals that back the read above — each one live or live-derived from real data, with
          a plain-English reading and a link to go deeper.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {s.evidence.map((e) => {
          const inner = (
            <>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-[16px] font-medium tracking-tight-2 text-ink-100 group-hover:text-accent transition-colors">
                  {e.label}
                </h3>
                <DataBadge status={e.status} size="sm" showDot={false} />
              </div>
              <div className="mt-3 text-[15px] font-medium text-ink-50">{e.reading}</div>
              <p className="mt-2 text-[12.5px] text-ink-300 leading-relaxed">{e.detail}</p>
              {e.href && (
                <div className="mt-4 pt-3 border-t border-white/[0.04] inline-flex items-center gap-0.5 text-accent text-[11px] group-hover:gap-1.5 transition-all">
                  Go deeper <ArrowUpRight size={11} />
                </div>
              )}
            </>
          );
          return e.href ? (
            <Link key={e.label} href={e.href} className="card card-interactive p-6 block group hover:border-accent/25">
              {inner}
            </Link>
          ) : (
            <div key={e.label} className="card p-6 group">{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
