import Link from "next/link";
import type { Metadata } from "next";
import { format } from "date-fns";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { DataBadge } from "@/components/DataBadge";
import { LastUpdated } from "@/components/LastUpdated";
import { ProductionCostChart } from "@/components/ProductionCostChart";
import { MethodologyDisclosure } from "@/components/MethodologyDisclosure";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { RecordView } from "@/components/RecordView";
import { TrackedLink } from "@/components/TrackedLink";
import { productionCostRead } from "@/lib/productionCost";
import {
  ASSUMPTIONS_VERSION,
  EFFICIENCY_J_PER_TH,
  ELECTRICITY_USD_PER_KWH,
  MODEL_START_DATE,
} from "@/lib/data/productionCost";
import { absoluteUrl } from "@/lib/site";
import { fmtPct, fmtUsd } from "@/lib/format";

// Estimated Mining Cost — the third HalvingLens reference price, alongside
// Market Price and Realised Price. MODELLED and labelled as such everywhere:
// an electricity-only, network-level estimate with documented assumptions.
// Never a price floor, never intrinsic value, never a prediction.

const DESC =
  "A modelled estimate of the average electricity cost required to produce one new Bitcoin, using current network conditions and documented assumptions. A network-level estimate — not any miner's break-even, not a price floor.";

export const metadata: Metadata = {
  title: { absolute: "Bitcoin Estimated Mining Cost | HalvingLens" },
  description: DESC,
  alternates: { canonical: "/metrics/estimated-mining-cost" },
  openGraph: {
    title: "Bitcoin Estimated Mining Cost",
    description: DESC,
    url: "/metrics/estimated-mining-cost",
    type: "article",
  },
  twitter: { card: "summary_large_image", title: "Bitcoin Estimated Mining Cost", description: DESC },
};

function ReferenceStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "up" | "down" }) {
  const color = tone == null ? "text-ink-50" : tone === "up" ? "text-signal-green" : "text-signal-red";
  return (
    <div className="bg-[#0b0f15] px-5 py-5">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className={`mt-2 font-display text-[26px] lg:text-[30px] tabular-nums leading-none ${color}`}>{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-ink-400">{sub}</div>}
    </div>
  );
}

export default function CostOfProductionPage() {
  const r = productionCostRead();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Bitcoin Estimated Mining Cost",
    description: DESC,
    url: absoluteUrl("/metrics/estimated-mining-cost"),
  };

  return (
    <div className="space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RecordView kind="metric" title="Estimated Mining Cost" href="/metrics/estimated-mining-cost" />

      <div>
        <Link href="/metrics" className="inline-flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-accent transition-colors">
          <ArrowLeft size={13} /> Metric library
        </Link>
      </div>

      {/* A. Header */}
      <header>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">Reference price</span>
          <DataBadge status={r.available ? "modelled" : "coming-soon"} source={r.available ? `HalvingLens electricity-cost model ${r.assumptionsVersion}` : undefined} />
        </div>
        <h1 className="font-display text-[40px] lg:text-[56px] font-medium tracking-tightest text-ink-50 leading-[1.05]">
          Estimated Mining Cost
        </h1>
        {/* B. Plain-English definition */}
        <p className="mt-5 text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          A modelled estimate of the average electricity cost required to produce one new Bitcoin
          using current network conditions and documented assumptions. Mining costs vary
          significantly between operators — this is a network-level estimate, not the actual cost
          faced by every miner.
        </p>
        <div className="mt-3 flex items-center gap-4 flex-wrap">
          <LastUpdated prefix="Inputs as of" />
          {r.hashrateObservedAt && (
            <span className="text-[11px] text-ink-500">
              Hashrate observed {format(new Date(r.hashrateObservedAt), "d MMM yyyy")}
            </span>
          )}
        </div>
      </header>

      {r.available ? (
        <>
          {/* C. Current reading — the price-vs-cost relationship is the insight */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
            <ReferenceStat
              label="Current Market Price"
              value={r.marketPrice != null ? fmtUsd(r.marketPrice, { compact: true }) : "—"}
            />
            <ReferenceStat
              label="Estimated Mining Cost"
              value={fmtUsd(r.central!, { compact: true })}
              sub={`Estimated range ${fmtUsd(r.low!, { compact: true })} – ${fmtUsd(r.high!, { compact: true })}`}
            />
            <ReferenceStat
              label="Price vs Estimated Mining Cost"
              value={
                r.diffUsd != null && r.premiumPct != null
                  ? `${r.diffUsd >= 0 ? "+" : "−"}${fmtUsd(Math.abs(r.diffUsd), { compact: true })} · ${fmtPct(r.premiumPct, 0)}`
                  : "—"
              }
              sub={r.bandLabel ?? undefined}
              tone={r.premiumPct != null ? (r.premiumPct >= 0 ? "up" : "down") : undefined}
            />
          </section>

          {/* D. Historical chart */}
          <section className="card p-4 sm:p-7 relative">
            <ProductionCostChart height={380} />
            <div className="watermark">halvinglens.com · estimated mining cost</div>
          </section>

          {/* E. What it's telling us today */}
          <section className="card p-6">
            <h2 className="text-[12.5px] font-medium text-ink-100 mb-2 uppercase tracking-[0.16em]">
              What it&apos;s telling us today
            </h2>
            <p className="text-[14px] text-ink-300 leading-relaxed max-w-2xl">
              {r.bandLabel}. Market Price is {fmtPct(Math.abs(r.premiumPct!), 0)}{" "}
              {r.premiumPct! >= 0 ? "above" : "below"} the central estimate
              {r.premiumPct! <= -33 &&
                " — some miners may face financial pressure. Historically, Bitcoin has often traded near this level during periods of miner stress, but this estimate should not be interpreted as a guaranteed support level or price floor"}
              {r.premiumPct! > -33 && r.premiumPct! < 33 &&
                " — modelled average mining margins are compressed; individual operators' economics vary widely"}
              {r.premiumPct! >= 33 &&
                " — mining is more economically favourable for the modelled average operator; individual operators' economics vary widely"}
              . Historical context, not a prediction.
            </p>
          </section>
        </>
      ) : (
        <section className="card p-6">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500 mb-2">Not shown right now</div>
          <p className="text-[13.5px] text-ink-300 leading-relaxed max-w-2xl">
            {r.unavailableReason} We withhold the estimate rather than display a stale or
            fabricated value.
          </p>
        </section>
      )}

      {/* F. Why this matters */}
      <section className="card p-6">
        <h2 className="text-[12.5px] font-medium text-ink-100 mb-3 uppercase tracking-[0.16em]">Why this matters</h2>
        <ul className="space-y-2.5 text-[13.5px] text-ink-300 leading-relaxed max-w-2xl list-disc pl-5">
          <li>Miners are structural sellers — they have ongoing operating expenses to cover, so mining economics shape a steady flow of potential sell pressure.</li>
          <li>Mining margins can affect miner behaviour and network conditions across the cycle.</li>
          <li>Periods with Market Price below the estimated mining cost have historically placed pressure on less efficient operators.</li>
          <li>Historically, Bitcoin has often traded near this level during periods of miner stress, but this estimate should <span className="text-ink-100">not</span> be interpreted as a guaranteed support level or price floor — price has traded below the modelled cost for extended periods.</li>
          <li>Network difficulty adjusts roughly every two weeks, and miners use very different hardware and energy prices — the modelled average moves with the network.</li>
        </ul>
      </section>

      {/* G. Methodology — visible, expandable, versioned */}
      <MethodologyDisclosure eventName="production_cost_methodology_opened" summary={`Methodology & assumptions — HalvingLens electricity-cost model ${ASSUMPTIONS_VERSION}`}>
        <div className="space-y-4 text-[13px] text-ink-300 leading-relaxed max-w-2xl">
          <p>
            <span className="text-ink-100">Formula.</span> Daily network energy = hashrate (TH/s) ×
            fleet efficiency (J/TH) × 86,400s. Cost per Bitcoin = (energy in kWh × electricity
            price) ÷ Bitcoin issued that day (block subsidy × 144 blocks; transaction fees are
            excluded from the denominator, which makes the estimate conservative).
          </p>
          <p>
            <span className="text-ink-100">Observed inputs.</span> Network hashrate history
            (CoinMetrics community data) and the block-subsidy schedule. No price data enters the
            cost calculation.
          </p>
          <p>
            <span className="text-ink-100">Assumptions (versioned, {ASSUMPTIONS_VERSION}).</span>{" "}
            Fleet efficiency is a stepped, network-weighted curve from {EFFICIENCY_J_PER_TH[0].jPerTh} J/TH
            in 2016 to {EFFICIENCY_J_PER_TH[EFFICIENCY_J_PER_TH.length - 1].jPerTh} J/TH in 2026,
            referenced to Cambridge CBECI efficiency assumptions and public miner-fleet
            disclosures. Electricity is priced at ${ELECTRICITY_USD_PER_KWH.central.toFixed(2)}/kWh
            (central) within a ${ELECTRICITY_USD_PER_KWH.low.toFixed(2)}–${ELECTRICITY_USD_PER_KWH.high.toFixed(2)}/kWh
            band — the shaded range on the chart.
          </p>
          <p>
            <span className="text-ink-100">Excluded costs.</span> Hardware purchase and
            depreciation, cooling overhead, labour, pool fees, financing and taxes. Real all-in
            costs are therefore higher than this electricity-only estimate.
          </p>
          <p>
            <span className="text-ink-100">Coverage & refresh.</span> Modelled from {MODEL_START_DATE.slice(0, 4)} (earlier
            fleet composition is too uncertain to defend); refreshed with the daily data sync. If
            the hashrate observation behind the model is more than 7 days old, the estimate is
            withheld rather than shown stale.
          </p>
          <p>
            <span className="text-ink-100">Limitations.</span> A network-level modelled estimate, not
            any miner&apos;s break-even; not a guaranteed support level or price floor; not
            intrinsic value; not a prediction. See
            the <Link href="/methodology" className="text-accent">methodology page</Link> for how
            modelled metrics are labelled across HalvingLens.
          </p>
        </div>
      </MethodologyDisclosure>

      {/* H. Related */}
      <section>
        <h2 className="text-[12.5px] font-medium text-ink-100 mb-3 uppercase tracking-[0.16em]">Related</h2>
        <div className="flex flex-wrap gap-2.5">
          {[
            { href: "/metrics/realized-price", label: "Realised Price" },
            { href: "/metrics/puell-multiple", label: "Puell Multiple" },
            { href: "/miners", label: "Miners" },
            { href: "/market-health", label: "Market Health" },
            { href: "/state-of-bitcoin", label: "State of Bitcoin" },
            { href: "/learn", label: "Understanding Bitcoin prices" },
          ].map((l) => (
            <TrackedLink
              key={l.href}
              href={l.href}
              event="cost_of_production_related_metric_clicked"
              props={{ target: l.href }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.1] text-[12.5px] text-ink-300 hover:text-ink-100 hover:border-accent/30 transition-colors"
            >
              {l.label} <ArrowUpRight size={12} />
            </TrackedLink>
          ))}
        </div>
      </section>

      <FeedbackWidget section="estimated-mining-cost" contentType="metric" />
    </div>
  );
}
