import { Check } from "lucide-react";
import { cycleSummary, whatChanged } from "@/lib/cycleSummary";
import { priorBrief } from "@/lib/briefArchive";

// Compact, scannable "why check today" strip — a daily-habit reminder built from
// the live watch signals (and any day-over-day changes). Short, visual, no prose.
export function WhyCheckToday() {
  const s = cycleSummary();
  const changed = whatChanged(priorBrief());

  // Prefer concrete day-over-day changes; fall back to the top watch signals.
  const items: { text: string; tone: string }[] = [];
  if (changed.available) {
    for (const c of changed.items.slice(0, 4)) {
      items.push({ text: c.summary, tone: c.level });
    }
  }
  for (const w of s.watchSignals) {
    if (items.length >= 4) break;
    items.push({ text: w.status, tone: w.level });
  }

  const dot: Record<string, string> = {
    elevated: "text-signal-amber",
    watch: "text-accent",
    calm: "text-signal-green",
  };

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">Why check today?</span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13px] text-ink-200 leading-snug">
            <Check size={15} className={`mt-0.5 shrink-0 ${dot[it.tone] ?? "text-accent"}`} strokeWidth={2.4} />
            {it.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
