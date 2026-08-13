import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ACCUMULATION_BANDS } from "@/lib/accumulation";
import { fmtUsd } from "@/lib/format";
import type { DashboardStripState } from "@/lib/cycleDashboardIntel";
import { BandScale, type ScaleSegment } from "./BandScale";

// State of the Cycle (CD4) — three state modules inside ONE shared
// instrument surface, not three cards. Deliberately asymmetric visual
// encoding, driven by what each engine actually exports:
//   · accumulation — segmented scale from its own ACCUMULATION_BANDS;
//   · sentiment    — plain 0–100 fill (the sentiment engine exports no
//                    cuts table, and a renderer must never mint one);
//   · ETF demand   — signed flow + direction word, no artificial /100.
// Every state word and detail string is quoted from the payload, which
// quotes the owning engine. Scales are aria-hidden decorations beside
// text stating the same fact.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** ACCUMULATION_BANDS ranges are ascending [lo, hi) pairs over 0–100. */
const accumulationSegments: ScaleSegment[] = ACCUMULATION_BANDS.map((b) => ({
  width: b.range[1] - b.range[0],
  color: b.color,
}));

function SinceLine({ s }: { s: DashboardStripState }) {
  if (!s.sinceDate || s.sinceIsSeriesStart) return null;
  return <span className="block mt-1 text-caption text-ink-500">since {prettyDate(s.sinceDate)}</span>;
}

/** NOW + WHAT CHANGED (V2.1 Phase 3): the payload's deterministic movement
 *  line, quoted verbatim; absent when the metric cannot honestly support
 *  the comparison. */
function ChangeLine({ s }: { s: DashboardStripState }) {
  if (!s.changeLine) return null;
  return <span className="block mt-1 text-caption text-ink-400 font-mono tabular-nums">{s.changeLine}</span>;
}

function ViewLink({ s }: { s: DashboardStripState }) {
  return (
    <Link
      href={s.href}
      className="mt-2.5 inline-flex items-center gap-1 text-caption text-ink-400 hover:text-ink-100 transition-colors"
    >
      View
      <ArrowUpRight className="w-3 h-3" aria-hidden />
    </Link>
  );
}

function Unavailable({ s }: { s: DashboardStripState }) {
  return <p className="mt-2 text-caption text-ink-500">Not measurable — {s.unavailableReason}</p>;
}

function BandedCell({ s, segments }: { s: DashboardStripState; segments?: ScaleSegment[] }) {
  if (!s.available || s.value == null) return <Unavailable s={s} />;
  return (
    <>
      <div className="mt-2 font-mono text-stat leading-none tabular-nums text-ink-50">
        {Math.round(s.value)}
        <span className="ml-1 text-caption text-ink-500 font-sans">/100</span>
      </div>
      <div className="mt-2.5 max-w-[11rem]">
        {segments ? <BandScale value={s.value} segments={segments} /> : <BandScale value={s.value} mode="fill" />}
      </div>
      <span className="block mt-2.5 text-subhead font-medium text-ink-50">{s.stateLabel}</span>
      <ChangeLine s={s} />
      {s.detail && /weekly/.test(s.detail) && <span className="block mt-1 text-caption text-ink-500">weekly series</span>}
      <SinceLine s={s} />
      <ViewLink s={s} />
    </>
  );
}

function EtfCell({ s }: { s: DashboardStripState }) {
  if (!s.available || s.net == null) return <Unavailable s={s} />;
  const tone = s.net > 0 ? "text-signal-green" : s.net < 0 ? "text-signal-red" : "text-ink-300";
  return (
    <>
      <div className={`mt-2 font-mono text-stat leading-none tabular-nums ${tone}`}>
        {fmtUsd(s.net, { compact: true, sign: true })}
      </div>
      <span className="block mt-2.5 text-subhead font-medium text-ink-50">{s.stateLabel}</span>
      <span className="block mt-1 text-caption text-ink-500">net over 7 trading days</span>
      <ChangeLine s={s} />
      <ViewLink s={s} />
    </>
  );
}

export function StateStrip({ states }: { states: DashboardStripState[] }) {
  return (
    <section aria-label="State of the cycle">
      <h2 className="eyebrow text-accent mb-2.5">State of the cycle</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        {states.map((s, i) => (
          <div
            key={s.id}
            className={`p-4 sm:p-5 min-w-0 ${i > 0 ? "border-t sm:border-t-0 sm:border-l border-white/[0.05]" : ""}`}
          >
            <div className="eyebrow text-ink-500">{s.label}</div>
            {s.id === "accumulation" && <BandedCell s={s} segments={accumulationSegments} />}
            {s.id === "sentiment" && <BandedCell s={s} />}
            {s.id === "etf" && <EtfCell s={s} />}
          </div>
        ))}
      </div>
    </section>
  );
}
