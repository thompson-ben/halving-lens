import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { BlockDef } from "@/lib/questions/blocks";

// One live evidence block on a question page (PR-Q1). Renders the block's
// standard chrome (label · Live · home link) around the existing component,
// and degrades a stale/failed source to a calm unavailable card — a failed
// block never takes the page down, and never renders an outdated figure as
// current (commission §3).

const GOLD = "#d9b96a";

export function QuestionBlock({ def, dataUpdatedAt }: { def: BlockDef; dataUpdatedAt: string }) {
  const probe = def.probe();

  return (
    <section aria-label={def.label}>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <div className="text-[10.5px] uppercase tracking-[0.18em]" style={{ color: GOLD }}>
          {def.label}
          <span className="text-ink-500 normal-case tracking-normal"> · Live · updated {probe.lastDate ?? dataUpdatedAt}</span>
        </div>
        <Link
          href={def.homeHref}
          className="shrink-0 inline-flex items-center gap-1 text-[11.5px] text-ink-400 hover:text-ink-100 transition-colors"
        >
          Explore {def.homeLabel}
          <ArrowUpRight className="w-3 h-3" aria-hidden />
        </Link>
      </div>
      {probe.ok ? (
        def.render()
      ) : (
        <div className="card p-5">
          <p className="text-[13px] text-ink-400 leading-relaxed">
            Live data is temporarily unavailable
            {probe.lastDate ? ` — last reliable reading ${probe.lastDate}` : ""}. The full module lives on{" "}
            <Link href={def.homeHref} className="text-ink-200 underline decoration-ink-600 underline-offset-2">
              {def.homeLabel}
            </Link>
            .
          </p>
        </div>
      )}
    </section>
  );
}
