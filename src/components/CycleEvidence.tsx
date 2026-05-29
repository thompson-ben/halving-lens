import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { METRICS, zoneFor } from "@/lib/metrics";
import { metricStatus } from "@/lib/cycleIntel";
import { TODAY } from "@/lib/btcData";
import { fmtUsd } from "@/lib/format";

const ZONE_TONE: Record<string, string> = {
  bottom: "text-signal-blue",
  accumulation: "text-signal-green",
  neutral: "text-ink-300",
  bullish: "text-signal-green",
  euphoria: "text-signal-amber",
  top: "text-signal-red",
};

export function CycleEvidence() {
  // Only metrics we can stand behind: live or live-derived, with zone bands.
  const evidence = METRICS.filter(
    (m) => metricStatus(m.slug) !== "coming-soon" && m.bands.length > 0,
  );

  return (
    <section>
      <div className="mb-6">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
          Why we think this
        </div>
        <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-tight">
          The live signals behind the read
        </h2>
        <p className="mt-2.5 text-[14px] text-ink-300 max-w-2xl leading-relaxed">
          Only metrics we can calculate from live data are shown here. Each is derived from real
          Bitcoin price — no estimated or modelled figures.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {evidence.map((m) => {
          const value = m.pick(TODAY);
          const { zone, label } = zoneFor(m, value);
          const display =
            m.unit === "$" ? fmtUsd(value, { compact: true }) : value.toFixed(m.decimals);
          return (
            <Link
              key={m.slug}
              href={`/metrics/${m.slug}`}
              className="card p-6 block group hover:border-accent/25 transition-colors duration-300"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-[18px] font-medium tracking-tight-2 text-ink-100 group-hover:text-accent transition-colors duration-200">
                  {m.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full border border-signal-green/25 bg-signal-green/10 text-signal-green text-[9.5px] font-medium tracking-wide whitespace-nowrap">
                  Live-derived
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display font-medium text-[28px] tracking-tight-2 text-ink-100 tabular-nums leading-none">
                  {display}
                </span>
                <span className={`text-[12.5px] ${ZONE_TONE[zone]}`}>{label}</span>
              </div>

              <dl className="mt-5 space-y-3 text-[12.5px] leading-relaxed">
                <div>
                  <dt className="text-ink-400">What it is</dt>
                  <dd className="text-ink-200 mt-0.5">{m.description}</dd>
                </div>
                <div>
                  <dt className="text-ink-400">Why it matters</dt>
                  <dd className="text-ink-200 mt-0.5">{m.why}</dd>
                </div>
              </dl>

              <div className="mt-5 pt-3.5 border-t border-white/[0.04] inline-flex items-center gap-0.5 text-accent text-[11px] group-hover:gap-1.5 transition-all duration-200">
                Full history <ArrowUpRight size={11} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
