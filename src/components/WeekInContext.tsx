import { ArrowUpRight, ArrowDownRight, Minus, Sparkles } from "lucide-react";
import { TrackedLink } from "./TrackedLink";
import { weekStory, type WeekSignal, type SignalTone, type StatusTone } from "@/lib/weekStory";

// The Week in Context — the flagship weekly section on The State of Bitcoin.
// A ranked set of signals, each answering Fact → What it means → Historical
// context, topped by a connective one-liner and closed by a Cycle Status
// verdict that says whether the week actually changed the thesis. Server
// component: every value is composed deterministically in weekStory() from the
// live reads — no client JS, no fabricated numbers, historical context only.

const GOLD = "#d9b96a";

// Tone → colour hierarchy. Constructive reads lean brand-teal, deterioration
// red, a band crossing amber (it's the one event that changes a classification),
// steady reads stay quiet ink so they don't shout.
const TONE_TEXT: Record<SignalTone, string> = {
  good: "text-accent",
  bad: "text-signal-red",
  flag: "text-signal-amber",
  neutral: "text-ink-200",
};
const TONE_BAR: Record<SignalTone, string> = {
  good: "bg-accent/70",
  bad: "bg-signal-red/70",
  flag: "bg-signal-amber/70",
  neutral: "bg-white/15",
};
const TONE_SPARK: Record<SignalTone, string> = {
  good: "#5eead4",
  bad: "#ff5d5d",
  flag: "#f2c14e",
  neutral: "#5a6677",
};
const STATUS_ACCENT: Record<StatusTone, string> = {
  cool: "#5eead4",
  neutral: "#8aa0b5",
  warm: "#f2c14e",
  caution: "#ff8f5d",
};

function DirArrow({ dir, tone, size = 18 }: { dir: WeekSignal["dir"]; tone: SignalTone; size?: number }) {
  const cls = `${TONE_TEXT[tone]} shrink-0`;
  if (dir === "up") return <ArrowUpRight size={size} className={cls} strokeWidth={2.2} aria-hidden />;
  if (dir === "down") return <ArrowDownRight size={size} className={cls} strokeWidth={2.2} aria-hidden />;
  return <Minus size={size} className={cls} strokeWidth={2.2} aria-hidden />;
}

