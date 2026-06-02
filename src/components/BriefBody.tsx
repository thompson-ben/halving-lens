import Link from "next/link";
import { ArrowUpRight, ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown } from "lucide-react";
import {
  buildBrief,
  contentPack,
  etfInsight,
  sentimentInsight,
  cycleInsight,
} from "@/lib/brief";

type Insight = { title: string; body: string; available: boolean; href: string };
import { cycleSummary, HEAT_LABEL } from "@/lib/cycleSummary";
import { dailyChange, type MetricDelta, type DailyChange } from "@/lib/dailyChange";
import { ContentPack } from "@/components/ContentPack";
import { BriefSignup } from "@/components/BriefSignup";
import { DataBadge } from "@/components/DataBadge";
import { TodayVsPriorCycles } from "@/components/TodayVsPriorCycles";
import { WhatHappenedNext } from "@/components/WhatHappenedNext";
import { CycleOverlayChart } from "@/components/CycleOverlayChart";
import { LastUpdated } from "@/components/LastUpdated";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { DAYS_TO_NEXT_HALVING } from "@/lib/btcData";
import { downsideScenarios } from "@/lib/downside";
import { fmtPct, fmtUsd } from "@/lib/format";

const CONF: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };
const WATCH_TONE: Record<string, string> = {
  elevated: "text-signal-amber border-signal-amber/25",
  watch: "text-accent border-accent/20",
  calm: "text-ink-400 border-white/[0.06]",
};

// The Daily Change Report — leads with what changed in the last 24h, then the
// biggest story, with the cycle read as concise supporting context. Shared by
// /brief (today). Historical permalinks render the stored record instead.
export function BriefBody({ dateLabel }: { dateLabel?: string }) {
  const b = buildBrief();
  const s = cycleSummary();
  const change = dailyChange();
  const packChanges = change.changed.map((d) => ({ area: d.label, summary: `${d.label}: ${d.changeLabel ?? ""}`.trim() }));
  const pack = contentPack(packChanges.length ? packChanges : undefined);

  return (
    <div className="space-y-12">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">
            Daily Change Report
          </span>
          <span className="text-[11px] text-ink-400 font-mono">{dateLabel ?? b.date}</span>
          <DataBadge status="live-derived" />
        </div>
        <h1 className="font-display text-[30px] sm:text-[38px] lg:text-[46px] font-medium tracking-tightest text-ink-50 leading-[1.1] max-w-3xl">
          {b.headline}
        </h1>
        <div className="mt-4">
          <LastUpdated prefix="Generated" />
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Stat label="BTC price" value={fmtUsd(s.price)} />
        {s.change24h != null ? (
          <Stat label={`${s.changeLabel} change`} value={fmtPct(s.change24h, 1)} tone={s.change24h} />
        ) : (
          <Stat label="Days to halving" value={`${DAYS_TO_NEXT_HALVING}`} />
        )}
        <Stat label="Cycle day" value={`${s.cycleDay}`} />
        <Stat label="Through cycle" value={`${s.progressPct}%`} />
      </section>

      {/* 1. What changed today — the lead */}
      <ChangeReport change={change} />

      {/* 2. Biggest story of the day — the main narrative */}
      <BiggestStory change={change} />

      {/* 3. Cycle read — concise supporting context, repetition-controlled */}
      <CycleRead change={change} s={s} />

      {/* 4. What to watch next — only what matters now */}
      <WatchNext s={s} />

      <DownsideBriefLine />

      {/* Supporting material */}
      <section>
        <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100 mb-1.5">
          Chart of the day
        </h2>
        <p className="text-[12.5px] text-ink-400 mb-4 max-w-xl">
          All four cycles, aligned to halving day — price as a multiple of the halving price.
        </p>
        <div className="card p-4 sm:p-7 relative">
          <CycleOverlayChart mode="normalized" height={320} />
          <div className="watermark">halvinglens.com · cycle overlay</div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100 mb-4">
          Today&apos;s insights
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <InsightCard insight={cycleInsight()} />
          <InsightCard insight={etfInsight()} />
          <InsightCard insight={sentimentInsight()} />
        </div>
      </section>

      <ContentPack pack={pack} />

      <TodayVsPriorCycles />
      <WhatHappenedNext />

      <BriefSignup />

      <section className="flex items-center gap-5 flex-wrap">
        <Link href="/brief/archive" className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-soft">
          Brief archive <ArrowUpRight size={14} />
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-soft">
          Full cycle dashboard <ArrowUpRight size={14} />
        </Link>
      </section>

      <FeedbackWidget section="daily_brief" contentType="brief" label="Was this brief useful?" />

      <p className="text-[11.5px] text-ink-500 leading-relaxed max-w-2xl">{b.disclaimer}</p>
    </div>
  );
}

