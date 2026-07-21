import { DownsideLadder } from "@/components/DownsideLadder";
import { downsideScenarios } from "@/lib/downside";
import { fmtUsd, fmtPct } from "@/lib/format";

// The dedicated downside-scenarios page. Previously linked from the homepage
// DownsidePreview and /start but had no route (a live 404) — this gives that
// content its home. Historical context / reference levels, NOT a forecast.
const DESC =
  "Where prior-cycle bear-market drawdowns would put Bitcoin, measured from the cycle high. Historical context and reference levels — not a prediction or price target.";
export const metadata = {
  title: { absolute: "Bitcoin Downside Scenarios | HalvingLens" },
  description: DESC,
  alternates: { canonical: "/downside-scenarios" },
  openGraph: { title: "Bitcoin Downside Scenarios", description: DESC, url: "/downside-scenarios", type: "website" },
  twitter: { card: "summary_large_image", title: "Bitcoin Downside Scenarios", description: DESC },
};

const GOLD = "#d9b96a";

export default function DownsideScenariosPage() {
  const d = downsideScenarios();
  const bears = d.available ? d.historicalBears : [];

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="text-[10.5px] uppercase tracking-[0.24em]" style={{ color: GOLD }}>Risk context</div>
        <h1 className="font-display text-[36px] lg:text-[50px] font-medium tracking-tightest text-ink-50 leading-[1.05]">
          If Bitcoin corrected like prior cycles…
        </h1>
        <p className="text-[15px] text-ink-300 max-w-2xl leading-relaxed">
          Bitcoin has fallen sharply even inside long-term bull structures. These are the price levels
          that prior cyclical bear-market drawdowns — measured from the cycle high
          {d.available ? ` (${fmtUsd(d.cycleHigh, { compact: true })})` : ""} — would imply. This is
          historical context and reference levels, <span className="text-ink-100">not a prediction, not a
          price target, and not financial advice.</span>
        </p>
      </header>

      <DownsideLadder />

      {bears.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100">The prior cyclical bears these are based on</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-ink-400 text-[11px] uppercase tracking-[0.12em]">
                  <th className="text-left font-normal px-4 py-3">Bear market</th>
                  <th className="text-right font-normal px-4 py-3">Drawdown</th>
                  <th className="text-right font-normal px-4 py-3 hidden sm:table-cell">High → low</th>
                  <th className="text-right font-normal px-4 py-3">Low</th>
                </tr>
              </thead>
              <tbody>
                {bears.map((b) => (
                  <tr key={b.label} className="border-t border-white/[0.06]">
                    <td className="px-4 py-3 text-ink-200">{b.label}</td>
                    <td className="px-4 py-3 text-right font-mono text-signal-red tabular-nums">{fmtPct(b.drawdownPct, 0)}</td>
                    <td className="px-4 py-3 text-right font-mono text-ink-400 tabular-nums hidden sm:table-cell">
                      {fmtUsd(b.fromPrice, { compact: true })} → {fmtUsd(b.toPrice, { compact: true })}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-400 tabular-nums">{b.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-[11px] text-ink-500 leading-relaxed border-t border-white/[0.06] pt-5 max-w-2xl">
        Scenarios are derived from Bitcoin&apos;s mildest, average and deepest prior cyclical bear markets
        {d.available ? "" : " (they appear once the live price history is connected)"}. Past behaviour is
        not a guide to future results. Historical context, not a prediction or price target — not financial advice.
      </p>
    </div>
  );
}
