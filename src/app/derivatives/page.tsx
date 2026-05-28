import { PlannedView } from "@/components/PlannedView";

export default function DerivativesPage() {
  return (
    <PlannedView
      eyebrow="Derivatives"
      title="What leverage is doing"
      description="Funding, basis, and open interest — the perpetual-futures lens that turns slow on-chain shifts into tactical reads."
      features={[
        {
          name: "Funding rate (aggregate)",
          detail: "Cross-venue perp funding — euphoria and capitulation, in basis points.",
          paidAt: "Coinglass Pro ($29/mo)",
        },
        {
          name: "Open interest by venue",
          detail: "Where leverage is sitting — CME (institutional) vs Binance (retail).",
          paidAt: "Coinglass Pro",
        },
        {
          name: "Taker buy/sell ratio",
          detail: "Aggressive market orders, segmented by side. Pure short-term sentiment.",
          paidAt: "CryptoQuant Pro",
        },
        {
          name: "Annualised basis",
          detail: "Cash-and-carry yield — when this fades, the cycle leverage unwind has started.",
        },
      ]}
    />
  );
}
