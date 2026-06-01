import Link from "next/link";
import { ArrowUpRight, TrendingDown } from "lucide-react";
import { DownsideTiers } from "@/components/DownsideLadder";
import { downsideScenarios } from "@/lib/downside";
import { fmtUsd } from "@/lib/format";

// Compact homepage module: "If Bitcoin corrected like prior cycles…" — shows the
// mild / average / severe scenario tiers and links to the full map. Careful,
// non-alarmist framing: historical context, not a prediction.
export function DownsidePreview() {
  const d = downsideScenarios();
  if (!d.available || !d.levels.some((l) => l.category === "drawdown")) return null;

  return (
    <section>
      <div className="flex items-end justify-between gap-6 mb-6">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2 flex items-center gap-2">
            <TrendingDown size={13} /> Risk context
          </div>
          <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-tight">
            If Bitcoin corrected like prior cycles…
          </h2>
          <p className="mt-2.5 text-[13.5px] text-ink-300 max-w-xl">
            Bitcoin has fallen sharply even in long-term bull structures. Here&apos;s where prior
            cyclical bear-market drawdowns from the cycle high ({fmtUsd(d.cycleHigh, { compact: true })})
            <span className="text-ink-100"> would imply</span> — historical context, not a forecast.
          </p>
        </div>
        <Link
          href="/downside-scenarios"
          className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft whitespace-nowrap"
        >
          View downside scenarios <ArrowUpRight size={13} />
        </Link>
      </div>

      <div className="card p-5 sm:p-6">
        <DownsideTiers />
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[11.5px] text-ink-500 max-w-md leading-relaxed">
            Based on Bitcoin&apos;s mildest, average and deepest prior cyclical bear markets. Not a
            prediction, not a price target, not advice.
          </p>
          <Link
            href="/downside-scenarios"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft whitespace-nowrap"
          >
            View downside scenarios <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}
