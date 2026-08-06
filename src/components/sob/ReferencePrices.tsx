import { TrackedLink } from "@/components/TrackedLink";
import type { TrackedEvent } from "@/lib/analyticsEvents";
import { TrackedSection } from "@/components/TrackedSection";
import { referencePrices } from "@/lib/productionCost";
import { priceContext } from "@/lib/priceContext";
import { referenceGap, gapTrajectoryLine, type ReferenceId } from "@/lib/referenceGaps";
import { fmtUsd } from "@/lib/format";

// Reference Prices — the full HalvingLens reference-price set side by side:
// Market Price (what Bitcoin trades for), 200-Day Moving Average (long-term
// trend, observed), Realised Price (aggregate holder cost basis, observed),
// Estimated Mining Cost (modelled electricity cost to mine one Bitcoin,
// estimated). Plus one deterministic "Today's Context" paragraph relating
// them. Descriptive, never predictive. Rows drop out cleanly when a source
// is unavailable — the estimated row also drops when its data is stale.

function Row({
  label,
  sub,
  value,
  relation,
  trajectory,
  href,
  event,
  modelled,
}: {
  label: string;
  sub: string;
  value: string;
  relation?: string | null;
  trajectory?: string | null;
  href?: string;
  event?: TrackedEvent;
  modelled?: boolean;
}) {
  const body = (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-body font-medium text-ink-100">{label}</span>
          {modelled && (
            <span className="eyebrow px-1.5 py-0.5 rounded-full border border-signal-violet/25 text-signal-violet bg-signal-violet/[0.08]">
              Estimated
            </span>
          )}
        </div>
        <div className="mt-0.5 text-caption text-ink-500">{sub}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-display text-headline tabular-nums text-ink-50 leading-none">{value}</div>
        {relation && <div className="mt-1 text-caption text-ink-400">{relation}</div>}
        {trajectory && <div className="mt-0.5 text-micro text-ink-500">{trajectory}</div>}
      </div>
    </div>
  );
  if (!href) return body;
  return (
    <TrackedLink href={href} event={event ?? "reference_price_row_clicked"} props={{ label }} className="block hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors">
      {body}
    </TrackedLink>
  );
}

export function ReferencePrices() {
  const r = referencePrices({ ma200: priceContext().ma200 });
  if (r.marketPrice == null) return null;

  const rel = (pct: number | null) =>
    pct == null ? null : `Market Price is ${Math.abs(pct).toFixed(0)}% ${pct >= 0 ? "above" : "below"}`;

  // The week's trajectory of each relationship — ONE added line per row,
  // quoted from the reference-gap engine at the page's weekly lens (PR-FRP2).
  const weekTrajectory = (id: ReferenceId): string | null => {
    const g = referenceGap(id, 7);
    return g.available ? gapTrajectoryLine(g) : null;
  };

  // The intro names only the rows actually shown, so it stays truthful when a
  // source is unavailable and its row has dropped out.
  const introParts = ["what Bitcoin trades for"];
  if (r.ma200 != null) introParts.push("its long-term trend");
  if (r.realisedPrice != null) introParts.push("what the average holder paid");
  if (r.productionAvailable && r.productionCost != null)
    introParts.push("roughly what it costs to produce a new one");
  const intro =
    introParts.length === 1
      ? introParts[0]
      : `${introParts.slice(0, -1).join(", ")} and ${introParts[introParts.length - 1]}`;

  return (
    <TrackedSection id="reference-prices">
      <div className="card p-5 sm:p-6">
        <div className="eyebrow text-accent mb-1">Reference Prices</div>
        <p className="text-caption text-ink-400 mb-2 max-w-xl">
          The prices HalvingLens reads the market against — {intro}.
        </p>
        <div className="divide-y divide-white/[0.06]">
          <Row
            label="Market Price"
            sub="What Bitcoin trades for today"
            value={fmtUsd(r.marketPrice, { compact: true })}
            href="/price"
          />
          {r.ma200 != null && (
            <Row
              label="200-Day Moving Average"
              sub="The long-term price trend, averaged over 200 days"
              value={fmtUsd(r.ma200, { compact: true })}
              relation={rel(r.vsMa200Pct)}
              trajectory={weekTrajectory("ma200")}
              href="/price"
            />
          )}
          {r.realisedPrice != null && (
            <Row
              label="Realised Price"
              sub="The network's aggregate holder cost basis"
              value={fmtUsd(r.realisedPrice, { compact: true })}
              relation={rel(r.vsRealisedPct)}
              trajectory={weekTrajectory("realized_price")}
              href="/metrics/realized-price"
            />
          )}
          {r.productionAvailable && r.productionCost != null && (
            <Row
              label="Estimated Mining Cost"
              sub="Modelled electricity cost to mine one new Bitcoin"
              value={fmtUsd(r.productionCost, { compact: true })}
              relation={rel(r.vsProductionPct)}
              trajectory={weekTrajectory("mining_cost")}
              href="/metrics/estimated-mining-cost"
              modelled
            />
          )}
        </div>
        {r.todaysContext && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <div className="eyebrow text-ink-500 mb-1.5">Today&apos;s context</div>
            <p className="text-caption text-ink-300 leading-relaxed max-w-measure">{r.todaysContext}</p>
          </div>
        )}
        {/* This card is the summary; the framework page is the full read —
            configuration history, gaps over time, what happened next. */}
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <TrackedLink
            href="/four-reference-prices"
            event="journey_next_click"
            props={{ from: "/state-of-bitcoin", to: "/four-reference-prices", position: "secondary" }}
            className="text-caption text-accent"
          >
            Explore the full Four Reference Prices framework →
          </TrackedLink>
        </div>
      </div>
    </TrackedSection>
  );
}
