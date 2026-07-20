"use client";

// The Intelligence Queue — the founder's publishing dashboard. Renders the
// Intelligence Events Engine's publishable events (ranked) with full score
// transparency and trigger reasoning, and the founder actions: Generate Creative
// (→ the pack studio, pre-selected), Preview, Mark Posted, Snooze, Dismiss.
//
// It's a thin consumer: it renders events and posts status changes back. It does
// not decide significance — that's the engine's job.

import { useMemo, useState } from "react";
import { Sparkles, Eye, Check, Clock, X, ExternalLink } from "lucide-react";
import type { IntelligenceEvent, EventPriority } from "@/lib/intelligenceEvents";

const PRIORITY: Record<EventPriority, { label: string; color: string; bg: string }> = {
  high: { label: "High", color: "#ff5d5d", bg: "rgba(255,93,93,0.12)" },
  medium: { label: "Medium", color: "#f5b942", bg: "rgba(245,185,66,0.12)" },
  low: { label: "Low", color: "#9aa6b4", bg: "rgba(154,166,180,0.12)" },
};
const FACTOR_LABEL: Record<string, string> = {
  magnitude: "7-day magnitude",
  distanceFromNorm: "Distance from norm",
  percentChange: "% change",
  thresholdCrossing: "Threshold crossing",
  rarity: "Historical rarity",
  percentileMovement: "Percentile movement",
  supportingIndicators: "Supporting indicators",
  confidence: "Confidence",
  researchSignificance: "Research significance",
};

