import { format } from "date-fns";
import { CycleOverlayPanel } from "@/components/CycleOverlayPanel";
import { CycleTimingChart } from "@/components/CycleTimingChart";
import { CycleDrawdownChart } from "@/components/CycleDrawdownChart";
import { TodayVsPriorCycles } from "@/components/TodayVsPriorCycles";
import { CYCLES, TODAY_DAY_IN_CYCLE } from "@/lib/btcData";
import { cycleDivergence, cycleTrackingHeadline } from "@/lib/cycleIntel";
import { cycleTiming } from "@/lib/cycleTiming";
import { drawdownAnalysis } from "@/lib/drawdowns";
import { SnapshotStrip } from "@/components/SnapshotStrip";
import { fmtPct, fmtUsd } from "@/lib/format";

const fmtMult = (m: number) => (m >= 10 ? `${m.toFixed(0)}×` : `${m.toFixed(1)}×`);
const fmtWin = (iso: string) => format(new Date(iso), "MMM yyyy");

const DESC =
  "Compare all four Bitcoin halving cycles side by side, aligned to halving day zero — price, drawdowns and recoveries across 13+ years of history.";
export const metadata = {
  title: { absolute: "Bitcoin Halving Cycle Comparison | HalvingLens" },
  description: DESC,
  alternates: { canonical: "/cycles" },
  openGraph: { title: "Bitcoin Halving Cycle Comparison", description: DESC, url: "/cycles", type: "website" },
  twitter: { card: "summary_large_image", title: "Bitcoin Halving Cycle Comparison", description: DESC },
};

