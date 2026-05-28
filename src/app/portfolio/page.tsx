import { ComingSoon } from "@/components/ComingSoon";

export default function PortfolioPage() {
  return (
    <ComingSoon
      eyebrow="Portfolio"
      title="Your own wallets, with the same lens"
      description="Connect read-only via wallet address or signed message. We render the same x-ray on you that we render on the cohort — true PnL net of gas and bridges, hold-time analysis, and your rank against the smart-money cohort."
      features={[
        { name: "True PnL", detail: "Net of gas, bridge cost, MEV, and rebases." },
        { name: "Cohort rank", detail: "See where your performance sits vs the wallets you watch." },
        { name: "Tax-ready export", detail: "Per-disposal cost basis, FIFO/LIFO, exportable." },
        { name: "Risk view", detail: "Concentration, correlation, illiquidity exposure." },
      ]}
    />
  );
}
