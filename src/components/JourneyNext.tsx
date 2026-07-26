"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/track";
import { JOURNEY_MAP, type JourneyFrom } from "@/lib/journeyMap";

// Continue your journey (PR137) — the reusable curated hand-off at the foot
// of a page: ONE primary next step led by a bridge question, plus at most two
// quieter alternatives. Routing lives in src/lib/journeyMap.ts (the single
// source of truth); this component only renders and measures. Visual language
// mirrors FlagshipJourney's hand-off card so the site keeps one next-step
// idiom. Fires journey_next_impression once when seen, journey_next_click
// with {from, to} on follow.

export function JourneyNext({ from }: { from: JourneyFrom }) {
  const entry = JOURNEY_MAP[from];
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !seen.current) {
            seen.current = true;
            track("journey_next_impression", { from });
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [from]);

  return (
    <section ref={ref} aria-label="Continue your journey" className="border-t border-white/[0.06] pt-8">
      <h2 className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-4">
        Continue your journey
      </h2>

      <Link
        href={entry.primary.href}
        onClick={() => track("journey_next_click", { from, to: entry.primary.href, position: "primary" })}
        className="group block rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-accent/30 px-5 py-4 transition-colors"
      >
        {/* Lead with the question this page leaves you asking, then answer it
            with the destination — the FlagshipJourney hand-off pattern. */}
        <p className="text-[13.5px] text-ink-200 leading-snug max-w-2xl">{entry.bridge}</p>
        <div className="mt-2.5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500">Next</div>
            <div className="mt-0.5 text-[15px] font-display text-accent truncate">{entry.primary.title}</div>
          </div>
          <ArrowRight size={18} className="text-accent shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>

      {entry.secondary.length > 0 && (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-1.5">
          {entry.secondary.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              onClick={() => track("journey_next_click", { from, to: s.href, position: "secondary" })}
              className="text-[12.5px] text-ink-400 hover:text-accent transition-colors"
            >
              {s.label} <span aria-hidden>→</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