export default function CyclesPage() {
  const headline = cycleTrackingHeadline();
  const divergence = cycleDivergence();
  const timing = cycleTiming();
  const drawdown = drawdownAnalysis();
  const ddPct = (v: number) => `${Math.round(v)}%`;

  // Real peak multiples per completed cycle, for the diminishing-returns read.
  const completed = CYCLES.filter((c) => c.id !== 5);
  const peakMultiples = completed.map((c) => ({
    short: c.short,
    year: format(new Date(c.halvingDate), "yyyy"),
    mult: c.peakPrice / c.samples[0].price,
  }));

  return (
    <div className="space-y-12 lg:space-y-16">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-4">
          Cycle comparison
        </div>
        <h1 className="font-display text-[34px] sm:text-[40px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Every halving cycle, lined up from day zero.
        </h1>
        <p className="mt-5 text-[15px] lg:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          All four cycles drawn on the same axis, aligned to halving day. See how today&apos;s cycle
          compares with the prior three at the same number of days after the halving.
        </p>
      </header>

      <SnapshotStrip title="Where the cycle moved this week" />

      {/* Plain-English interpretation above the chart */}
      <section className="card-glow p-6 lg:p-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/[0.06] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[12px] font-medium text-accent">{divergence.chip}</span>
          </div>
          <h2 className="font-display text-[20px] sm:text-[24px] lg:text-[28px] font-medium tracking-tight-2 text-ink-100 leading-snug max-w-3xl">
            {headline}
          </h2>
          <p className="mt-3.5 text-[14px] text-ink-300 max-w-3xl leading-relaxed">
            {divergence.summary}
          </p>
        </div>
        <div className="watermark">halvinglens.com · cycle comparison</div>
      </section>

      {/* The signature chart */}
      <CycleOverlayPanel height={460} />

      {/* Same day from halving comparison cards */}
      <TodayVsPriorCycles />

      {/* Drawdowns — is this drop normal? */}
      {drawdown.available && (
        <section>
          <div className="mb-6 max-w-3xl">
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
              Historical drawdowns
            </div>
            <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-snug">
              Is this drop normal?
            </h2>
            <p className="mt-3 text-[14px] text-ink-300 leading-relaxed">
              How far below its own peak each cycle has traded, by day after the halving (0% = at the
              cycle high). Today&apos;s correction is drawn against the full drawdown history of the
              prior three cycles.
            </p>
          </div>

          <div className="card p-5 sm:p-8 relative">
            <div className="grid grid-cols-3 gap-4 mb-7">
              <DrawdownStat label="Current drawdown" value={ddPct(drawdown.current)} highlight />
              <DrawdownStat label="Largest this cycle" value={ddPct(drawdown.largestThisCycle)} />
              <DrawdownStat label={`Avg at day ${drawdown.cycleDay}`} value={ddPct(drawdown.avgAtStage)} />
            </div>
            <CycleDrawdownChart />
            <p className="mt-5 text-[13.5px] text-ink-200 leading-relaxed max-w-3xl">{drawdown.takeaway}</p>
            <div className="watermark">halvinglens.com · drawdowns</div>
          </div>
        </section>
      )}

      {/* Cycle timing — when do highs and lows land relative to the halving */}
      <section>
        <div className="mb-6 max-w-3xl">
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
            Cycle timing
          </div>
          <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-snug">
            When could the current cycle top and bottom?
          </h2>
          <p className="mt-3 text-[14px] text-ink-300 leading-relaxed">
            Highs and lows from the three completed cycles, measured in days after the halving. They
            cluster — and the cards below project those windows onto the{" "}
            <span className="text-ink-100">current cycle (cycle 5)</span>, which began at the April
            2024 halving.
          </p>
        </div>

        <div className="card p-5 sm:p-8 relative">
          <CycleTimingChart />
          <div className="watermark">halvinglens.com · cycle timing</div>
        </div>

        {/* Projected windows + plain-English read */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
          <WindowCard
            tone="green"
            title="Cycle 5 · peak window"
            range={`Day ${timing.peakWindow.minDay}–${timing.peakWindow.maxDay} after halving · where prior cycles topped`}
            dates={`${fmtWin(timing.peakWindow.startDate)} – ${fmtWin(timing.peakWindow.endDate)}`}
            note={
              timing.currentPeakInWindow
                ? `Cycle 5's high so far (${fmtUsd(timing.currentPeak.price, { compact: true })}) landed at day ${timing.currentPeak.day} — inside this window.`
                : `Cycle 5's high so far came at day ${timing.currentPeak.day}.`
            }
          />
          <WindowCard
            tone="red"
            title="Cycle 5 · low window"
            range={`Day ${timing.bottomWindow.minDay}–${timing.bottomWindow.maxDay} after halving · where prior cycles bottomed`}
            dates={`${fmtWin(timing.bottomWindow.startDate)} – ${fmtWin(timing.bottomWindow.endDate)}`}
            note={
              timing.todayVsBottom === "before"
                ? timing.daysToBottomOpen <= 30
                  ? "Opening now — today sits right at its start."
                  : `Opens in about ${timing.daysToBottomOpen} days.`
                : timing.todayVsBottom === "within"
                  ? "Today is inside this window."
                  : "This window has already passed."
            }
            highlight
          />
          <div className="card-glow p-6 relative flex flex-col justify-center">
            <div className="text-[10px] uppercase tracking-[0.18em] text-accent mb-2">
              Where we are
            </div>
            <p className="text-[13px] text-ink-200 leading-relaxed">{timing.summary}</p>
          </div>
        </div>
      </section>

      {/* Cycle-by-cycle stats — table on desktop, cards on mobile */}
      <section>
        <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100 mb-5">
          Cycle-by-cycle stats
        </h2>

        {/* Mobile: stacked cards */}
        <div className="sm:hidden space-y-3">
          {CYCLES.map((c) => {
            const peakGain = (c.peakPrice / c.samples[0].price - 1) * 100;
            const drawdown = (c.troughPrice / c.peakPrice - 1) * 100;
            const isCurrent = c.id === 5;
            return (
              <div
                key={c.id}
                className={`rounded-xl p-5 border ${
                  isCurrent ? "border-accent/30 bg-accent/[0.04]" : "border-white/[0.04] bg-white/[0.012]"
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: c.color }} />
                  <span className={`font-medium text-[13px] ${isCurrent ? "text-accent" : "text-ink-100"}`}>
                    {c.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[9.5px] text-accent uppercase tracking-[0.18em]">current</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Mini label="Halving price" value={fmtUsd(c.samples[0].price, { compact: true })} />
                  <Mini label="Peak" value={fmtUsd(c.peakPrice, { compact: true })} />
                  <Mini label="Peak gain" value={fmtPct(peakGain, 0)} tone="green" />
                  <Mini label="Days to peak" value={`${c.peakDay}d`} />
                  <Mini label="Drawdown" value={fmtPct(drawdown, 0)} tone="red" />
                  <Mini label="Reward" value={`${c.rewardBtc} BTC`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden sm:block card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400 border-b border-white/[0.04]">
                <th className="px-5 py-4 font-medium">Cycle</th>
                <th className="px-3 py-4 font-medium">Halving</th>
                <th className="px-3 py-4 font-medium text-right">Reward</th>
                <th className="px-3 py-4 font-medium text-right">At halving</th>
                <th className="px-3 py-4 font-medium text-right">Peak</th>
                <th className="px-3 py-4 font-medium text-right">Peak gain</th>
                <th className="px-3 py-4 font-medium text-right">Days to peak</th>
                <th className="px-3 py-4 font-medium text-right">Drawdown</th>
              </tr>
            </thead>
            <tbody>
              {CYCLES.map((c) => {
                const peakGain = (c.peakPrice / c.samples[0].price - 1) * 100;
                const drawdown = (c.troughPrice / c.peakPrice - 1) * 100;
                const isCurrent = c.id === 5;
                return (
                  <tr key={c.id} className="row-hover border-b border-white/[0.03] last:border-0">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ background: c.color }} />
                        <span className={`font-medium text-[13px] ${isCurrent ? "text-accent" : "text-ink-100"}`}>
                          {c.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[9.5px] text-accent uppercase tracking-[0.18em]">current</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-ink-300 font-mono text-[12px]">
                      {format(new Date(c.halvingDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-3 py-4 text-right font-mono tabular-nums text-ink-200">
                      {c.rewardBtc} BTC
                    </td>
                    <td className="px-3 py-4 text-right font-mono tabular-nums text-ink-200">
                      {fmtUsd(c.samples[0].price, { compact: true })}
                    </td>
                    <td className="px-3 py-4 text-right font-mono tabular-nums text-ink-100">
                      {fmtUsd(c.peakPrice, { compact: true })}
                    </td>
                    <td className="px-3 py-4 text-right font-mono tabular-nums text-signal-green">
                      {fmtPct(peakGain, 0)}
                    </td>
                    <td className="px-3 py-4 text-right font-mono tabular-nums text-ink-200">
                      {c.peakDay}d
                    </td>
                    <td className="px-3 py-4 text-right font-mono tabular-nums text-signal-red">
                      {fmtPct(drawdown, 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Two carefully-framed theses */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-7">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-2">One view</div>
          <h3 className="font-display text-[18px] font-medium text-ink-100 tracking-tight-2 mb-2">
            Diminishing returns
          </h3>
          <p className="text-[12.5px] text-ink-300 leading-relaxed">
            Each cycle&apos;s peak gain has been smaller than the last —{" "}
            {peakMultiples.map((p) => fmtMult(p.mult)).join(", ")} for the{" "}
            {peakMultiples.map((p) => p.year).join(", ")} cycles. If that pattern continues, this
            cycle would deliver a far smaller multiple than past cycles rather than a repeat of early
            returns. History, not a forecast.
          </p>
        </div>
        <div className="card p-7">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400 mb-2">Another view</div>
          <h3 className="font-display text-[18px] font-medium text-ink-100 tracking-tight-2 mb-2">
            ETF-era divergence
          </h3>
          <p className="text-[12.5px] text-ink-300 leading-relaxed">
            The 2024 cycle is the first with US spot Bitcoin ETFs — a source of demand that did not
            exist in 2012, 2016 or 2020. If that demand stays structural, it could change the shape
            of the cycle relative to history. The flatter, cooler profile so far (above) is the
            chief evidence — though it&apos;s still early, and this is not a guarantee.
          </p>
        </div>
      </section>
    </div>
  );
}

function WindowCard({
  tone,
  title,
  range,
  dates,
  note,
  highlight,
}: {
  tone: "green" | "red";
  title: string;
  range: string;
  dates: string;
  note: string;
  highlight?: boolean;
}) {
  const accent = tone === "green" ? "text-signal-green" : "text-signal-red";
  const dot = tone === "green" ? "bg-signal-green" : "bg-signal-red";
  return (
    <div
      className={`card p-6 ${highlight ? "border-signal-red/25" : ""}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <span className="text-[10px] uppercase tracking-[0.16em] text-ink-400">{title}</span>
      </div>
      <div className={`font-display text-[20px] font-medium tracking-tight-2 ${accent}`}>{dates}</div>
      <div className="text-[11.5px] text-ink-400 font-mono mt-1">{range}</div>
      <p className="mt-3.5 pt-3.5 border-t border-white/[0.05] text-[12.5px] text-ink-300 leading-relaxed">
        {note}
      </p>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div
        className={`mt-0.5 font-mono text-[12.5px] tabular-nums ${
          tone === "green" ? "text-signal-green" : tone === "red" ? "text-signal-red" : "text-ink-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function DrawdownStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-400 mb-1.5">{label}</div>
      <div
        className={`font-display text-[26px] sm:text-[30px] font-medium tabular-nums ${
          highlight ? "text-accent" : "text-ink-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
