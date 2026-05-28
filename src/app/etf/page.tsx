import { PlannedView } from "@/components/PlannedView";

export default function EtfPage() {
  return (
    <PlannedView
      eyebrow="ETF flow"
      title="What BlackRock & friends are doing"
      description="Daily net flows for every spot Bitcoin ETF, normalised against historical halving cycles for the first time. ETF data is the structural variable that didn't exist in prior cycles."
      features={[
        {
          name: "Daily net flow",
          detail: "All US spot ETFs (IBIT, FBTC, ARKB, etc.) — inflows minus outflows.",
          paidAt: "Bitcoin Magazine Pro ($35/mo)",
        },
        {
          name: "BTC absorbed",
          detail: "Coins flowing into ETF custody vs. daily issuance — the structural sink.",
        },
        {
          name: "Cycle overlay",
          detail: "How spot ETF demand is reshaping cycle 5's supply curve vs. cycles 2–4.",
        },
        {
          name: "Premium tracker",
          detail: "Coinbase premium index — US-driven price action signal.",
          paidAt: "CryptoQuant Pro",
        },
      ]}
    />
  );
}
