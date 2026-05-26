"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Dna, EyeOff, RefreshCw, Sunrise, X } from "lucide-react";
import { ScoreBadge } from "@/components/ScoreBadge";
import { EmptyState } from "@/components/EmptyState";
import { formatNumber, relativeTime } from "@/lib/utils";

type ScoreBreakdown = {
  dna: number;
  ai: number;
  recency: number;
  engagement: number;
  inCooldown: boolean;
};

type Pick = {
  id: string;
  platform: string;
  originalAuthor: string | null;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  carMake: string | null;
  carModel: string | null;
  likes: number | null;
  comments: number | null;
  aiScore: number | null;
  aiReason: string | null;
  status: string;
  discoveredAt: string;
  bestSimilarityScore: number | null;
  similarToPost: { caption: string | null; permalink: string | null } | null;
  compositeScore: number;
  scoreBreakdown: ScoreBreakdown;
};

const SKIP_STORAGE_KEY = "today-picks:skipped";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadSkipped(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(SKIP_STORAGE_KEY) ?? "{}");
    const list = Array.isArray(raw[todayKey()]) ? (raw[todayKey()] as string[]) : [];
    return new Set(list);
  } catch {
    return new Set();
  }
}

function persistSkipped(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.parse(localStorage.getItem(SKIP_STORAGE_KEY) ?? "{}");
    raw[todayKey()] = Array.from(set);
    // GC: only keep today + yesterday so the key doesn't grow unbounded.
    const keep = new Set([todayKey(), new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)]);
    for (const k of Object.keys(raw)) if (!keep.has(k)) delete raw[k];
    localStorage.setItem(SKIP_STORAGE_KEY, JSON.stringify(raw));
  } catch {
    /* localStorage may be unavailable in private mode — fail silent */
  }
}

