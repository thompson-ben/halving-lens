import { weekStory } from "@/lib/weekStory";

// The close of "where we are" (Act 3, beat one): did the week move the cycle
// interpretation? Ordinary volatility is never mistaken for a regime change.
// Reuses the exact cycleStatus logic used elsewhere (a band crossing is the
// only event that moves a classification) — no separate editorial layer, and
// no box: the verdict is typography, not a widget.
export function CycleStatusSection() {
  const s = weekStory().cycleStatus;
  return (
    <div className="border-t border-white/[0.06] pt-5">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="eyebrow text-editorial">Cycle status</span>
        <span className="eyebrow text-ink-500">{s.badge}</span>
      </div>
      <h3 className="mt-2 font-display text-headline text-ink-50 leading-snug tracking-tight-2">
        {s.headline}
        <span className="text-ink-500">.</span>
      </h3>
      <p className="mt-2 text-body text-ink-300 leading-relaxed max-w-measure">{s.detail}</p>
    </div>
  );
}
