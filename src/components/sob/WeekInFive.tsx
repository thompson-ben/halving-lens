"use client";

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

const GOLD = "#d9b96a";

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

export function WeekInFiveRail({ data }: { data: WeekInFiveData }) {
  if (data.points.length === 0) return null;
  return (
    <section aria-label="This week in five" className="mt-8">
      <div className="flex items-baseline gap-3 mb-3">
        <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
          This week in {data.points.length === 5 ? "five" : String(data.points.length)}
        </div>
        {data.quietWeek && <div className="text-[11px] text-ink-500">A quiet week — the agenda below says so plainly.</div>}
      </div>
      <ol className="space-y-px rounded-xl overflow-hidden border border-white/[0.06]">
        {data.points.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => scrollToPoint(p.anchor, p.id)}
              className="w-full text-left flex items-start gap-3 px-4 py-3 bg-[#0b0f15] hover:bg-white/[0.03] transition-colors group"
            >
              <span className="text-[10px] font-mono text-ink-600 mt-0.5 shrink-0">{p.rank}</span>
              <span className="text-[13px] text-ink-200 leading-relaxed group-hover:text-ink-50 transition-colors">{p.headline}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function WeekInFiveExpanded({ data }: { data: WeekInFiveData }) {
  return (
    <div className="space-y-3">
      {data.points.map((p) => (
        <PointCard key={p.id} p={p} />
      ))}
    </div>
  );
}

function PointCard({ p }: { p: TalkingPoint }) {
  return (
    <div
      id={`tp-${p.id}`}
      tabIndex={-1}
      className="card p-5 scroll-mt-24 data-[tp-flash=true]:ring-1 data-[tp-flash=true]:ring-[#d9b96a]/50 transition-shadow outline-none"
    >
      <div className="flex items-baseline gap-3">
        <span className="text-[10px] font-mono text-ink-600 shrink-0">{p.rank}</span>
        <h3 className="text-[14.5px] font-medium text-ink-50 leading-snug">{p.headline}</h3>
      </div>
      <p className="mt-2.5 ml-6 text-[13px] text-ink-300 leading-relaxed max-w-3xl">{p.expanded}</p>
      <div className="mt-3 ml-6 flex items-center gap-3 flex-wrap">
        <Link href={p.href} className="inline-flex items-center gap-1 text-[12px] text-accent hover:text-accent-soft transition-colors">
          See the evidence
          <ArrowUpRight className="w-3 h-3" aria-hidden />
        </Link>
        {p.evidence && (
          <span className="text-[10.5px] text-ink-600">
            {p.evidence.observations.toLocaleString("en-US")} observations · {p.evidence.window}
          </span>
        )}
      </div>
    </div>
  );
}
