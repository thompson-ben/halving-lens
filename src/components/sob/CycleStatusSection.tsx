import { weekStory } from "@/lib/weekStory";
import { CycleStatusCard } from "@/components/WeekInContext";

// Section 7 — What did not change? The cycle-status verdict, promoted to its
// own section so ordinary weekly volatility is never mistaken for a regime
// change. Reuses the exact same cycleStatus logic used elsewhere (a band
// crossing is the only event that moves a classification) — no separate
// editorial-judgement layer.
export function CycleStatusSection() {
  const story = weekStory();
  return <CycleStatusCard status={story.cycleStatus} />;
}
