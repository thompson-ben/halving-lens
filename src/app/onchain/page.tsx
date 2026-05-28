import { PlannedView } from "@/components/PlannedView";

export default function OnchainPage() {
  return (
    <PlannedView
      eyebrow="On-chain"
      title="Where the coins actually sit"
      description="The behavioural lens — who's holding, who's spending, who's hoarding. Each chart will have the same 4-cycle overlay as the metric library."
      features={[
        {
          name: "HODL Waves",
          detail: "Supply by age band — see long-term holders accumulate or distribute in real time.",
          paidAt: "Glassnode Advanced",
        },
        {
          name: "Supply by entity",
          detail: "LTH/STH supply, exchange balances, miner balances, ETF custody.",
          paidAt: "CryptoQuant Pro",
        },
        {
          name: "Cost basis distribution",
          detail: "Realised price by cohort — where the demand walls actually sit.",
          paidAt: "Glassnode Advanced",
        },
        {
          name: "Coin Days Destroyed",
          detail: "When dormant supply wakes up — usually a top signal.",
          paidAt: "Glassnode Pro ($799/mo)",
        },
        {
          name: "Exchange reserves",
          detail: "Net flow in/out of every major venue. Sustained outflow = supply shock setup.",
          paidAt: "CryptoQuant Pro",
        },
        {
          name: "Stablecoin Supply Ratio",
          detail: "BTC market cap relative to stablecoin float — dry powder gauge.",
          paidAt: "CryptoQuant Pro",
        },
      ]}
    />
  );
}