export function IntelligenceQueue({ events, configured, note }: { events: IntelligenceEvent[]; configured: boolean; note: string | null }) {
  const [items, setItems] = useState(events);
  const visible = useMemo(() => items.filter((e) => e.status !== "dismissed" && e.status !== "snoozed"), [items]);

  const act = async (event: IntelligenceEvent, action: "snooze" | "dismiss" | "posted") => {
    // Optimistic update.
    setItems((prev) => prev.map((e) => (e.dedupeKey === event.dedupeKey ? { ...e, status: action === "snooze" ? "snoozed" : action === "dismiss" ? "dismissed" : "posted" } : e)));
    try {
      await fetch("/api/admin/intelligence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, event }) });
    } catch {
      /* best-effort; the queue re-derives on next load */
    }
  };

  if (!visible.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/[0.12] p-5">
        <div className="text-[13px] text-ink-200 font-medium">No publishable intelligence today.</div>
        <p className="mt-1.5 text-[12px] text-ink-500 leading-relaxed">
          The engine only surfaces genuinely significant events — quiet days stay quiet by design. {note}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {note && <p className="text-[11.5px] text-signal-amber leading-relaxed">{note}</p>}
      {visible.map((e, i) => (
        <EventCard key={e.dedupeKey} e={e} rank={i + 1} onAct={act} />
      ))}
    </div>
  );
}

function EventCard({ e, rank, onAct }: { e: IntelligenceEvent; rank: number; onAct: (e: IntelligenceEvent, a: "snooze" | "dismiss" | "posted") => void }) {
  const [open, setOpen] = useState(false);
  const p = PRIORITY[e.priority];
  const generateHref = `/admin/content?pack=${encodeURIComponent(e.suggestedPack)}`;
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0b0f15] p-5">
      <div className="flex items-start gap-4">
        <div className="shrink-0 text-center">
          <div className="font-mono text-[22px] leading-none text-ink-500 tabular-nums">{rank}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9.5px] uppercase tracking-[0.14em] rounded-full px-2 py-0.5" style={{ color: p.color, background: p.bg }}>{p.label}</span>
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink-500">{e.eventType}</span>
            {e.displayId && <span className="text-[10.5px] font-mono text-ink-600">{e.displayId}</span>}
            {e.status === "posted" && <span className="text-[9.5px] uppercase tracking-wide text-signal-green">posted</span>}
          </div>
          <div className="mt-2 text-[19px] text-ink-50 font-medium leading-snug">{e.suggestedHeadline}</div>
          <p className="mt-1 text-[13px] text-ink-400 leading-relaxed">{e.summary}</p>

          {/* Headline metrics */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]">
            <Metric label="Score" value={`${e.storyScore}`} accent />
            <Metric label="Confidence" value={cap(e.confidence)} />
            <Metric label="Rarity" value={cap(e.rarity)} />
            {e.scoreChange != null && e.scoreChange !== 0 && <Metric label="Δ score" value={`${e.scoreChange > 0 ? "+" : ""}${e.scoreChange}`} />}
          </div>

          {/* What changed + why it fired */}
          <div className="mt-3 rounded-lg border border-white/[0.06] p-3 space-y-1.5">
            <Line label="What changed" value={e.currentValue ?? e.summary} />
            <Line label="Why it fired" value={e.triggerReason} />
            <Line label="Recommended" value={`${e.suggestedPack} pack · ${e.suggestedLayout} layout`} />
            <Line label="Platforms" value={e.suggestedPlatforms.join(" · ")} />
          </div>

          {/* Score breakdown (collapsible) */}
          <button onClick={() => setOpen((v) => !v)} className="mt-2.5 text-[11.5px] text-accent hover:text-accent-soft">
            {open ? "Hide" : "Show"} score breakdown &amp; supporting indicators
          </button>
          {open && (
            <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
              <div className="space-y-1">
                {(Object.keys(FACTOR_LABEL) as (keyof typeof e.breakdown)[]).map((k) => (
                  <div key={k} className="flex items-center gap-2.5">
                    <div className="w-36 shrink-0 text-[11px] text-ink-400">{FACTOR_LABEL[k]}</div>
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.round((e.breakdown[k] ?? 0) * 100)}%` }} />
                    </div>
                    <div className="w-7 text-right font-mono text-[10.5px] text-ink-500 tabular-nums">{Math.round((e.breakdown[k] ?? 0) * 100)}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-ink-500 mb-1.5">Supporting indicators</div>
                <ul className="space-y-1">
                  {e.supportingIndicators.map((s, i) => (
                    <li key={i} className="flex gap-2 text-[12px] text-ink-300 leading-relaxed">
                      <span className="text-accent mt-0.5">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                  {e.triggers.length > 0 && (
                    <li className="text-[11px] text-ink-500 pt-1">Triggers: {e.triggers.map((t) => t.reason).join("; ")}</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a href={generateHref} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent text-ink-950 text-[12.5px] font-medium hover:bg-accent-soft transition-colors">
              <Sparkles size={14} /> Generate Creative
            </a>
            <a href={e.cta.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/[0.1] text-ink-200 text-[12.5px] hover:border-white/25 hover:text-ink-50 transition-colors">
              <Eye size={14} /> Preview <ExternalLink size={11} className="text-ink-500" />
            </a>
            <button onClick={() => onAct(e, "posted")} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/[0.1] text-ink-200 text-[12.5px] hover:border-white/25 hover:text-ink-50 transition-colors">
              <Check size={14} /> Mark Posted
            </button>
            <button onClick={() => onAct(e, "snooze")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-ink-400 text-[12.5px] hover:text-ink-100 transition-colors">
              <Clock size={14} /> Snooze
            </button>
            <button onClick={() => onAct(e, "dismiss")} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-ink-500 text-[12.5px] hover:text-signal-red transition-colors">
              <X size={14} /> Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[9.5px] uppercase tracking-[0.14em] text-ink-500">{label}</span>
      <span className={`font-mono tabular-nums text-[14px] ${accent ? "text-accent" : "text-ink-100"}`}>{value}</span>
    </span>
  );
}
function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-[12px] leading-relaxed">
      <span className="w-24 shrink-0 text-ink-500">{label}</span>
      <span className="text-ink-200">{value}</span>
    </div>
  );
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
