import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import { allMetricChanges, type MetricChange, type MetricId } from "@/lib/metricChange";
import { metricMeaning } from "@/lib/stateOfBitcoin";

// Section 5 — Evidence Sweep. The core HalvingLens readings, but ranked by
// weekly materiality instead of shown as six equal blocks: biggest meaningful
// mover first, then other changed readings, then the unchanged ones collapsed
// into a single stability line ("stability is itself information"). Reuses the
// shared metric-change service and the same materiality weighting as the story.

const METRIC_DEST: Record<MetricId, string> = {
  price: "/price",
  market_health: "/market-health",
  sentiment: "/sentiment",
  accumulation: "/accumulation",
  drawdown: "/historical-price-paths",
  etf_flow: "/etf",
};

const WEIGHT = { band: 5, historic: 4, material: 3, modest: 1, none: 0 } as const;
const TONE_TEXT = { good: "text-accent", bad: "text-signal-red", neutral: "text-ink-200" } as const;
const SPARK = { good: "#5eead4", bad: "#ff5d5d", neutral: "#5a6677" } as const;

type Tone = "good" | "bad" | "neutral";

function toneOf(m: MetricChange): Tone {
  const c7 = m.changes.find((c) => c.period === 7 && c.available);
  if (m.status === "improving") return "good";
  if (m.status === "weakening") return "bad";
  return (c7?.good as Tone) ?? "neutral";
}

function Spark({ values, tone }: { values: number[]; tone: Tone }) {
  if (!values || values.length < 2) return null;
  const w = 88, h = 26, pad = 3;
  const min = Math.min(...values), max = Math.max(...values), rng = max - min || 1;
  const pts = values
    .map((v, i) => `${(pad + (i / (values.length - 1)) * (w - 2 * pad)).toFixed(1)},${(pad + (1 - (v - min) / rng) * (h - 2 * pad)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 opacity-90" aria-hidden>
      <polyline points={pts} fill="none" stroke={SPARK[tone]} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function EvidenceCard({ m }: { m: MetricChange }) {
  const tone = toneOf(m);
  const c7 = m.changes.find((c) => c.period === 7 && c.available);
  const change = c7 ? c7.pctLabel ?? c7.absLabel : null;
  const Arrow = c7?.dir === "up" ? ArrowUpRight : c7?.dir === "down" ? ArrowDownRight : Minus;
  return (
    <TrackedLink href={METRIC_DEST[m.id]} event="evidence_card_click" props={{ metric: m.id }} className="card card-interactive p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500">{m.name}</span>
        {m.band && <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-ink-300">{m.band.label}</span>}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="font-display text-[26px] leading-none text-ink-50 tabular-nums">{m.currentLabel}</span>
        {change && (
          <span className={`inline-flex items-center gap-0.5 text-[12.5px] mb-0.5 tabular-nums ${TONE_TEXT[tone]}`}>
            <Arrow size={13} strokeWidth={2.2} /> {change}
          </span>
        )}
        <span className="text-[10.5px] text-ink-500 mb-1 ml-auto">7d</span>
      </div>
      <p className="mt-2.5 text-[12px] text-ink-300 leading-snug">{metricMeaning(m)}</p>
      {m.percentileLabel && <p className="mt-1 text-[11px] text-ink-500 leading-snug">{m.percentileLabel}.</p>}
      <div className="mt-auto pt-3 flex items-center justify-end">
        <Spark values={m.spark} tone={tone} />
      </div>
    </TrackedLink>
  );
}

export function EvidenceSweep() {
  const metrics = allMetricChanges().filter((m) => m.available);
  const changed = metrics
    .filter((m) => m.materiality !== "none" || m.bandChanged)
    .sort((a, b) => (WEIGHT[b.materiality] + (b.bandChanged ? 2 : 0)) - (WEIGHT[a.materiality] + (a.bandChanged ? 2 : 0)));
  const unchanged = metrics.filter((m) => m.materiality === "none" && !m.bandChanged);

  return (
    <div className="space-y-4">
      {changed.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {changed.map((m) => (
            <EvidenceCard key={m.id} m={m} />
          ))}
        </div>
      ) : (
        <p className="text-[13.5px] text-ink-300">No core reading moved materially this week.</p>
      )}

      {unchanged.length > 0 && (
        <div className="card p-4 sm:p-5">
          <p className="text-[13.5px] text-ink-200 leading-relaxed">
            <span className="text-ink-100 font-medium">{unchanged.length} reading{unchanged.length === 1 ? "" : "s"} held steady</span>{" "}
            <span className="text-ink-400">({unchanged.map((m) => m.name).join(", ")})</span> — within their previous bands.
            Stability is itself information: the broader cycle interpretation did not materially change on these.
          </p>
        </div>
      )}
    </div>
  );
}
