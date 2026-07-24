import { PlannedView } from "@/components/PlannedView";

// Planned-feature preview (PR131): honest metadata, kept out of the index until
// the feature ships — a placeholder page should never rank or inherit the
// homepage's metadata.
export const metadata = {
  title: "Cycle Alerts — planned",
  description:
    "A planned HalvingLens feature: alerts when cycle metrics cross historically significant zones. Not yet available.",
  robots: { index: false, follow: true },
};

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
