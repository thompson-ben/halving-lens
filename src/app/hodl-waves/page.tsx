import { format } from "date-fns";
import { HodlWavesChart } from "@/components/HodlWavesChart";
import { DataBadge } from "@/components/DataBadge";
import { HODL_BANDS, HODL_LIVE, HODL_SOURCE, HODL_UPDATED } from "@/lib/hodlWaves";

const DESC =
  "Bitcoin HODL Waves — the share of supply by how long coins have been held, across every halving cycle. See accumulation and distribution in historical context.";
export const metadata = {
  title: { absolute: "Bitcoin HODL Waves | HalvingLens" },
  description: DESC,
  alternates: { canonical: "/hodl-waves" },
  openGraph: { title: "Bitcoin HODL Waves", description: DESC, url: "/hodl-waves", type: "website" },
  twitter: { card: "summary_large_image", title: "Bitcoin HODL Waves", description: DESC },
};

export default function HodlWavesPage() {
  return (
    <div className="space-y-12">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">HODL Waves</span>
          <DataBadge status={HODL_LIVE ? "live-derived" : "coming-soon"} source={HODL_LIVE ? HODL_SOURCE ?? undefined : undefined} />
        </div>
        <h1 className="font-display text-[40px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Where every coin sits, by how long it's been held.
        </h1>
        <p className="mt-5 text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          Each band is the share of total supply last moved within that age window. Long-term
          holders distribute into tops. Short-term cohorts swell as the supply reshuffles. Reading
          this chart is reading the conviction of the network.
        </p>
      </header>

      {HODL_LIVE ? (
        <div className="rounded-xl border border-signal-green/25 bg-signal-green/[0.06] px-5 py-4 flex items-start gap-3">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-signal-green shrink-0" />
          <p className="text-[13px] text-ink-200 leading-relaxed">
            <span className="font-medium text-signal-green">Live data.</span> Supply share by coin
            age from {HODL_SOURCE}
            {HODL_UPDATED ? `, refreshed weekly (updated ${format(new Date(HODL_UPDATED), "d MMM yyyy")})` : ""}.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-signal-amber/25 bg-signal-amber/[0.06] px-5 py-4 flex items-start gap-3">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-signal-amber shrink-0" />
          <p className="text-[13px] text-ink-200 leading-relaxed">
            <span className="font-medium text-signal-amber">Illustrative — not live data.</span> HODL
            Waves require per-age-band UTXO data, which isn&apos;t available from our current free
            on-chain source. The shape below shows the canonical pattern for learning purposes — long-term
            holders distributing into tops, short-term cohorts swelling near peaks. It will switch to
            live data only if a free band-level source is connected.
          </p>
        </div>
      )}

      <div className="card p-7 lg:p-8 relative">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100">
              Cycle 5 · supply by age cohort
            </h2>
            <div className="text-[11.5px] text-ink-400 mt-1">
              Weekly samples since the 2024 halving.
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-[11px]">
            <span className="text-ink-400">Old supply (HODLers)</span>
            <div className="w-20 h-2 rounded-full bg-gradient-to-r from-signal-red via-signal-amber via-50% via-signal-green to-signal-violet" />
            <span className="text-ink-400">Young supply (movement)</span>
          </div>
        </div>

        <HodlWavesChart height={480} />

        <div className="mt-6 pt-5 border-t border-white/[0.04]">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-2.5">
            {HODL_BANDS.map((b) => (
              <div key={b.id} className="flex items-center gap-2 text-[11.5px]">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: b.color, opacity: 0.95 }}
                />
                <span className="text-ink-300">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="watermark">halvinglens.com · HODL waves</div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-7">
          <h3 className="font-display text-[18px] font-medium text-ink-100 tracking-tight-2">
            Reading the chart
          </h3>
          <p className="mt-3 text-[12.5px] text-ink-300 leading-relaxed">
            When the warm bands (red, orange, yellow) swell, supply is moving — typically a
            late-cycle signal as long-term holders take profit and coins enter the hands of
            newcomers.
          </p>
        </div>
        <div className="card p-7">
          <h3 className="font-display text-[18px] font-medium text-ink-100 tracking-tight-2">
            What bottoms look like
          </h3>
          <p className="mt-3 text-[12.5px] text-ink-300 leading-relaxed">
            Cool bands (green through violet) dominate. Old supply doesn't move. The 1y+ cohort
            crossing 70% has marked every cycle bottom on record.
          </p>
        </div>
        <div className="card p-7">
          <h3 className="font-display text-[18px] font-medium text-ink-100 tracking-tight-2">
            Why this matters
          </h3>
          <p className="mt-3 text-[12.5px] text-ink-300 leading-relaxed">
            HODL Waves is the most heavily paywalled on-chain chart — Glassnode locks the full
            history behind their Advanced tier. Here, free, with the cycle context built in.
          </p>
        </div>
      </section>
    </div>
  );
}