function Spark({ values, tone, w = 96, h = 30 }: { values: number[]; tone: SignalTone; w?: number; h?: number }) {
  if (!values || values.length < 2) return null;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rng = max - min || 1;
  const pts = values
    .map((v, i) => `${(pad + (i / (values.length - 1)) * (w - 2 * pad)).toFixed(1)},${(pad + (1 - (v - min) / rng) * (h - 2 * pad)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 opacity-90" aria-hidden>
      <polyline points={pts} fill="none" stroke={TONE_SPARK[tone]} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Small labelled block used to physically separate Fact / meaning / history.
function Labelled({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[9.5px] uppercase tracking-[0.18em] text-ink-500 mb-1">{label}</div>
      <p className="text-[13px] text-ink-200 leading-relaxed">{children}</p>
    </div>
  );
}

function RankPill({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.16em]" style={{ color: GOLD, borderColor: "rgba(217,185,106,0.35)", background: "rgba(217,185,106,0.06)" }}>
        <Sparkles size={11} strokeWidth={2} /> Lead signal
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[10px] font-mono text-ink-400 w-5 h-5">
      {rank}
    </span>
  );
}

function BandChip({ signal }: { signal: WeekSignal }) {
  if (signal.bandChanged) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-signal-amber/30 bg-signal-amber/[0.06] px-2 py-0.5 text-[10px] text-signal-amber">
        {signal.bandChanged.from} → {signal.bandChanged.to}
      </span>
    );
  }
  if (signal.band) {
    return <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-ink-300">{signal.band}</span>;
  }
  return null;
}

// ── the lead (rank 1) — the biggest development, given the most room ─────────
function LeadSignal({ signal }: { signal: WeekSignal }) {
  return (
    <TrackedLink href={signal.href} event="week_signal_click" props={{ metric: signal.metricId, rank: signal.rank }} className="card card-interactive relative block overflow-hidden p-5 sm:p-7">
      <span className={`absolute left-0 top-0 h-full w-[3px] ${TONE_BAR[signal.tone]}`} aria-hidden />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <RankPill rank={1} />
          <span className="text-[11px] uppercase tracking-[0.16em] text-ink-400">{signal.name}</span>
        </div>
        <BandChip signal={signal} />
      </div>

      <div className="mt-4 flex items-end gap-3 flex-wrap">
        <DirArrow dir={signal.dir} tone={signal.tone} size={26} />
        <span className={`font-display text-[40px] sm:text-[52px] leading-none tabular-nums ${TONE_TEXT[signal.tone]}`}>{signal.factValue}</span>
        <span className="text-[12.5px] text-ink-500 mb-1.5">{signal.factLabel}</span>
        {signal.support && <span className="text-[12.5px] text-ink-400 mb-1.5 ml-auto">{signal.support}</span>}
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-6 gap-y-4 items-start">
        <div className="space-y-4">
          <Labelled label="What it means">{signal.interpretation}</Labelled>
          {signal.historical && (
            <Labelled label="Historical context">
              <span className="text-ink-300">{signal.historical}</span>
            </Labelled>
          )}
        </div>
        <div className="flex sm:flex-col items-end justify-between gap-2 sm:pl-6 sm:border-l border-white/[0.06]">
          <Spark values={signal.spark} tone={signal.tone} w={120} h={40} />
          <span className="text-[11px] text-accent whitespace-nowrap">View metric →</span>
        </div>
      </div>
    </TrackedLink>
  );
}

// ── secondary (rank 2–3) — medium card, same evidence chain ──────────────────
function SignalCard({ signal }: { signal: WeekSignal }) {
  return (
    <TrackedLink href={signal.href} event="week_signal_click" props={{ metric: signal.metricId, rank: signal.rank }} className="card card-interactive relative flex flex-col overflow-hidden p-5">
      <span className={`absolute left-0 top-0 h-full w-[2px] ${TONE_BAR[signal.tone]}`} aria-hidden />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <RankPill rank={signal.rank} />
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-400">{signal.name}</span>
        </div>
        <BandChip signal={signal} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <DirArrow dir={signal.dir} tone={signal.tone} size={20} />
        <span className={`font-display text-[30px] leading-none tabular-nums ${TONE_TEXT[signal.tone]}`}>{signal.factValue}</span>
        <span className="text-[11px] text-ink-500 mb-1">{signal.factLabel}</span>
      </div>
      {signal.support && <div className="mt-1.5 text-[11.5px] text-ink-400">{signal.support}</div>}

      <div className="mt-4 space-y-3">
        <Labelled label="What it means">{signal.interpretation}</Labelled>
        {signal.historical && (
          <Labelled label="Historical context">
            <span className="text-ink-300">{signal.historical}</span>
          </Labelled>
        )}
      </div>

      <div className="mt-auto pt-4 flex items-center justify-between gap-3 border-t border-white/[0.06]">
        <Spark values={signal.spark} tone={signal.tone} />
        <span className="text-[11px] text-accent whitespace-nowrap">View metric →</span>
      </div>
    </TrackedLink>
  );
}

// ── the rest (rank 4+) — compact row, fact + one-line meaning ────────────────
function CompactSignal({ signal }: { signal: WeekSignal }) {
  return (
    <TrackedLink href={signal.href} event="week_signal_click" props={{ metric: signal.metricId, rank: signal.rank }} className="card card-interactive flex items-center gap-4 p-4">
      <RankPill rank={signal.rank} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] uppercase tracking-[0.14em] text-ink-400">{signal.name}</span>
          <span className={`font-display text-[16px] tabular-nums ${TONE_TEXT[signal.tone]}`}>{signal.factValue}</span>
          <span className="text-[10.5px] text-ink-500">{signal.factLabel}</span>
        </div>
        <p className="mt-1 text-[12px] text-ink-400 leading-snug line-clamp-2">{signal.interpretation}</p>
      </div>
      <DirArrow dir={signal.dir} tone={signal.tone} size={16} />
    </TrackedLink>
  );
}

// ── Cycle Status — the most valuable line: did the thesis change? ────────────
export function CycleStatusCard({ status }: { status: ReturnType<typeof weekStory>["cycleStatus"] }) {
  const accent = STATUS_ACCENT[status.tone];
  return (
    <div className="card-glow relative overflow-hidden p-5 sm:p-6">
      <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: accent }} aria-hidden />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[10.5px] uppercase tracking-[0.2em]" style={{ color: accent }}>Cycle status</div>
        <span className="inline-flex items-center rounded-full border px-3 py-1 text-[11.5px] text-ink-200" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}>
          {status.badge}
        </span>
      </div>
      <h3 className="mt-3 font-display text-[22px] sm:text-[27px] font-medium tracking-tight-2 text-ink-50 leading-snug">
        {status.headline}
        <span className="text-ink-500">.</span>
      </h3>
      <p className="mt-2.5 text-[14px] text-ink-300 leading-relaxed max-w-2xl">{status.detail}</p>
    </div>
  );
}

export function WeekInContext({ showCycleStatus = true }: { showCycleStatus?: boolean } = {}) {
  const story = weekStory();
  const lead = story.signals[0];
  const secondary = story.signals.slice(1, 3);
  const rest = story.signals.slice(3);

  return (
    <div className="space-y-4">
      {/* connective, causal one-liner — the "story of the week" */}
      {story.narrative && (
        <div className="flex items-start gap-2.5 text-[13.5px] text-ink-200 leading-relaxed">
          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-hidden />
          <span>{story.narrative}</span>
        </div>
      )}

      {story.quietWeek ? (
        <div className="card p-6 sm:p-7">
          <p className="text-[14.5px] text-ink-200 leading-relaxed max-w-2xl">
            A quiet week — no core reading moved materially. In a market built on noise, an uneventful week is itself
            worth knowing: the historical picture is unchanged.
          </p>
        </div>
      ) : (
        <>
          {lead && <LeadSignal signal={lead} />}
          {secondary.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {secondary.map((s) => (
                <SignalCard key={s.metricId} signal={s} />
              ))}
            </div>
          )}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rest.map((s) => (
                <CompactSignal key={s.metricId} signal={s} />
              ))}
            </div>
          )}
        </>
      )}

      {/* the verdict — did the week change the thesis? (own section on the
          State of Bitcoin page; inline elsewhere) */}
      {showCycleStatus && <CycleStatusCard status={story.cycleStatus} />}
    </div>
  );
}