// ── What changed today ───────────────────────────────────────────────────────
function impactColor(d: MetricDelta): string {
  if (d.dir === "flat" || Math.abs(d.impact) < 0.05) return "text-ink-300";
  return d.impact > 0 ? "text-signal-green" : "text-signal-red";
}
function DeltaArrow({ d }: { d: MetricDelta }) {
  if (d.dir === "up") return <ArrowUp size={14} className={d.impact >= 0 ? "text-signal-green" : "text-signal-red"} />;
  if (d.dir === "down") return <ArrowDown size={14} className={d.impact >= 0 ? "text-signal-green" : "text-signal-red"} />;
  return <Minus size={14} className="text-ink-400" />;
}

function ChangeReport({ change }: { change: DailyChange }) {
  return (
    <section>
      <SectionHead
        eyebrow="What changed today"
        title="What changed in the last 24 hours?"
        subtitle={
          change.available
            ? `Every tracked signal, measured against ${change.sinceLabel}.`
            : "Day-over-day comparison begins once a second day of data is stored."
        }
      />

      {change.available && change.deltas.length > 0 ? (
        <>
          {(change.largestPositive || change.largestNegative) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {change.largestPositive && (
                <Highlight tone="pos" label="Largest positive move" d={change.largestPositive} />
              )}
              {change.largestNegative && (
                <Highlight tone="neg" label="Largest negative move" d={change.largestNegative} />
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {change.deltas.map((d) => (
              <div key={d.key} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-ink-100">{d.label}</div>
                  <div className="text-[11.5px] text-ink-400 truncate">{d.display}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`inline-flex items-center gap-1.5 text-[13px] font-mono tabular-nums ${impactColor(d)}`}>
                    <DeltaArrow d={d} /> {d.changeLabel}
                  </div>
                  {d.momentum && d.momentum !== "steady" && (
                    <div className="text-[10px] text-ink-500 mt-0.5">{d.momentum} · 7d</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="card p-6">
          <p className="text-[14px] text-ink-300 leading-relaxed max-w-2xl">
            The change report compares each day against the one before. It begins the morning after a
            second daily sync — we never fabricate a previous day&apos;s values.
          </p>
        </div>
      )}
    </section>
  );
}

function Highlight({ tone, label, d }: { tone: "pos" | "neg"; label: string; d: MetricDelta }) {
  const ring = tone === "pos" ? "border-signal-green/25 bg-signal-green/[0.05]" : "border-signal-amber/25 bg-signal-amber/[0.05]";
  const Icon = tone === "pos" ? TrendingUp : TrendingDown;
  const color = tone === "pos" ? "text-signal-green" : "text-signal-amber";
  return (
    <div className={`rounded-xl border ${ring} p-4`}>
      <div className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] ${color} mb-1.5`}>
        <Icon size={13} /> {label}
      </div>
      <div className="text-[15px] font-medium text-ink-50">
        {d.label} <span className="font-mono">{d.changeLabel}</span>
      </div>
      <div className="text-[12px] text-ink-400 mt-0.5">{d.display}</div>
    </div>
  );
}

// ── Biggest story of the day ─────────────────────────────────────────────────
function BiggestStory({ change }: { change: DailyChange }) {
  const story = change.biggestStory;
  const meaningful = story && story.significance >= 0.12;

  return (
    <section className="card-glow p-6 lg:p-8 relative overflow-hidden">
      <div className="relative z-10 max-w-3xl">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-3">
          Biggest story of the day
        </div>
        {meaningful && story ? (
          <>
            <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-50 leading-tight">
              {story.label}{" "}
              <span className={`font-mono ${impactColor(story)}`}>{story.changeLabel}</span>
            </h2>
            <p className="mt-4 text-[14.5px] text-ink-200 leading-relaxed">
              <span className="text-ink-400">What changed: </span>
              {story.label} now reads {story.display.toLowerCase()}
              {story.sevenDayLabel ? ` (${story.sevenDayLabel})` : ""}.
            </p>
            <p className="mt-2.5 text-[14px] text-ink-300 leading-relaxed">
              <span className="text-ink-400">Why it matters: </span>
              {story.why}
            </p>
            {story.context && (
              <p className="mt-2.5 text-[13.5px] text-ink-400 leading-relaxed">{story.context}</p>
            )}
          </>
        ) : (
          <>
            <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-50 leading-tight">
              A quiet day — no single development stands out
            </h2>
            <p className="mt-4 text-[14.5px] text-ink-300 leading-relaxed">
              Nothing moved enough today to dominate the read. On days like this, the cycle is simply
              consolidating — the read below is unchanged from the last brief, and the signals to watch
              are the ones most likely to break the calm.
            </p>
          </>
        )}
      </div>
      <div className="watermark">halvinglens.com · daily brief</div>
    </section>
  );
}

// ── Cycle read (concise, repetition-controlled) ──────────────────────────────
function CycleRead({ change, s }: { change: DailyChange; s: ReturnType<typeof cycleSummary> }) {
  const unchanged = change.available && !change.cycleReadChanged;
  return (
    <section>
      <SectionHead
        eyebrow="Cycle read"
        title="Where the cycle stands"
        subtitle={
          unchanged
            ? "No change to the underlying cycle read since yesterday — the detail below is steady."
            : "The cycle environment at a glance."
        }
      />
      <div className="card p-5 sm:p-6">
        <div className="grid grid-cols-3 gap-px rounded-lg border border-white/[0.06] bg-white/[0.06] overflow-hidden">
          <ReadStat label="Phase" value={s.phaseLabel} />
          <ReadStat label="Risk" value={HEAT_LABEL[s.heat]} />
          <ReadStat label="Confidence" value={CONF[s.confidence] ?? s.confidence} />
        </div>
        {!unchanged && (
          <p className="mt-4 text-[13.5px] text-ink-300 leading-relaxed max-w-2xl">{s.summary}</p>
        )}
      </div>
    </section>
  );
}

function ReadStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-3.5">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className="mt-1 text-[14px] text-ink-50 font-medium leading-snug">{value}</div>
    </div>
  );
}

// ── What to watch next (filtered to what matters now) ────────────────────────
function WatchNext({ s }: { s: ReturnType<typeof cycleSummary> }) {
  const elevated = s.watchSignals.filter((w) => w.level !== "calm");
  const items = elevated.length ? elevated : s.watchSignals.slice(0, 2);
  const quiet = elevated.length === 0;
  return (
    <section>
      <SectionHead
        eyebrow="What to watch next"
        title="What should you watch from here?"
        subtitle={
          quiet
            ? "Nothing is elevated right now — these are the signals most likely to move first."
            : "The signals that are elevated or shifting — prioritised over the steady ones."
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((w, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[13.5px] font-medium text-ink-100">{w.signal}</h3>
              <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[9.5px] font-medium uppercase tracking-wide ${WATCH_TONE[w.level]}`}>
                {w.level}
              </span>
            </div>
            <p className="mt-2 text-[12.5px] text-ink-200 leading-relaxed">{w.status}</p>
            <p className="mt-1.5 text-[11.5px] text-ink-400 leading-relaxed">{w.why}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">{eyebrow}</div>
      <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-tight">
        {title}
      </h2>
      <p className="mt-2.5 text-[14px] text-ink-300 max-w-2xl leading-relaxed">{subtitle}</p>
    </div>
  );
}

// Calm, factual downside-context line for the brief. Historical context, never
// alarmist — no prediction, no target.
function DownsideBriefLine() {
  const d = downsideScenarios();
  const support = d.levels.find((l) => l.category === "support");
  const avg = d.levels.find((l) => l.key === "average");
  if (!support && !avg) return null;
  return (
    <Link
      href="/downside-scenarios"
      className="card card-interactive p-5 flex items-start justify-between gap-4 group hover:border-accent/25"
    >
      <div className="max-w-2xl">
        <h3 className="text-[11px] font-medium text-accent uppercase tracking-[0.16em] mb-1.5">
          Downside context
        </h3>
        <p className="text-[13px] text-ink-200 leading-relaxed">
          {support && (
            <>
              Nearest historical support sits around {fmtUsd(support.price, { compact: true })} (
              {support.label.toLowerCase()}).{" "}
            </>
          )}
          {avg && (
            <>
              A drawdown matching the average prior cyclical bear market would imply roughly{" "}
              {fmtUsd(avg.price, { compact: true })} ({fmtPct(avg.dropPctFromCurrent, 0)} from here).{" "}
            </>
          )}
          <span className="text-ink-400">Historical context, not a forecast.</span>
        </p>
      </div>
      <ArrowUpRight size={15} className="text-accent shrink-0 mt-0.5" />
    </Link>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Link href={insight.href} className="card card-interactive p-6 block group hover:border-accent/25">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-medium text-accent uppercase tracking-[0.16em]">
          {insight.title}
        </h3>
        {!insight.available && (
          <span className="text-[9px] uppercase tracking-wide text-ink-500">soon</span>
        )}
      </div>
      <p className="mt-3 text-[13px] text-ink-200 leading-relaxed">{insight.body}</p>
      <div className="mt-4 inline-flex items-center gap-0.5 text-accent text-[11px] group-hover:gap-1.5 transition-all">
        Go deeper <ArrowUpRight size={11} />
      </div>
    </Link>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: number }) {
  const color = tone == null ? "text-ink-50" : tone >= 0 ? "text-signal-green" : "text-signal-red";
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className={`mt-1.5 font-mono text-[16px] tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
