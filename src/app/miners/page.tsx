import { PlannedView } from "@/components/PlannedView";

export default function MinersPage() {
  return (
    <PlannedView
      eyebrow="Miners"
      title="Hash, difficulty, and miner conviction"
      description="Miners are forced sellers — when they hold, they're confident. When they capitulate, the bottom is usually within months."
      features={[
        {
          name: "Hash Ribbons",
          detail: "30d vs 60d hash rate MA — a textbook bottom signal when they cross back up.",
          paidAt: "Glassnode Advanced",
        },
        {
          name: "Difficulty ribbon",
          detail: "Compression = miners struggling. Expansion = miners thriving.",
        },
        {
          name: "Miner reserves",
          detail: "Total BTC held in miner addresses. Outflow = selling pressure.",
          paidAt: "CryptoQuant Pro",
        },
        {
          name: "Hash price",
          detail: "USD revenue per TH/s — miner unit economics in a single number.",
          paidAt: "Hashrate Index Pro",
        },
      ]}
    />
  );
}
