import Link from "next/link";
import { JourneyNext } from "@/components/JourneyNext";
import { TrackedSection } from "@/components/TrackedSection";
import { CycleSeasonalityExplorer } from "@/components/CycleSeasonalityExplorer";
import { STANDING_CLOSE } from "@/lib/fourReferencePrices";
import { buildCycleSeasonalityPayload } from "@/lib/cycleSeasonalityPayload";

// Cycle-Aligned Seasonality (PR-V2B) — the four halving cycles side by side,
// month by anchored month. CYCLE COMPARISON, never seasonality statistics:
// with three completed cycles there are no averages, medians, percentiles or
// expected paths anywhere on this page. The only generated cross-cycle
// claims are the agreement facts (strict same-direction months across all 3
// completed cycles), and the hero carries the disagreement share as a
// permanent fixture — the honest headline of a three-cycle record.

const DESC =
  "Bitcoin's four halving cycles compared month by month since each halving — returns and distances from the reference prices, over the observed record only. Historical cycle comparison, not a forecast.";
export const metadata = {
  title: "Bitcoin by Cycle Month — the halving cycles, aligned",
  description: DESC,
  alternates: { canonical: "/price/seasonality/cycles" },
  openGraph: { title: "Bitcoin by Cycle Month", description: DESC, url: "/price/seasonality/cycles", type: "website" },
  twitter: { card: "summary_large_image", title: "Bitcoin by Cycle Month", description: DESC },
};

const GOLD = "#d9b96a";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CycleSeasonalityPage() {
  const payload = buildCycleSeasonalityPayload();
  const { agreement, facts, coverage, position } = payload;
  const currentCoverage = coverage.find((c) => !c.completed);
  const projectedLabel = position
    ? `${MONTH_NAMES[Number(position.projectedNextHalving.slice(5, 7)) - 1]} ${position.projectedNextHalving.slice(0, 4)}`
    : "";

  return (
    <div className="space-y-14">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
          Price · Seasonality · By cycle
        </div>
        <h1 className="font-display text-[34px] lg:text-[48px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Bitcoin by Cycle Month
        </h1>
        <p className="mt-4 text-[14.5px] lg:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          The four halving cycles side by side, aligned by months since each halving — as monthly
          returns, or as the market&apos;s distance from each reference price. This is a comparison of
          what each cycle actually did, not a seasonal pattern: in the months all three completed
          cycles observed in full, they moved in the same direction in only {agreement.agreed} of{" "}
          {agreement.comparable}. {STANDING_CLOSE}
        </p>
        <p className="mt-3 text-[12px] text-ink-500 max-w-2xl leading-relaxed">
          Prefer the calendar view?{" "}
          <Link href="/price/seasonality" className="text-ink-300 underline decoration-ink-600 underline-offset-2 hover:text-ink-100">
            Seasonality by calendar month →
          </Link>
        </p>
      </header>

      <TrackedSection id="cycle-seasonality-explorer">
        <CycleSeasonalityExplorer payload={payload} />
      </TrackedSection>

      {/* Where this cycle stands — per-cycle values, never an expectation */}
      {position && (
        <TrackedSection id="cycle-seasonality-position">
          <section className="card-glow p-5 sm:p-6">
            <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>
              Where this cycle stands
            </div>
            <p className="text-[13.5px] text-ink-300 leading-relaxed max-w-3xl">
              The current cycle is in month <span className="text-ink-100 tabular-nums">{position.month}</span> —
              day <span className="text-ink-100 tabular-nums">{position.day}</span> since the 2024 halving. Its
              running month renders month-to-date and joins the record only when complete. The next halving is
              due around {projectedLabel} <span className="text-ink-500">(projected)</span> — a label for
              context, never a cell in the grid.
            </p>
          </section>
        </TrackedSection>
      )}

      {/* Where the cycles agreed — the only generated cross-cycle claims */}
      <TrackedSection id="cycle-seasonality-agreement">
        <section>
          <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
            Where the cycles agreed
            <span className="text-ink-500 normal-case tracking-normal"> · all 3 completed cycles, market returns</span>
          </div>
          {facts.length === 0 ? (
            <div className="card p-4 max-w-2xl">
              <p className="text-[13px] text-ink-300 leading-relaxed">
                No month currently shows strict same-direction movement across all three completed cycles.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {facts.map((f) => (
                <div key={f.month} className="card p-4">
                  <p className="text-[13px] text-ink-200 leading-relaxed">{f.text}</p>
                  <p className="mt-2 text-[10.5px] text-ink-500">n = {f.n} completed cycles · complete anchored months only</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-[11.5px] text-ink-500 max-w-3xl leading-relaxed">
            A month qualifies only when every completed cycle observed it in full and every one moved
            strictly the same way — a movement that would round to 0.0% blocks the claim. In the other{" "}
            {agreement.comparable - agreement.agreed} comparable months, the cycles disagreed.
          </p>
        </section>
      </TrackedSection>

      {/* Cycle by cycle — spans and coverage, stated per cycle */}
      <TrackedSection id="cycle-seasonality-coverage">
        <section>
          <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
            Cycle by cycle
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {coverage.map((c) => (
              <div key={c.id} className="card p-5">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-ink-100">{c.label}</span>
                  {!c.completed && (
                    <span className="text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border border-accent/25 text-accent bg-accent/[0.08]">Current</span>
                  )}
                </div>
                <div className="mt-3 space-y-1.5 text-[12.5px] text-ink-300">
                  <p>
                    {c.spanDays.toLocaleString("en-US")} days {c.completed ? "halving to halving" : "since the halving"} ·{" "}
                    <span className="text-ink-100">{c.completeMonths}</span> complete months
                    {c.partialMonth != null && (
                      <> + {c.completed ? `a partial final month (${c.partialMonth})` : `month ${c.partialMonth} to date`}</>
                    )}
                    .
                  </p>
                  <p className="text-[11.5px] text-ink-400">
                    References: 200-Day Average from month {c.referenceFrom.trend ?? "—"}
                    {c.referenceFrom.holders != null ? ` · Realised Price from month ${c.referenceFrom.holders}` : " · Realised Price not observed"}
                    {c.referenceFrom.miners != null ? ` · Est. Mining Cost from month ${c.referenceFrom.miners}` : " · Est. Mining Cost not observed"}
                    .
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11.5px] text-ink-500 max-w-3xl leading-relaxed">
            Months are anchored at each halving date; a month&apos;s value compares the last daily close
            before each anchored boundary. The 2012 cycle&apos;s Est. Mining Cost coverage begins at month 37 —
            the model window opens in January 2016, inside that cycle&apos;s final six months. The grid ends at
            month {payload.horizon}, the furthest the observed record reaches
            {currentCoverage ? ` (the current cycle has reached month ${currentCoverage.partialMonth})` : ""}. {STANDING_CLOSE}
          </p>
        </section>
      </TrackedSection>

      <JourneyNext from="/price/seasonality/cycles" />
    </div>
  );
}
