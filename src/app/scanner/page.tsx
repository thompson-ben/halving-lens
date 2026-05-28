import { ComingSoon } from "@/components/ComingSoon";

export default function ScannerPage() {
  return (
    <ComingSoon
      eyebrow="Scanner"
      title="Find tokens by on-chain pattern"
      description="Multi-condition scanner across every indexed token — combine smart-money signals, holder shape, exchange flow, and liquidity to surface ideas the price chart hasn't shown yet."
      features={[
        { name: "Smart money buying + low concentration", detail: "Early-stage accumulation patterns." },
        { name: "CEX outflow + insider accumulating", detail: "Classic supply-shock setup." },
        { name: "Fresh wallets > 20% with deep liquidity", detail: "Healthy retail-led rotation." },
        { name: "Whale exit + falling holders", detail: "Distribution before the candle." },
      ]}
    />
  );
}
