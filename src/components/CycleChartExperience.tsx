"use client";

import { useState } from "react";
import { CycleContextChart } from "./CycleContextChart";
import { CycleDrawdownChart } from "./CycleDrawdownChart";
import { SimilarMomentsExplorer } from "./SimilarMomentsExplorer";
import { cycleContextInsight, cycleContextStats } from "@/lib/cycleZones";
import { drawdownAnalysis } from "@/lib/drawdowns";
import { whatHappenedNext } from "@/lib/cycleIntel";
import { similarMoments } from "@/lib/similarity";

type TabId = "context" | "corrections" | "similar" | "next";

const TABS: { id: TabId; label: string; question: string }[] = [
  { id: "context", label: "Cycle context", question: "Where are we in the cycle?" },
  { id: "corrections", label: "Corrections", question: "Is this drop normal?" },
  { id: "similar", label: "Similar moments", question: "Have we seen this before?" },
  { id: "next", label: "What happened next?", question: "What followed, historically?" },
];

const pct = (n: number) => `${n >= 0 ? "+" : ""}${Math.round(n)}%`;

export function CycleChartExperience() {
  const [tab, setTab] = useState<TabId>("context");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="space-y-5">
      {/* Tab bar — scrollable on mobile */}
      <div className="-mx-1 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 px-1 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`flex flex-col items-start text-left px-3.5 py-2.5 rounded-lg border transition-colors ${
                tab === t.id
                  ? "border-accent/30 bg-accent/10"
                  : "border-white/[0.05] bg-white/[0.015] hover:border-white/15"
              }`}
            >
              <span className={`text-[12.5px] font-medium ${tab === t.id ? "text-accent" : "text-ink-200"}`}>
                {t.label}
              </span>
              <span className="text-[10.5px] text-ink-500 mt-0.5 whitespace-nowrap">{t.question}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "context" && <ContextPanel />}
      {tab === "corrections" && <CorrectionsPanel />}
      {tab === "similar" && <SimilarPanel />}
      {tab === "next" && <NextPanel />}

      <p className="text-[11px] text-ink-500 leading-relaxed">
        {active.question} — answered from real price history across the 2012, 2016, 2020 and current
        cycles. Historical context only; not financial advice, and not a forecast.
      </p>
    </div>
  );
}

// ── Answer-first header ───────────────────────────────────────────────────────
function AnswerCard({ metric, value, children }: { metric: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="card-glow p-5 sm:p-7 relative overflow-hidden">
      <div className="relative z-10">
        <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-2.5">{metric}</div>
        <div className="flex items-baseline gap-3 flex-wrap">
          {value && (
            <span className="font-display text-[40px] sm:text-[52px] font-medium tracking-tightest text-ink-50 tabular-nums leading-none">
              {value}
            </span>
          )}
          <p className="font-display text-[18px] sm:text-[21px] font-medium tracking-tight-2 text-ink-100 leading-snug max-w-2xl">
            {children}
          </p>
        </div>
      </div>
      <div className="watermark">halvinglens.com · cycle context</div>
    </div>
  );
}

function StatGrid({ items }: { items: { label: string; value: string; tone?: string }[] }) {
  const toneClass = (t?: string) =>
    t === "down" ? "text-signal-red" : t === "up" ? "text-signal-green" : t === "accent" ? "text-accent" : "text-ink-100";
  // Columns track the item count so there are no empty cells across tabs.
  const cols =
    items.length >= 5
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      : items.length === 4
        ? "grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-3";
  return (
    <div className={`grid ${cols} gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden`}>
      {items.map((s) => (
        <div key={s.label} className="bg-[#0b0f15] px-4 py-3.5">
          <div className="text-[9.5px] uppercase tracking-[0.15em] text-ink-400">{s.label}</div>
          <div className={`mt-1.5 font-mono text-[15px] tabular-nums ${toneClass(s.tone)}`}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Tab 1 · Cycle context ─────────────────────────────────────────────────────
function ContextPanel() {
  const insight = cycleContextInsight();
  const stats = cycleContextStats();
  return (
    <div className="space-y-5">
      <AnswerCard metric={insight.metric} value={insight.value}>
        {insight.headline}
      </AnswerCard>
      <StatGrid items={stats} />
      <div className="card p-4 sm:p-7 relative">
        <CycleContextChart />
      </div>
    </div>
  );
}

// ── Tab 2 · Corrections ───────────────────────────────────────────────────────
function CorrectionsPanel() {
  const dd = drawdownAnalysis();
  const ddPct = (v: number) => `${Math.round(v)}%`;
  return (
    <div className="space-y-5">
      <AnswerCard metric="Current drawdown" value={ddPct(dd.current)}>
        {dd.takeaway}
      </AnswerCard>
      <StatGrid
        items={[
          { label: "Current drawdown", value: ddPct(dd.current), tone: "down" },
          { label: "Largest this cycle", value: ddPct(dd.largestThisCycle), tone: "down" },
          { label: `Avg at day ${dd.cycleDay}`, value: ddPct(dd.avgAtStage) },
        ]}
      />
      <div className="card p-4 sm:p-7 relative">
        <div className="mb-4">
          <h3 className="font-display text-[17px] sm:text-[19px] font-medium tracking-tight-2 text-ink-100">
            Drawdown from each cycle&apos;s peak
          </h3>
          <p className="text-[11.5px] text-ink-400 mt-1">
            How far below its own high each cycle traded, by day after the halving. 0% = at the high.
          </p>
        </div>
        <CycleDrawdownChart />
      </div>
    </div>
  );
}

// ── Tab 3 · Similar moments ───────────────────────────────────────────────────
function SimilarPanel() {
  const top = similarMoments(1)[0];
  return (
    <div className="space-y-5">
      {top ? (
        <AnswerCard metric="Most similar moment" value={`${top.similarity}%`}>
          Today most closely resembles <span className="text-ink-50">{top.dateLabel}</span> ({top.year}{" "}
          cycle) — measured on cycle position, drawdown and price heat, not sentiment.
        </AnswerCard>
      ) : (
        <AnswerCard metric="Similar moments">Not enough historical data to compare right now.</AnswerCard>
      )}
      <SimilarMomentsExplorer limit={4} />
    </div>
  );
}

// ── Tab 4 · What happened next ────────────────────────────────────────────────
function NextPanel() {
  const w = whatHappenedNext();
  const d90 = w.rows.map((r) => ({ year: r.year, v: r.d90 })).filter((x): x is { year: string; v: number } => x.v != null);
  const vals = d90.map((x) => x.v);
  const summary = vals.length
    ? (() => {
        const sorted = [...vals].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        const best = d90.reduce((a, b) => (b.v > a.v ? b : a));
        const worst = d90.reduce((a, b) => (b.v < a.v ? b : a));
        return {
          avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
          median: Math.round(median),
          best,
          worst,
        };
      })()
    : null;

  return (
    <div className="space-y-5">
      <AnswerCard metric={`From cycle day ${w.cycleDay}`} value={summary ? pct(summary.avg) : "—"}>
        {summary
          ? `Over the next 90 days, the prior three cycles averaged ${pct(summary.avg)} from this point, ranging from ${pct(summary.worst.v)} (${summary.worst.year}) to ${pct(summary.best.v)} (${summary.best.year}). Historical context only.`
          : "There isn't enough comparable forward history at this cycle day to summarise."}
      </AnswerCard>

      {summary && (
        <StatGrid
          items={[
            { label: "Average (90d)", value: pct(summary.avg), tone: summary.avg >= 0 ? "up" : "down" },
            { label: "Median (90d)", value: pct(summary.median), tone: summary.median >= 0 ? "up" : "down" },
            { label: "Best (90d)", value: `${pct(summary.best.v)} · ${summary.best.year}`, tone: "up" },
            { label: "Worst (90d)", value: `${pct(summary.worst.v)} · ${summary.worst.year}`, tone: "down" },
          ]}
        />
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-ink-400 border-b border-white/[0.05]">
              <th className="px-4 sm:px-5 py-3.5 font-medium">Cycle</th>
              <th className="px-2 py-3.5 font-medium text-right">Next 30d</th>
              <th className="px-2 py-3.5 font-medium text-right">Next 60d</th>
              <th className="px-3 sm:px-5 py-3.5 font-medium text-right">Next 90d</th>
            </tr>
          </thead>
          <tbody>
            {w.rows.map((r) => (
              <tr key={r.year} className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 sm:px-5 py-4">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: r.color }} />
                    <span className="text-ink-100 text-[13.5px]">{r.year} cycle</span>
                  </span>
                </td>
                <PctCell v={r.d30} />
                <PctCell v={r.d60} />
                <PctCell v={r.d90} pad />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card-glow p-5 relative">
        <div className="text-[10px] uppercase tracking-[0.18em] text-accent mb-2">Required context</div>
        <p className="text-[13px] text-ink-200 leading-relaxed">
          Historical outcomes are not predictive. This information is provided for historical context
          only — the 2024 cycle has a structural difference (US spot ETF demand) that did not exist in
          prior cycles.
        </p>
      </div>
    </div>
  );
}

function PctCell({ v, pad }: { v: number | null; pad?: boolean }) {
  const color = v == null ? "text-ink-500" : v > 0 ? "text-signal-green" : v < 0 ? "text-signal-red" : "text-ink-300";
  return (
    <td className={`py-4 text-right font-mono text-[15px] tabular-nums ${color} ${pad ? "px-3 sm:px-5" : "px-2"}`}>
      {v == null ? "—" : pct(v)}
    </td>
  );
}
