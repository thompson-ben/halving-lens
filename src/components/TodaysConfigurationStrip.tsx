import { format } from "date-fns";
import { todaysConfigurationPack, STANDING_CLOSE } from "@/lib/fourReferencePrices";

// Today's Configuration as a conversion-landing trust moment. Same first-class
// pack read as TodaysConfigurationCard, different constraints: /free allows no
// leave-the-site route before signup, so this surface is deliberately linkless
// and chartless — the configuration phrase plus its observed frequency, and
// nothing to click. Renders nothing when the pack is unavailable (a marketing
// page shows no apology states). Server component, zero client JS.

const GOLD = "#d9b96a";

export function TodaysConfigurationStrip() {
  const p = todaysConfigurationPack();
  if (!p.available || !p.configuration) return null;

  return (
    <section aria-label="Today's configuration">
      <div className="card p-5 sm:p-6" style={{ borderColor: "rgba(217,185,106,0.18)" }}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
            Today&apos;s Configuration
          </div>
          <div className="hidden sm:block text-[10.5px] text-ink-500 shrink-0">Computed from today&apos;s data</div>
        </div>

        <p className="mt-2 font-display text-[17px] sm:text-[20px] font-medium tracking-tight-2 text-ink-50 leading-snug">
          {p.configuration}
        </p>

        <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">
          {p.frequencyPct != null && (
            <>
              Seen in <span className="text-ink-200 tabular-nums">{p.frequencyPct}%</span> of weeks
              {p.windowFirst && <> since {p.windowFirst.slice(0, 4)}</>}
            </>
          )}
          {p.frequencyPct != null && p.lastSimilarDate && <> · last similar week {format(new Date(p.lastSimilarDate), "d MMM yyyy")}</>}
          {(p.frequencyPct != null || p.lastSimilarDate) && <> · </>}
          {STANDING_CLOSE}
        </p>
      </div>
    </section>
  );
}
