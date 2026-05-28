import { PlannedView } from "@/components/PlannedView";

export default function AlertsPage() {
  return (
    <PlannedView
      eyebrow="Alerts"
      title="Ping me when the cycle moves"
      description="Push, email, Telegram, and webhook alerts on any of the metrics in the library — zone crossings, cycle-relative deviations, Pi Cycle triggers, or composite index thresholds."
      features={[
        { name: "Zone crossings", detail: "Alert when MVRV-Z crosses into the top zone." },
        { name: "Pi Cycle Top", detail: "Fire the moment the 111DMA crosses 2× the 350DMA — it has called every cycle peak." },
        { name: "Cycle deviation", detail: "Ping me if cycle 5 starts tracking cycle 4 by >20%." },
        { name: "Composite index", detail: "Alert when the CCI moves out of mid-cycle." },
      ]}
    />
  );
}
