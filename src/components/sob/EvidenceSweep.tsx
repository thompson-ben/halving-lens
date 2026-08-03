import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import { allMetricChanges, type MetricChange, type MetricId } from "@/lib/metricChange";
import { metricMeaning } from "@/lib/stateOfBitcoin";
import { changeOver } from "@/lib/dayContext";
import { EtfDemandCard } from "@/components/sob/EtfDemandCard";

// Section 5 — Evidence Sweep. The core HalvingLens readings, ranked by weekly
// materiality. ETF demand gets its own clear card (see EtfDemandCard). The
// fast-moving readings (price, Market Health, sentiment) also carry a SECONDARY
// 24-hour line so a weekly move can be told apart from a calm week that moved
// yesterday — the 7-day read always stays primary. Unchanged readings collapse
// into a single stability card that spans whatever remains of the grid's last
// row, so the section always forms a complete rectangle however many readings
// moved that week.

const METRIC_DEST: Record<MetricId, string> = {
  price: "/price",
  market_health: "/market-health",
  sentiment: "/sentiment",
  accumulation: "/accumulation",
  drawdown: "/historical-price-paths",
  etf_flow: "/etf",
  production_premium: "/metrics/estimated-mining-cost",
};

// Only these move fast enough for a 24-hour read to add anything. Cycle phase /
// day / accumulation / drawdown are intentionally weekly — no daily line.
const DAY_METRICS = new Set<MetricId>(["price", "market_health", "sentiment"]);

const WEIGHT = { band: 5, historic: 4, material: 3, modest: 1, none: 0 } as const;
const TONE_TEXT = { good: "text-accent", bad: "text-signal-red", neutral: "text-ink-200" } as const;
const SPARK = { good: "#5eead4", bad: "#ff5d5d", neutral: "#5a6677" } as const;

type Tone = "good" | "bad" | "neutral";

function toneOf(m: MetricChange): Tone {
  const c7 = changeOver(m, 7);
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
  const c7 = changeOver(m, 7);
  const c1 = DAY_METRICS.has(m.id) ? changeOver(m, 1) : undefined;
  const week = c7 ? c7.pctLabel ?? c7.absLabel : null;
  const day = c1 && c1.dir !== "flat" ? c1.pctLabel ?? c1.absLabel : c1 ? "No change" : null;
  const Arrow = c7?.dir === "up" ? ArrowUpRight : c7?.dir === "down" ? ArrowDownRight : Minus;
  return (
    <TrackedLink href={METRIC_DEST[m.id]} event="evidence_card_click" props={{ metric: m.id }} className="card card-interactive p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow text-ink-500">{m.name}</span>
        {m.band && <span className="text-micro px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-ink-300">{m.band.label}</span>}
      </div>

      <div className="mt-2 font-display text-stat leading-none text-ink-50 tabular-nums">{m.currentLabel}</div>

      {/* 7-day change (primary) + optional 24-hour change (secondary) */}
      <div className="mt-2 space-y-0.5">
        {week && (
          <div className="flex items-center gap-1.5 text-caption">
            <span className={`inline-flex items-center gap-0.5 tabular-nums ${TONE_TEXT[tone]}`}>
              <Arrow size={13} strokeWidth={2.2} /> {week}
            </span>
            <span className="text-micro text-ink-500">Last 7 days</span>
          </div>
        )}
        {day && (
          <div className="flex items-center gap-1.5 text-caption text-ink-400">
            <span className="tabular-nums">{day}</span>
            <span className="text-micro text-ink-600">Last 24h</span>
          </div>
        )}
      </div>

      <p className="mt-2.5 text-caption text-ink-300 leading-snug">{metricMeaning(m)}</p>
      {m.percentileLabel && <p className="mt-1 text-caption text-ink-500 leading-snug">{m.percentileLabel}.</p>}
      <div className="mt-auto pt-3 flex items-center justify-end">
        <Spark values={m.spark} tone={tone} />
      </div>
    </TrackedLink>
  );
}

export function EvidenceSweep() {
  const metrics = allMetricChanges().filter((m) => m.available);
  const etf = metrics.find((m) => m.id === "etf_flow");
  // ETF is shown as its own clear card, so exclude it from the ranked grid.
  const rest = metrics.filter((m) => m.id !== "etf_flow");
  const changed = rest
    .filter((m) => m.materiality !== "none" || m.bandChanged)
    .sort((a, b) => (WEIGHT[b.materiality] + (b.bandChanged ? 2 : 0)) - (WEIGHT[a.materiality] + (a.bandChanged ? 2 : 0)));
  const unchanged = rest.filter((m) => m.materiality === "none" && !m.bandChanged);

  // Span for the stability card so the grid's last row is always complete:
  // it fills the leftover cells of the movers' row, or a full row of its own
  // when the movers already fill theirs. Computed per breakpoint.
  const rem2 = changed.length % 2;
  const rem3 = changed.length % 3;
  const steadySpan = [
    rem2 === 1 ? "" : "sm:col-span-2",
    rem3 === 1 ? "lg:col-span-2" : rem3 === 2 ? "lg:col-span-1" : "lg:col-span-3",
  ]
    .join(" ")
    .trim();

  const steadyCard = unchanged.length > 0 && (
    <div className={`card p-4 sm:p-5 flex items-center ${changed.length > 0 ? steadySpan : ""}`}>
      <p className="text-body text-ink-200 leading-relaxed">
        <span className="text-ink-100 font-medium">{unchanged.length} reading{unchanged.length === 1 ? "" : "s"} held steady</span>{" "}
        <span className="text-ink-400">({unchanged.map((m) => m.name).join(", ")})</span> — within their previous bands.
        Stability is itself information: the broader cycle interpretation did not materially change on these.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {etf?.available && <EtfDemandCard />}

      {changed.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {changed.map((m) => (
            <EvidenceCard key={m.id} m={m} />
          ))}
          {steadyCard}
        </div>
      ) : (
        <>
          <p className="text-body text-ink-300">No core reading beyond ETF demand moved materially this week.</p>
          {steadyCard}
        </>
      )}
    </div>
  );
}
