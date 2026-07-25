import { TrackedLink } from "@/components/TrackedLink";
import { TrackedSection } from "@/components/TrackedSection";
import { referencePrices } from "@/lib/productionCost";
import { priceContext } from "@/lib/priceContext";
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
  href,
  event,
  modelled,
}: {
  label: string;
  sub: string;
  value: string;
  relation?: string | null;
  href?: string;
  event?: string;
  modelled?: boolean;
}) {
  const body = (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-ink-100">{label}</span>
          {modelled && (
            <span className="text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border border-signal-violet/25 text-signal-violet bg-signal-violet/[0.08]">
              Estimated
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11.5px] text-ink-500">{sub}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-display text-[22px] tabular-nums text-ink-50 leading-none">{value}</div>
        {relation && <div className="mt-1 text-[11px] text-ink-400">{relation}</div>}
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
        <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent mb-1">Reference Prices</div>
        <p className="text-[12px] text-ink-400 mb-2 max-w-xl">
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
              href="/price"
            />
          )}
          {r.realisedPrice != null && (
            <Row
              label="Realised Price"
              sub="The network's aggregate holder cost basis"
              value={fmtUsd(r.realisedPrice, { compact: true })}
              relation={rel(r.vsRealisedPct)}
              href="/metrics/realized-price"
            />
          )}
          {r.productionAvailable && r.productionCost != null && (
            <Row
              label="Estimated Mining Cost"
              sub="Modelled electricity cost to mine one new Bitcoin"
              value={fmtUsd(r.productionCost, { compact: true })}
              relation={rel(r.vsProductionPct)}
              href="/metrics/estimated-mining-cost"
              modelled
            />
          )}
        </div>
        {r.todaysContext && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink-500 mb-1.5">Today&apos;s context</div>
            <p className="text-[12.5px] text-ink-300 leading-relaxed">{r.todaysContext}</p>
          </div>
        )}
      </div>
    </TrackedSection>
  );
}
