"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { TalkingPoint, WeekInFive as WeekInFiveData } from "@/lib/talkingPoints/types";

// This Week in Five (SoB 2.0, PR-SB3) — the agenda rail in the standfirst
// and its expansion in "What matters most". Both render the SAME canonical
// talking-point objects: the rail is the short form, the expansion is the
// long form. There is never a second set of conclusions.
//
// Selecting an item scrolls to the act that expands it and gives that item
// a brief, restrained highlight — no modal, no hidden narrative, no
// theatrical animation that delays navigation.

/** How far down the viewport a reader is assumed to be reading — the middle
 *  of the screen, which is also where a deep link parks the card it opens. */
const READING_LINE = 0.5;

function scrollToPoint(anchor: string, id: string) {
  const target = document.querySelector(anchor) as HTMLElement | null;
  const item = document.getElementById(`tp-${id}`);
  (item ?? target)?.scrollIntoView({ behavior: "smooth", block: "center" });
  if (item) {
    item.setAttribute("data-tp-flash", "true");
    window.setTimeout(() => item.removeAttribute("data-tp-flash"), 1600);
    item.focus({ preventScroll: true });
  }
}

/** Act 4 — the sticky agenda rail beside the expansions, tracking which
 *  point is currently being read. The rail and the expansion render the
 *  SAME canonical objects; the active state is presentation only. */
export function WeekInFiveExpanded({ data }: { data: WeekInFiveData }) {
  const [active, setActive] = useState<string | null>(data.points[0]?.id ?? null);
  const refs = useRef<Record<string, HTMLElement | null>>({});

  // Which point is currently being read: whichever card sits closest to the
  // reading line. A single deterministic rule — no intersection bands for a
  // card to fall between, so every point takes its turn in the rail exactly
  // once as the reader scrolls the act.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * READING_LINE;
      let current = data.points[0]?.id ?? null;
      let nearest = Infinity;
      for (const p of data.points) {
        const el = refs.current[p.id];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const distance = Math.abs((r.top + r.bottom) / 2 - line);
        if (distance < nearest) { nearest = distance; current = p.id; }
      }
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [data.points]);

  // Selecting a rail item behaves exactly like the old standfirst deep link:
  // scroll to the card, flash it briefly, and move keyboard focus with it.

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)] gap-6">
      {/* Below lg the sticky rail has no room, so the same objects ride as a
          chip strip pinned under the top bar for the act's duration — same
          active state, same deep links, different geometry. */}
      <nav aria-label="Jump to a point" className="lg:hidden sticky top-[72px] z-20 -mx-4 px-4 py-2 bg-ink-950/85 backdrop-blur-md border-b border-white/[0.06] overflow-x-auto no-scrollbar">
        <ol className="flex gap-1.5 min-w-max">
          {data.points.map((p) => {
            const on = active === p.id;
            return (
              <li key={p.id}>
                <button
                  onClick={() => scrollToPoint(p.anchor, p.id)}
                  aria-current={on ? "true" : undefined}
                  className={`whitespace-nowrap px-2.5 py-1 rounded-full border font-mono text-micro transition-colors ${
                    on ? "border-editorial/50 text-editorial" : "border-white/10 text-ink-400"
                  }`}
                >
                  4.{p.rank}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <nav aria-label="The week's five points" className="hidden lg:block">
        <ol className="sticky top-24 space-y-1">
          {data.points.map((p) => {
            const on = active === p.id;
            return (
              <li key={p.id}>
                <button
                  onClick={() => scrollToPoint(p.anchor, p.id)}
                  aria-current={on ? "true" : undefined}
                  className={`w-full text-left flex gap-2.5 px-3 py-2 rounded-lg border-l-2 transition-colors ${
                    on ? "border-l-editorial bg-white/[0.04] text-ink-100" : "border-l-transparent text-ink-500 hover:text-ink-300"
                  }`}
                >
                  <span className="text-micro font-mono text-ink-600 mt-0.5 shrink-0">4.{p.rank}</span>
                  <span className="text-caption leading-snug line-clamp-3">{p.headline}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
        {data.points.map((p) => (
          <PointCard key={p.id} p={p} onMount={(el) => { refs.current[p.id] = el; }} />
        ))}
      </div>
    </div>
  );
}

function PointCard({ p, onMount }: { p: TalkingPoint; onMount?: (el: HTMLElement | null) => void }) {
  return (
    <div
      id={`tp-${p.id}`}
      data-point-id={p.id}
      ref={onMount}
      tabIndex={-1}
      className="py-6 px-3 -mx-3 rounded-lg scroll-mt-24 data-[tp-flash=true]:bg-editorial/[0.05] transition-colors outline-none"
    >
      <div className="flex items-baseline gap-3">
        <span className="text-micro font-mono text-editorial/70 shrink-0">4.{p.rank}</span>
        <h3 className="text-subhead font-medium text-ink-50 leading-snug">{p.headline}</h3>
      </div>
      <p className="mt-2.5 ml-9 text-body text-ink-300 leading-relaxed max-w-measure">{p.expanded}</p>
      <div className="mt-3 ml-9 flex items-center gap-3 flex-wrap">
        <Link href={p.href} className="inline-flex items-center gap-1 text-caption text-accent hover:text-accent-soft transition-colors">
          See the evidence
          <ArrowUpRight className="w-3 h-3" aria-hidden />
        </Link>
        {p.evidence && (
          <span className="text-micro text-ink-600">
            {p.evidence.observations.toLocaleString("en-US")} observations · {p.evidence.window}
          </span>
        )}
      </div>
    </div>
  );
}
