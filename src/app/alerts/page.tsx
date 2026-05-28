import { ComingSoon } from "@/components/ComingSoon";

export default function AlertsPage() {
  return (
    <ComingSoon
      eyebrow="Alerts"
      title="Wake me when the chain moves"
      description="Push, email, Telegram, and webhook alerts on any chain event — wallet trades, holder shifts, listings, governance votes. Built on the same labeled-wallet graph as the rest of the app."
      features={[
        { name: "Wallet alerts", detail: "Ping me when @Ansem opens a new position > $250k." },
        { name: "Token thresholds", detail: "Smart-money flow into $WIF crosses $5M in a day." },
        { name: "Concentration shifts", detail: "Top-10 concentration on $ONDO drops below 40%." },
        { name: "Webhook out", detail: "Fire to your trading bot or Discord channel directly." },
      ]}
    />
  );
}
