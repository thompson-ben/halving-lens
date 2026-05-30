import { format } from "date-fns";
import { DataBadge } from "@/components/DataBadge";
import { OnchainLthChart } from "@/components/OnchainLthChart";
import {
  LTH_AVAILABLE,
  lthAroundExtremes,
  lthMarkers,
  lthRead,
  lthVsPrice,
  ONCHAIN_SOURCE,
  ONCHAIN_UPDATED,
} from "@/lib/onchain";

export const metadata = {
  title: "On-chain — halving.lens",
};

const fmtBtc = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M BTC` : `${Math.round(v).toLocaleString()} BTC`);
const fmtPctSigned = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

export default function OnchainPage() {
  const read = LTH_AVAILABLE ? lthRead() : null;

  return (
    <div className="space-y-12">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">On-chain</span>
          <DataBadge status={read ? "live-derived" : "coming-soon"} source={read ? ONCHAIN_SOURCE ?? undefined : undefined} />
        </div>
        <h1 className="font-display text-[34px] sm:text-[40px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Do strong hands buy bottoms and sell tops?
        </h1>
        <p className="mt-5 text-[15px] lg:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          Long-term holders — coins that haven&apos;t moved in 155+ days — are the closest on-chain
          proxy for conviction. Watching when they accumulate and distribute, against the cycle&apos;s
          highs and lows, is one of the clearest behavioural signals in Bitcoin.
        </p>
      </header>

      {read ? <LiveOnchain read={read} /> : <ComingSoonOnchain />}
    </div>
  );
}

function LiveOnchain({ read }: { read: NonNullable<ReturnType<typeof lthRead>> }) {
  const ex = lthAroundExtremes(90);
  const data = lthVsPrice();
  const markers = lthMarkers();
  const toneOf = (v: number | null) => (v == null ? "text-ink-100" : v >= 0 ? "text-signal-green" : "text-signal-red");

  return (
    <>
      {/* Where LTHs stand now */}
      <section className="card-glow p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-center">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.18em] text-ink-400 mb-2">LTH supply today</div>
            <div className="font-display text-[40px] font-medium tracking-tightest text-ink-50 tabular-nums leading-none">
              {fmtBtc(read.current)}
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span
                className={`text-[14px] font-medium ${
                  read.trend === "accumulating"
                    ? "text-signal-green"
                    : read.trend === "distributing"
                      ? "text-signal-red"
                      : "text-ink-300"
                }`}
              >
                {read.trend === "accumulating"
                  ? "Accumulating"
                  : read.trend === "distributing"
                    ? "Distributing"
                    : "Holding steady"}
              </span>
              {read.pct90 != null && (
                <span className={`font-mono text-[12px] ${toneOf(read.pct90)}`}>
                  {fmtPctSigned(read.pct90)} · 90d
                </span>
              )}
            </div>
          </div>
          <div>
            <h2 className="font-display text-[20px] lg:text-[24px] font-medium tracking-tight-2 text-ink-100 leading-snug">
              What they&apos;re doing
            </h2>
            <p className="mt-3 text-[14px] text-ink-300 leading-relaxed">{read.summary}</p>
          </div>
        </div>
        <div className="watermark">halving.lens · on-chain</div>
      </section>

      {/* Did it work historically? */}
      {(ex.beforeHighsAvg != null || ex.beforeLowsAvg != null) && (
        <section>
          <div className="mb-5 max-w-2xl">
            <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">
              Around past cycle highs &amp; lows
            </h2>
            <p className="text-[12.5px] text-ink-400 mt-1.5">
              Average change in long-term-holder supply over the {ex.window} days <em>leading into</em>{" "}
              each prior cycle high and low.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-6">
              <div className="text-[10px] uppercase tracking-[0.16em] text-ink-400">Into cycle highs</div>
              <div className={`mt-2 font-display text-[30px] font-medium tracking-tight-2 tabular-nums ${toneOf(ex.beforeHighsAvg)}`}>
                {ex.beforeHighsAvg != null ? fmtPctSigned(ex.beforeHighsAvg) : "—"}
              </div>
              <p className="mt-2 text-[12px] text-ink-400">
                LTH supply typically <span className="text-ink-200">fell</span> as holders sold into strength.
              </p>
            </div>
            <div className="card p-6">
              <div className="text-[10px] uppercase tracking-[0.16em] text-ink-400">Into cycle lows</div>
              <div className={`mt-2 font-display text-[30px] font-medium tracking-tight-2 tabular-nums ${toneOf(ex.beforeLowsAvg)}`}>
                {ex.beforeLowsAvg != null ? fmtPctSigned(ex.beforeLowsAvg) : "—"}
              </div>
              <p className="mt-2 text-[12px] text-ink-400">
                LTH supply typically <span className="text-ink-200">rose</span> as holders accumulated weakness.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Chart */}
      <section className="card p-4 sm:p-7 relative">
        <div className="mb-5">
          <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100">
            Long-term holder supply vs price
          </h2>
          <p className="text-[12px] text-ink-400 mt-1">
            Dashed lines mark past cycle highs (red) and lows (green).
          </p>
        </div>
        <OnchainLthChart data={data} markers={markers} height={380} />
        <div className="watermark">halving.lens · LTH supply</div>
      </section>

      <p className="text-[11.5px] text-ink-500 leading-relaxed max-w-2xl">
        Source: {ONCHAIN_SOURCE}
        {ONCHAIN_UPDATED ? ` · updated ${format(new Date(ONCHAIN_UPDATED), "d MMM yyyy")}` : ""}. Long-term
        holders = coins last moved 155+ days ago. History, not advice.
      </p>
    </>
  );
}

function ComingSoonOnchain() {
  const planned = [
    "Long-term holder supply vs cycle highs and lows",
    "MVRV Z-Score, NUPL, SOPR (valuation & profit-taking)",
    "Realized Price (the market's aggregate cost basis)",
    "Reserve Risk (conviction vs price)",
  ];
  return (
    <>
      <section className="card-glow p-6 lg:p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <h2 className="font-display text-[20px] lg:text-[24px] font-medium tracking-tight-2 text-ink-100 leading-snug">
            Connecting on-chain data
          </h2>
          <p className="mt-3.5 text-[14px] text-ink-300 leading-relaxed">
            On-chain cost-basis and holder data needs a dedicated source. We&apos;re wiring{" "}
            <span className="text-ink-100">BGeometrics / bitcoin-data.com</span> (free, on-chain back
            to genesis). Once it&apos;s connected, the panels below switch on with real data — no
            estimated figures in the meantime.
          </p>
        </div>
        <div className="watermark">halving.lens · on-chain</div>
      </section>

      <section className="card p-6 lg:p-7">
        <h3 className="text-[12.5px] font-medium text-ink-100 mb-4 uppercase tracking-[0.16em]">
          What&apos;s coming
        </h3>
        <ul className="space-y-2.5">
          {planned.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[13px] text-ink-300">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
