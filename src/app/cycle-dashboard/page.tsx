import { CycleLensExplorer } from "@/components/lens/CycleLensExplorer";
import { ProEarlyAccess } from "@/components/lens/ProEarlyAccess";
import { LastUpdated, cycleDayAsOf } from "@/components/LastUpdated";
import { KpiStrip } from "@/components/dashboard/KpiStrip";
import { ChangeSummary } from "@/components/dashboard/ChangeSummary";
import { StateStrip } from "@/components/dashboard/StateStrip";
import { MarketBoard } from "@/components/dashboard/MarketBoard";
import { ExploreFurther } from "@/components/dashboard/ExploreFurther";
import { TrackedSection } from "@/components/TrackedSection";
import { lensClientPayload, parseLensDay } from "@/lib/lensPayload";
import { cycleDashboardIntel, marketBoard } from "@/lib/cycleDashboardIntel";
import { TODAY_DAY_IN_CYCLE, DAYS_PER_CYCLE } from "@/lib/btcData";
import { cyclePhase, headlineSpot, cycleTrackingHeadline } from "@/lib/cycleIntel";
import { cycleScorecard } from "@/lib/cycleSummary";
import { scoreBand } from "@/lib/scoreBand";

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
  searchParams: { day?: string | string[]; period?: string | string[] };
}) {
  const payload = lensClientPayload();
  const initialDay = parseLensDay(searchParams.day, payload);
  const intel = cycleDashboardIntel();
  // Board period — server-parsed like the Lens's ?day. 7D is the default
  // (the Documenting-the-Cycle week); anything unrecognised clamps to it.
  const period = searchParams.period === "1" ? 1 : searchParams.period === "30" ? 30 : 7;
  const board = period === 7 ? intel.board : marketBoard(period);

  const spot = headlineSpot();
  const phase = cyclePhase();
  const sc = cycleScorecard();
  const band = scoreBand(sc.overall);
  const progressPct = Math.round((TODAY_DAY_IN_CYCLE / DAYS_PER_CYCLE) * 100);

  return (
    <div className="space-y-10 lg:space-y-14">
      {/* The dashboard zone (CD4): orientation + instruments, deliberately
          tighter rhythm than the editorial sections below — a coherent
          instrument panel, then the page breathes again from The Lens. */}
      <div>
        <header className="pt-2">
          <div className="eyebrow text-accent mb-4">Cycle dashboard</div>
          <h1 className="font-display text-display font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
            Where are we in the Bitcoin cycle?
          </h1>
          <p className="mt-4 text-subhead text-ink-200 max-w-measure leading-relaxed">{cycleTrackingHeadline()}</p>
        </header>

        <div className="mt-7 space-y-6 sm:space-y-7">
          {/* Orientation — the five-second answer, before any interaction */}
          <div>
            <KpiStrip
              spot={spot}
              cycleDay={TODAY_DAY_IN_CYCLE}
              progressPct={progressPct}
              cycleDayAsOf={cycleDayAsOf()}
              phaseLabel={phase.label}
              health={{ overall: sc.overall, band }}
            />
            <div className="mt-2.5">
              <LastUpdated prefix="Prices as of" />
            </div>
          </div>

          {/* What changed? — the executive summary (V2.1 Phase 1): the
              canonical activity verdict and its counts, then Metric Watch
              inside the same section. Quiet is a first-class finding. */}
          <TrackedSection id="dashboard-what-changed">
            <ChangeSummary summary={intel.summary} watch={intel.watch} quietSupport={intel.watchQuietSupport} />
          </TrackedSection>

          {/* State of the cycle — three independent canonical states */}
          <TrackedSection id="dashboard-state-strip">
            <StateStrip states={intel.strip} />
          </TrackedSection>

          {/* Market board (V2.1 Phase 2) — the whole considered market,
              ranked; movers dominate, the quiet majority recedes. The full
              movement picture is told BEFORE historical exploration. */}
          <TrackedSection id="dashboard-market-board">
            <MarketBoard board={board} />
          </TrackedSection>
        </div>
      </div>

      {/* The Lens — the signature interaction: how does here compare?
          Historical context follows today's intelligence (V2.1 hierarchy);
          one strong hairline marks the turn from the current dashboard to
          historical exploration. */}
      <section aria-label="The Lens — every cycle at the selected day" className="border-t border-white/[0.09] pt-10 lg:pt-12">
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

      <ExploreFurther />

      <ProEarlyAccess />

      <p className="text-micro text-ink-500">Historical context, not a prediction.</p>
    </div>
  );
}
