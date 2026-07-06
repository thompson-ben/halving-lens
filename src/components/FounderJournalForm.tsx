"use client";

import { useState } from "react";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import type { JournalEntry } from "@/lib/companyHistory";

// Admin form: write the monthly Founder Reflection and log manual metrics that
// have no automatic source yet (social followers, posts, content packs). POSTs
// to /api/admin/founder-journal; auth rides on the admin cookie (+ ?key= if the
// page was opened with one). Mirrors SendTestEmailButton's auth approach.
const PROMPTS: { key: keyof JournalEntry; prompt: string }[] = [
  { key: "proud", prompt: "What am I most proud of this month?" },
  { key: "surprised", prompt: "What surprised me?" },
  { key: "lesson", prompt: "What lesson did I learn?" },
  { key: "differently", prompt: "What would I do differently?" },
  { key: "focus", prompt: "What should we focus on next month?" },
];
const METRICS: { key: string; label: string }[] = [
  { key: "instagram_followers", label: "Instagram followers" },
  { key: "x_followers", label: "X followers" },
  { key: "youtube_subscribers", label: "YouTube subscribers" },
  { key: "social_posts", label: "Social posts (total)" },
  { key: "content_packs", label: "Content packs generated" },
];

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function FounderJournalForm({ latest }: { latest: { month: string; entry: JournalEntry } | null }) {
  const [month, setMonth] = useState(currentMonth());
  const [entry, setEntry] = useState<Record<string, string>>({});
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const save = async () => {
    setBusy(true);
    setResult(null);
    try {
      const cleanEntry: Record<string, string> = {};
      for (const p of PROMPTS) if (entry[p.key]?.trim()) cleanEntry[p.key] = entry[p.key].trim();
      const cleanMetrics: Record<string, number> = {};
      for (const m of METRICS) { const n = Number(metrics[m.key]); if (metrics[m.key]?.trim() && Number.isFinite(n)) cleanMetrics[m.key] = n; }
      if (Object.keys(cleanEntry).length === 0 && Object.keys(cleanMetrics).length === 0) {
        setResult({ ok: false, msg: "Nothing to save — add a reflection or a metric." });
        setBusy(false);
        return;
      }
      const key = new URLSearchParams(window.location.search).get("key");
      const res = await fetch(`/api/admin/founder-journal${key ? `?key=${encodeURIComponent(key)}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, entry: cleanEntry, metrics: cleanMetrics }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      setResult(data.ok ? { ok: true, msg: `Saved for ${month}.` } : { ok: false, msg: data.error ?? "Failed to save." });
    } catch (e) {
      setResult({ ok: false, msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-[14px] text-ink-100 placeholder:text-ink-600 focus:outline-none focus:border-accent/40";

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[11px] uppercase tracking-[0.16em] text-ink-500 mb-1.5">Month</label>
        <input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="YYYY-MM" className={`${field} max-w-[160px] font-mono`} />
      </div>

      <div className="space-y-4">
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Reflection</div>
        {PROMPTS.map((p) => (
          <div key={p.key}>
            <label className="block text-[13px] text-ink-300 mb-1.5">{p.prompt}</label>
            <textarea
              value={entry[p.key] ?? ""}
              onChange={(e) => setEntry((s) => ({ ...s, [p.key]: e.target.value }))}
              rows={2}
              className={field}
            />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-500">Manual metrics (optional)</div>
        <p className="text-[11.5px] text-ink-500 -mt-1">Figures with no automatic source. Saved into this month's snapshot — they feed Since-Launch and year-over-year.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {METRICS.map((m) => (
            <div key={m.key}>
              <label className="block text-[12.5px] text-ink-400 mb-1">{m.label}</label>
              <input
                inputMode="numeric"
                value={metrics[m.key] ?? ""}
                onChange={(e) => setMetrics((s) => ({ ...s, [m.key]: e.target.value }))}
                placeholder="—"
                className={field}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-ink-950 text-[13px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {busy ? "Saving…" : "Save"}
        </button>
        {result && (
          <span className={`inline-flex items-center gap-1.5 text-[12.5px] ${result.ok ? "text-signal-green" : "text-signal-amber"}`}>
            {result.ok ? <Check size={13} /> : <AlertTriangle size={13} />} {result.msg}
          </span>
        )}
      </div>

      {latest && (
        <div className="mt-6 pt-5 border-t border-white/[0.08]">
          <div className="text-[11px] uppercase tracking-[0.16em] text-ink-500 mb-2">Latest entry · {latest.month}</div>
          <div className="space-y-2">
            {PROMPTS.filter((p) => latest.entry?.[p.key]).map((p) => (
              <div key={p.key}>
                <div className="text-[12px] text-ink-500">{p.prompt}</div>
                <div className="text-[13.5px] text-ink-200">{latest.entry[p.key]}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