export default function TodayPage() {
  const [items, setItems] = useState<Pick[]>([]);
  const [meta, setMeta] = useState<{ candidatePoolSize: number; cooldownBrandCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/picks?limit=12`);
      const data = await res.json();
      setItems(data.items ?? []);
      setMeta({ candidatePoolSize: data.candidatePoolSize, cooldownBrandCount: data.cooldownBrandCount });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSkipped(loadSkipped());
    refresh();
  }, [refresh]);

  async function setStatus(id: string, status: "shortlisted" | "rejected") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        // Once acted on, drop the item from today's deck. Reject also
        // counts as "handled" so we don't show it again today.
        setItems((cur) => cur.filter((c) => c.id !== id));
      }
    } finally {
      setBusyId(null);
    }
  }

  function skipForToday(id: string) {
    setSkipped((cur) => {
      const next = new Set(cur);
      next.add(id);
      persistSkipped(next);
      return next;
    });
    setItems((cur) => cur.filter((c) => c.id !== id));
  }

  function clearSkipsAndRefresh() {
    setSkipped(new Set());
    persistSkipped(new Set());
    refresh();
  }

  const visible = useMemo(() => items.filter((it) => !skipped.has(it.id)).slice(0, 10), [items, skipped]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-100 flex items-center gap-2">
            <Sunrise className="w-5 h-5 text-accent" /> Today&apos;s picks
          </h1>
          <p className="text-sm text-ink-300 mt-1">
            The 10 best candidates right now, ranked by DNA match · AI score · recency · brand cooldown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {skipped.size > 0 && (
            <button onClick={clearSkipsAndRefresh} className="btn-ghost text-xs" title="Clear today's skipped items">
              <EyeOff className="w-3.5 h-3.5" /> Reset {skipped.size} skipped
            </button>
          )}
          <button onClick={refresh} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {meta && (
        <div className="text-xs text-ink-400">
          Ranking pool: <span className="text-ink-200">{meta.candidatePoolSize}</span> items ·
          {" "}
          Brand cooldown: <span className="text-ink-200">{meta.cooldownBrandCount}</span> recent brand
          {meta.cooldownBrandCount === 1 ? "" : "s"} dialed down
        </div>
      )}

      {loading ? (
        <div className="text-sm text-ink-300">Loading picks…</div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Sunrise}
          title="Nothing left for today"
          description="You're caught up. Scan favourite accounts or recompute Content DNA to surface fresh material."
        />
      ) : (
        <div className="space-y-4">
          {visible.map((p, idx) => (
            <PickRow
              key={p.id}
              rank={idx + 1}
              pick={p}
              busy={busyId === p.id}
              onShortlist={() => setStatus(p.id, "shortlisted")}
              onReject={() => setStatus(p.id, "rejected")}
              onSkip={() => skipForToday(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PickRow({
  rank,
  pick,
  busy,
  onShortlist,
  onReject,
  onSkip,
}: {
  rank: number;
  pick: Pick;
  busy: boolean;
  onShortlist: () => void;
  onReject: () => void;
  onSkip: () => void;
}) {
  const composite = Math.round(pick.compositeScore * 100);
  const dnaPct = Math.round((pick.bestSimilarityScore ?? 0) * 100);

  return (
    <article className="card overflow-hidden grid grid-cols-1 md:grid-cols-[120px_220px_1fr_auto]">
      <div className="hidden md:flex items-center justify-center bg-ink-850 border-r border-ink-700">
        <div className="text-4xl font-semibold text-ink-300 tabular-nums">#{rank}</div>
      </div>

      <div className="aspect-video md:aspect-auto bg-ink-850 overflow-hidden relative">
        {pick.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pick.thumbnailUrl} alt={pick.caption ?? ""} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-400 text-xs">No preview</div>
        )}
        <div className="absolute top-2 left-2">
          <ScoreBadge score={pick.aiScore ?? null} />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between text-xs text-ink-300">
          <span className="font-medium text-ink-100 truncate">{pick.originalAuthor ?? "Unknown"}</span>
          <span>{relativeTime(pick.discoveredAt)}</span>
        </div>

        {(pick.carMake || pick.carModel) && (
          <div className="text-sm text-ink-100">
            {pick.carMake} <span className="text-ink-300">{pick.carModel}</span>
            {pick.scoreBreakdown.inCooldown && (
              <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-signal-amber/40 text-signal-amber">
                brand cooldown
              </span>
            )}
          </div>
        )}

        <p className="text-sm text-ink-200 line-clamp-2">{pick.caption}</p>

        <div className="flex items-center gap-3 text-xs text-ink-300 mt-1">
          <span>♥ {formatNumber(pick.likes)}</span>
          <span>💬 {formatNumber(pick.comments)}</span>
          {pick.bestSimilarityScore != null && pick.bestSimilarityScore > 0 && (
            <span className="flex items-center gap-1 text-accent">
              <Dna className="w-3 h-3" /> {dnaPct}% DNA
            </span>
          )}
        </div>

        <ScoreBars composite={composite} breakdown={pick.scoreBreakdown} />
      </div>

      <div className="p-4 flex md:flex-col items-stretch gap-2 border-l-0 md:border-l border-ink-700 bg-ink-900/40">
        <div className="hidden md:flex flex-col items-center pb-2 border-b border-ink-700">
          <div className="text-2xl font-semibold text-ink-100 tabular-nums">{composite}</div>
          <div className="text-[10px] uppercase tracking-wider text-ink-400">composite</div>
        </div>
        <button onClick={onShortlist} disabled={busy} className="btn-primary text-xs">
          <Check className="w-3.5 h-3.5" /> Shortlist
        </button>
        <button onClick={onReject} disabled={busy} className="btn-ghost text-xs">
          <X className="w-3.5 h-3.5" /> Reject
        </button>
        <button onClick={onSkip} disabled={busy} className="btn-ghost text-xs">
          <EyeOff className="w-3.5 h-3.5" /> Skip today
        </button>
        <a href={pick.url} target="_blank" rel="noreferrer" className="btn-ghost text-xs">
          Open <ChevronRight className="w-3.5 h-3.5" />
        </a>
        <Link href={`/discovery`} className="text-[10px] text-ink-400 hover:text-ink-200 text-center mt-auto">
          all in queue →
        </Link>
      </div>
    </article>
  );
}

function ScoreBars({ composite, breakdown }: { composite: number; breakdown: ScoreBreakdown }) {
  const rows: Array<{ label: string; pct: number }> = [
    { label: "DNA", pct: breakdown.dna * 100 },
    { label: "Quality", pct: breakdown.ai * 100 },
    { label: "Recency", pct: breakdown.recency * 100 },
    { label: "Source", pct: breakdown.engagement * 100 },
  ];
  return (
    <div className="md:hidden grid grid-cols-4 gap-2 mt-1">
      <div className="col-span-4 text-[10px] uppercase tracking-wider text-ink-400">composite {composite}</div>
      {rows.map((r) => (
        <div key={r.label}>
          <div className="text-[10px] text-ink-400">{r.label}</div>
          <div className="h-1 bg-ink-800 rounded">
            <div className="h-1 bg-accent rounded" style={{ width: `${Math.min(100, Math.max(0, r.pct))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
