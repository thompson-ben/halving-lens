import { CycleLensExplorer } from "@/components/lens/CycleLensExplorer";
import { ProEarlyAccess } from "@/components/lens/ProEarlyAccess";
import { LastUpdated, cycleDayAsOf } from "@/components/LastUpdated";
import { StateStrip } from "@/components/dashboard/StateStrip";
import { MetricWatchToday } from "@/components/dashboard/MetricWatchToday";
import { WhatsMoving } from "@/components/dashboard/WhatsMoving";
import { ExploreFurther } from "@/components/dashboard/ExploreFurther";
import { TrackedSection } from "@/components/TrackedSection";
import { lensClientPayload, parseLensDay } from "@/lib/lensPayload";
import { cycleDashboardIntel } from "@/lib/cycleDashboardIntel";
import { TODAY_DAY_IN_CYCLE, DAYS_PER_CYCLE } from "@/lib/btcData";
import { cyclePhase, headlineSpot, cycleTrackingHeadline } from "@/lib/cycleIntel";
import { cycleScorecard } from "@/lib/cycleSummary";
import { scoreBand } from "@/lib/scoreBand";
import { fmtPct, fmtUsd } from "@/lib/format";

// The Cycle Dashboard (Cycle Dashboard V2, CD3) — an intelligence dashboard,
// not a wall of metrics. Orientation first, then the state of the cycle,
// today's Metric Watch, The Lens, and the movement underneath — in the
// order a reader actually asks the questions. All intelligence comes from
// existing engines via the cycleDashboardIntel composition layer; this page
// assembles and arranges, nothing more. No grid of boxed KPIs.

const DESC =
  "Where are we in the Bitcoin cycle? The canonical cycle day, phase and market health, today's Metric Watch and what's moving — then scrub The Lens to see what this same point looked like in every previous halving cycle.";
export const metadata = {
  title: { absolute: "Bitcoin Cycle Dashboard | HalvingLens" },
  description: DESC,
  alternates: { canonical: "/cycle-dashboard" },
  openGraph: { title: "Bitcoin Cycle Dashboard", description: DESC, url: "/cycle-dashboard", type: "website" },
  twitter: { card: "summary_large_image", title: "Bitcoin Cycle Dashboard", description: DESC },
};

export default function CycleDashboardPage({
  searchParams,
}: {
  searchParams: { day?: string | string[] };
}) {
  const payload = lensClientPayload();
  const initialDay = parseLensDay(searchParams.day, payload);
  const intel = cycleDashboardIntel();

  const spot = headlineSpot();
  const phase = cyclePhase();
  const sc = cycleScorecard();
  const band = scoreBand(sc.overall);
  const progressPct = Math.round((TODAY_DAY_IN_CYCLE / DAYS_PER_CYCLE) * 100);

  return (
    <div className="space-y-10 lg:space-y-14">
      {/* Orientation — the five-second answer, before any interaction */}
      <header className="pt-2">
        <div className="eyebrow text-accent mb-4">Cycle dashboard</div>
        <h1 className="font-display text-display font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Where are we in the Bitcoin cycle?
        </h1>
        <p className="mt-4 text-subhead text-ink-200 max-w-measure leading-relaxed">{cycleTrackingHeadline()}</p>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:items-baseline sm:gap-x-7 sm:flex-wrap">
          <div>
            <dt className="eyebrow text-ink-500">BTC price</dt>
            <dd className="mt-1 font-mono text-subhead tabular-nums text-ink-50">
              {fmtUsd(spot.price)}
              {spot.pct != null && (
                <span className={`ml-2 text-caption ${spot.pct >= 0 ? "text-signal-green" : "text-signal-red"}`}>
                  {fmtPct(spot.pct, 1)} {spot.label}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-500">Cycle day</dt>
            <dd className="mt-1 font-mono text-subhead tabular-nums text-ink-50">
              {TODAY_DAY_IN_CYCLE}
              <span className="ml-2 text-caption text-ink-400">{progressPct}% through · to {cycleDayAsOf()}</span>
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-500">Phase</dt>
            <dd className="mt-1 text-subhead text-ink-100">{phase.label}</dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-500">Market health</dt>
            <dd className="mt-1 font-mono text-subhead tabular-nums" style={{ color: band.color }}>
              {sc.overall}
              <span className="ml-2 text-caption">{band.label}</span>
            </dd>
          </div>
        </dl>
        <div className="mt-3">
          <LastUpdated prefix="Prices as of" />
        </div>
      </header>

      {/* State of the cycle — three independent canonical states */}
      <TrackedSection id="dashboard-state-strip">
        <StateStrip states={intel.strip} />
      </TrackedSection>

      {/* Metric Watch — what deserves attention today (quiet is first-class) */}
      <TrackedSection id="dashboard-metric-watch">
        <MetricWatchToday watch={intel.watch} quietSupport={intel.watchQuietSupport} />
      </TrackedSection>

      {/* The Lens — the signature interaction: how does here compare? */}
      <section aria-label="The Lens — every cycle at the selected day">
        <div className="eyebrow text-editorial mb-1.5">The Lens</div>
        <h2 className="font-display text-headline font-medium tracking-tight-2 text-ink-100 leading-snug max-w-measure">
          What did this same point look like in previous cycles?
        </h2>
        <p className="mt-2 mb-5 text-body text-ink-400 max-w-measure leading-relaxed">
          Every cycle aligned from its halving day. Drag anywhere on the chart — or use the slider —
          to place all four cycles at the same day and read what actually happened.
        </p>
        <CycleLensExplorer payload={payload} initialDay={initialDay} />
      </section>

      {/* What's moving — the scanning layer underneath (order B, the local
          comparison's winner: on quiet days the Lens headline lands at the
          desktop fold, and a dedupe-emptied rail never interrupts the step
          from "what deserves attention" to "how does this compare"). */}
      <TrackedSection id="dashboard-whats-moving">
        <WhatsMoving rail={intel.moving} />
      </TrackedSection>

      <ExploreFurther />

      <ProEarlyAccess />

      <p className="text-micro text-ink-500">Historical context, not a prediction.</p>
    </div>
  );
}
