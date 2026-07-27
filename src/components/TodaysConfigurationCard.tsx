import { TrackedLink } from "@/components/TrackedLink";
import { todaysConfigurationPack, type PackRow } from "@/lib/fourReferencePrices";
import { fmtPct, fmtUsd } from "@/lib/format";
import { format } from "date-fns";

// Today's Configuration — the Four Reference Prices content pack. A
// first-class, self-contained HalvingLens insight module in the house family
// (AccumulationIndexModule, EtfDemandCard…): one deterministic lib read, the
// standard card anatomy, whole-card navigation, honest dropout, watermark.
// Deliberately chartless — the altimeter, ribbon, gap history and precedent
// paths belong exclusively to /four-reference-prices; the hero here is the
// configuration PHRASE, because the framework is a language. Reusable
// unchanged by any consumer (Daily Brief today; homepage, founder
// intelligence, social, API later).

const ROW_DOT: Record<PackRow["key"], string> = {
  market: "#5eead4",
  trend: "#8893a4",
  holders: "#f5b942",
  miners: "#a78bfa",
};

export function TodaysConfigurationCard() {
  const p = todaysConfigurationPack();

  if (!p.available) {
    return (
      <div className="card p-5">
        <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500">Today&apos;s Configuration</div>
        <p className="mt-2 text-[13px] text-ink-400 leading-relaxed">
          The reference-price data behind today&apos;s configuration hasn&apos;t synced yet — the read is
          withheld rather than shown stale.
        </p>
      </div>
    );
  }

  return (
    <TrackedLink
      href="/four-reference-prices"
      event="journey_next_click"
      props={{ from: "pack:todays-configuration", to: "/four-reference-prices", position: "primary" }}
      className="card card-interactive p-6 sm:p-7 block group relative overflow-hidden"
    >
      <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent">Today&apos;s Configuration</div>

      {/* The hero is the configuration phrase — the framework is a language. */}
      <div className="mt-2 font-display text-[21px] sm:text-[25px] font-medium tracking-tight-2 text-ink-50 leading-tight max-w-2xl">
        {p.configuration}
      </div>

      {p.paragraph && (
        <p className="mt-3 text-[13.5px] text-ink-300 leading-relaxed max-w-2xl">{p.paragraph}</p>
      )}

      {/* Quick snapshot — four rows, house reference colours as identity. */}
      <div className="mt-4 divide-y divide-white/[0.05]">
        {p.rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4 py-2">
            <span className="inline-flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ROW_DOT[r.key] }} />
              <span className="text-[12.5px] text-ink-200 truncate">{r.label}</span>
              {r.estimated && (
                <span className="text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border border-signal-violet/25 text-signal-violet bg-signal-violet/[0.08] shrink-0">
                  Estimated
                </span>
              )}
            </span>
            <span className="flex items-baseline gap-2.5 shrink-0">
              <span className="font-mono text-[13px] tabular-nums text-ink-100">{fmtUsd(r.value, { compact: true })}</span>
              {r.gapPct != null && (
                <span className={`font-mono text-[11.5px] tabular-nums ${r.gapPct >= 0 ? "text-signal-green" : "text-signal-red"}`}>
                  {fmtPct(r.gapPct, 1)}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* History strip + the authoritative-deep-dive CTA. */}
      <div className="mt-3 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-[11.5px] text-ink-400">
          {p.frequencyPct != null && (
            <span>
              <span className="text-ink-200 tabular-nums">{p.frequencyPct}%</span> of weeks
              {p.windowFirst && <span className="text-ink-600"> since {p.windowFirst.slice(0, 7)}</span>}
            </span>
          )}
          {p.spellWeeks != null && (
            <span>
              spell <span className="text-ink-200 tabular-nums">{p.spellWeeks} wk{p.spellWeeks === 1 ? "" : "s"}</span>
            </span>
          )}
          {p.lastSimilarDate && (
            <span>
              last similar <span className="text-ink-200 tabular-nums">{format(new Date(p.lastSimilarDate), "d MMM yyyy")}</span>
            </span>
          )}
        </div>
        <span className="text-[12px] text-accent whitespace-nowrap group-hover:translate-x-0.5 transition-transform">
          Explore the full Four Reference Prices framework →
        </span>
      </div>
    </TrackedLink>
  );
}
