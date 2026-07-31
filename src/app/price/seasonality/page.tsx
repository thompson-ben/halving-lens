import { JourneyNext } from "@/components/JourneyNext";
import { SeasonalityExplorer } from "@/components/SeasonalityExplorer";
import { TrackedSection } from "@/components/TrackedSection";
import { STANDING_CLOSE } from "@/lib/fourReferencePrices";
import { seasonalityData } from "@/lib/seasonality";
import { buildSeasonalityPayload } from "@/lib/seasonalityPayload";
import { MIN_INSIGHT_N, MONTHS, SERIES_META, type SeriesKey } from "@/lib/seasonalityCore";

// Bitcoin Seasonality (PR-C) — the definitive historical monthly-behaviour
// page. The interactive explorer (heatmap in both modes, filters, statistics,
// current-month context, insights) runs on one precomputed payload; this file
// adds the hero, the server-rendered reference-price analysis, and the
// journey. Historical context only — the standing close appears in the hero,
// in every tooltip, and at the foot of the page.

const DESC =
  "How Bitcoin has behaved through the calendar year across the full observed record — monthly returns and distances from the Four Reference Prices, since 2010. Historical context, not prediction.";
export const metadata = {
  title: "Bitcoin Seasonality — monthly behaviour across the record",
  description: DESC,
  alternates: { canonical: "/price/seasonality" },
  openGraph: { title: "Bitcoin Seasonality", description: DESC, url: "/price/seasonality", type: "website" },
  twitter: { card: "summary_large_image", title: "Bitcoin Seasonality", description: DESC },
};

const GOLD = "#d9b96a";

export default function SeasonalityPage() {
  const payload = buildSeasonalityPayload();

  // Server-rendered reference analysis: each series' own seasonal record over
  // the full window, straight from the engine (filter: all).
  const refAnalysis = (["market", "trend", "holders", "miners"] as SeriesKey[]).map((series) => {
    const returns = seasonalityData({ mode: "returns", series, filter: "all" }, payload.todayIso);
    const valuation = series === "market" ? null : seasonalityData({ mode: "valuation", series, filter: "all" }, payload.todayIso);
    const eligible = returns.stats.filter((s) => s.n >= MIN_INSIGHT_N);
    const strongest = eligible.length ? eligible.reduce((a, b) => (b.avg > a.avg ? b : a)) : null;
    const weakest = eligible.length ? eligible.reduce((a, b) => (b.avg < a.avg ? b : a)) : null;
    const allVals = returns.cells.filter((c) => c.value != null && !c.partial).map((c) => c.value as number);
    const avgChange = allVals.length ? Math.round((allVals.reduce((s, v) => s + v, 0) / allVals.length) * 10) / 10 : null;
    const gapVals = valuation ? valuation.cells.filter((c) => c.value != null && !c.partial).map((c) => c.value as number).sort((a, b) => a - b) : [];
    const medianGap = gapVals.length ? gapVals[Math.floor(gapVals.length / 2)] : null;
    return { series, meta: SERIES_META[series], windowFrom: returns.windowFrom, avgChange, strongest, weakest, medianGap };
  });

  return (
    <div className="space-y-14">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>Price · Seasonality</div>
        <h1 className="font-display text-[34px] lg:text-[48px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Bitcoin Seasonality
        </h1>
        <p className="mt-4 text-[14.5px] lg:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          How Bitcoin has behaved through the calendar year, across the full observed record — as
          monthly returns, or as its distance from each of the Four Reference Prices. {STANDING_CLOSE}
        </p>
      </header>

      <TrackedSection id="seasonality-explorer">
        <SeasonalityExplorer payload={payload} />
      </TrackedSection>

      {/* The reference prices through the year — server-rendered, full window */}
      <TrackedSection id="seasonality-references">
        <section>
          <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
            The reference prices through the year
            <span className="text-ink-500 normal-case tracking-normal"> · full record, unaffected by filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {refAnalysis.map((r) => (
              <div key={r.series} className="card p-5">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-ink-100">{r.meta.label}</span>
                  {r.meta.nature === "estimated" && (
                    <span className="text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border border-signal-violet/25 text-signal-violet bg-signal-violet/[0.08]">Estimated</span>
                  )}
                </div>
                <div className="mt-3 space-y-1.5 text-[12.5px] text-ink-300">
                  {r.avgChange != null && (
                    <p>Average monthly change {r.avgChange > 0 ? "+" : ""}{r.avgChange}% across its record.</p>
                  )}
                  {r.strongest && r.weakest && (
                    <p>
                      Strongest month on average: <span className="text-ink-100">{r.strongest.label}</span> ({r.strongest.avg > 0 ? "+" : ""}{r.strongest.avg}%) ·
                      weakest: <span className="text-ink-100">{r.weakest.label}</span> ({r.weakest.avg > 0 ? "+" : ""}{r.weakest.avg}%).
                    </p>
                  )}
                  {r.medianGap != null && (
                    <p>
                      The market has typically traded <span className="text-ink-100">{Math.abs(r.medianGap)}% {r.medianGap >= 0 ? "above" : "below"}</span> this reference (median month).
                    </p>
                  )}
                </div>
                {r.windowFrom && (
                  <p className="mt-3 text-[10.5px] text-ink-500">
                    {r.meta.nature === "estimated" ? "Modelled" : "Observed"} from {r.windowFrom}.
                  </p>
                )}
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11.5px] text-ink-500 max-w-3xl leading-relaxed">
            Current month: {MONTHS[payload.curMonth - 1]} {payload.curYear}, evaluated {payload.todayIso}. {STANDING_CLOSE}
          </p>
        </section>
      </TrackedSection>

      <JourneyNext from="/price/seasonality" />
    </div>
  );
}
