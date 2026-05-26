"use client";

import { useEffect, useMemo, useState } from "react";
import { ContentCard, type ContentCardItem } from "@/components/ContentCard";
import { EmptyState } from "@/components/EmptyState";
import { Dna, ListChecks } from "lucide-react";
import { CONTENT_STATUSES, PLATFORMS, PLATFORM_LABELS, STATUS_LABELS, type ContentStatus, type Platform } from "@/types";
import { cn } from "@/lib/utils";

export default function DiscoveryPage() {
  const [items, setItems] = useState<ContentCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ContentStatus | "all">("all");
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [similar, setSimilar] = useState(false);
  const [q, setQ] = useState("");
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeMsg, setRecomputeMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (platform !== "all") params.set("platform", platform);
    if (similar) params.set("similar", "true");
    if (q) params.set("q", q);
    setLoading(true);
    fetch(`/api/content?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false));
  }, [status, platform, similar, q]);

  async function recomputeDna() {
    setRecomputing(true);
    setRecomputeMsg(null);
    try {
      const res = await fetch("/api/dna/recompute", { method: "POST" });
      const data = await res.json();
      setRecomputeMsg(
        `Recomputed DNA in ${data.durationMs}ms — ${data.topPerformerCount} top performers, ${data.contentScored} items scored (model: ${data.model}).`,
      );
      // Re-fetch with current filters
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (platform !== "all") params.set("platform", platform);
      if (similar) params.set("similar", "true");
      if (q) params.set("q", q);
      const r = await fetch(`/api/content?${params.toString()}`);
      const d = await r.json();
      setItems(d.items);
    } catch {
      setRecomputeMsg("Recompute failed.");
    } finally {
      setRecomputing(false);
    }
  }

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(it.status, (m.get(it.status) ?? 0) + 1);
    return m;
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-100">Discovery Queue</h1>
          <p className="text-sm text-ink-300 mt-1">Review, shortlist and approve content before scheduling.</p>
        </div>
        <input
          className="input max-w-xs"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          <FilterRow
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as ContentStatus | "all")}
            options={[
              { value: "all", label: `All (${items.length})` },
              ...CONTENT_STATUSES.map((s) => ({ value: s, label: `${STATUS_LABELS[s]} (${counts.get(s) ?? 0})` })),
            ]}
          />
          <FilterRow
            label="Platform"
            value={platform}
            onChange={(v) => setPlatform(v as Platform | "all")}
            options={[
              { value: "all", label: "All" },
              ...PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABELS[p] })),
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-ink-700">
          <button
            onClick={() => setSimilar((s) => !s)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-colors",
              similar
                ? "bg-accent text-ink-950 border-accent"
                : "bg-ink-850 border-ink-700 text-ink-200 hover:border-ink-600",
            )}
          >
            <Dna className="w-3.5 h-3.5" />
            Similar to top performers
          </button>
          <button
            onClick={recomputeDna}
            disabled={recomputing}
            className="text-xs text-ink-300 hover:text-ink-100 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {recomputing ? "Recomputing…" : "Recompute Content DNA"}
          </button>
          {recomputeMsg && <span className="text-[11px] text-ink-400">{recomputeMsg}</span>}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-ink-300">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={similar ? Dna : ListChecks}
          title={similar ? "No items match your top performers yet" : "No content matches your filters"}
          description={
            similar
              ? "Try recomputing Content DNA, or scan your favourite accounts to surface fresh material."
              : "Try clearing filters, importing a URL, or syncing a source."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              onChange={(next) => setItems((cur) => cur.map((c) => (c.id === next.id ? next : c)))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="section-title">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs border transition-colors",
              value === opt.value
                ? "bg-accent text-ink-950 border-accent"
                : "bg-ink-850 border-ink-700 text-ink-200 hover:border-ink-600",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
