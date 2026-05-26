"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Radar, Sparkles, Star, X } from "lucide-react";
import { formatNumber, formatPercent, relativeTime } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";

type TopPost = {
  permalink: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  likeCount: number | null;
  commentCount: number | null;
};

type Favourite = {
  id: string;
  platform: string;
  handle: string;
  displayName: string | null;
  url: string | null;
  profilePicUrl: string | null;
  bio: string | null;
  followersCount: number | null;
  followsCount: number | null;
  mediaCount: number | null;
  tags: string[];
  notes: string | null;
  active: boolean;
  postsPerWeek: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  engagementVelocity: number | null;
  topPost: TopPost | null;
  discoveredFrom: string;
  lastScannedAt: string | null;
};

type Suggestion = {
  handle: string;
  displayName: string;
  reason: string;
  tags: string[];
};

export default function FavouritesPage() {
  const [items, setItems] = useState<Favourite[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsSource, setSuggestionsSource] = useState<"llm" | "curated" | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [adoptingHandle, setAdoptingHandle] = useState<string | null>(null);

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    loadSuggestions();
  }, []);

  async function refresh() {
    const d = await fetch("/api/favourites").then((r) => r.json());
    setItems(d.items);
  }

  async function loadSuggestions() {
    setSuggesting(true);
    try {
      const res = await fetch("/api/favourites/suggest", { method: "POST" });
      const data = await res.json();
      setSuggestions(data.items ?? []);
      setSuggestionsSource(data.source ?? null);
    } finally {
      setSuggesting(false);
    }
  }

  async function adoptSuggestion(s: Suggestion) {
    setAdoptingHandle(s.handle);
    try {
      const res = await fetch("/api/favourites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: s.handle,
          displayName: s.displayName,
          tags: s.tags,
          notes: `Suggested: ${s.reason}`,
        }),
      });
      if (res.ok) {
        setSuggestions((cur) => cur.filter((x) => x.handle !== s.handle));
        await refresh();
      }
    } finally {
      setAdoptingHandle(null);
    }
  }

  async function scan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/favourites/scan", { method: "POST" });
      const data = await res.json();
      const mockNote = data.usingMock ? " (mock — connect IG to scan live)" : "";
      setScanResult(`Scanned ${data.scanned}: ${data.imported} new posts, ${data.skipped} dup${mockNote}.`);
      await refresh();
    } catch {
      setScanResult("Scan failed.");
    } finally {
      setScanning(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const tags = tagsInput
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const res = await fetch("/api/favourites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle,
        displayName: displayName || undefined,
        tags,
        notes: notes || undefined,
      }),
    });
    if (res.ok) {
      setHandle("");
      setDisplayName("");
      setTagsInput("");
      setNotes("");
      await refresh();
    }
    setAdding(false);
  }

  async function remove(id: string) {
    if (!confirm("Remove this favourite account?")) return;
    await fetch("/api/favourites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/favourites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active }),
    });
    await refresh();
  }

  const allTags = Array.from(new Set(items.flatMap((i) => i.tags))).sort();
  const filtered = tagFilter ? items.filter((i) => i.tags.includes(tagFilter)) : items;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-100 flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" /> Favourite accounts
          </h1>
          <p className="text-sm text-ink-300 mt-1">
            Inspiration seeds and audience pattern signals. The sourcing engine uses these as discovery anchors — not as a hard filter.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {scanResult && <span className="text-xs text-ink-300">{scanResult}</span>}
          <button onClick={scan} className="btn-secondary" disabled={scanning}>
            <Radar className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning…" : "Scan all"}
          </button>
        </div>
      </div>

      <form onSubmit={add} className="card p-5 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="label">Instagram handle</label>
          <input
            className="input"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="carlifestyle"
            required
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Display name (optional)</label>
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="CarLifestyle"
          />
        </div>
        <div className="md:col-span-1">
          <label className="label">Tags (comma-separated)</label>
          <input
            className="input"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="luxury, hypercar"
          />
        </div>
        <div className="md:col-span-1">
          <button className="btn-primary w-full" disabled={adding}>
            <Plus className="w-4 h-4" /> {adding ? "Adding…" : "Add favourite"}
          </button>
        </div>
        <div className="md:col-span-6">
          <label className="label">Notes</label>
          <input
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything you'd want to remember about this account."
          />
        </div>
      </form>

      {(suggestions.length > 0 || suggesting) && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                Suggested for you
              </h2>
              <p className="text-xs text-ink-400 mt-0.5">
                {suggestionsSource === "llm"
                  ? "Generated by the AI model based on your current favourites."
                  : "Curated supercar accounts — connect OpenAI to personalise."}
              </p>
            </div>
            <button
              onClick={loadSuggestions}
              className="text-xs text-ink-300 hover:text-ink-100 underline-offset-2 hover:underline disabled:opacity-50"
              disabled={suggesting}
            >
              {suggesting ? "Loading…" : "Refresh"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((s) => (
              <div
                key={s.handle}
                className="rounded-lg border border-ink-700 bg-ink-850 p-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <a
                      href={`https://www.instagram.com/${s.handle}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-ink-100 hover:text-accent truncate block"
                    >
                      @{s.handle}
                    </a>
                    {s.displayName && s.displayName.toLowerCase() !== s.handle.toLowerCase() && (
                      <div className="text-xs text-ink-300 truncate">{s.displayName}</div>
                    )}
                  </div>
                  <button
                    onClick={() => adoptSuggestion(s)}
                    disabled={adoptingHandle === s.handle}
                    className="btn-secondary text-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {adoptingHandle === s.handle ? "Adding…" : "Add"}
                  </button>
                </div>
                <p className="text-xs text-ink-300">{s.reason}</p>
                {s.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-ink-700 text-ink-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-400">Filter by tag:</span>
          <button
            onClick={() => setTagFilter(null)}
            className={`text-xs px-2.5 py-1 rounded-full border ${tagFilter === null ? "bg-accent text-ink-950 border-accent" : "border-ink-700 text-ink-300 hover:border-ink-600"}`}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(tagFilter === t ? null : t)}
              className={`text-xs px-2.5 py-1 rounded-full border ${tagFilter === t ? "bg-accent text-ink-950 border-accent" : "border-ink-700 text-ink-300 hover:border-ink-600"}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-ink-300">Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Star}
          title={tagFilter ? `No favourites tagged ${tagFilter}` : "No favourites yet"}
          description="Add an Instagram handle above to start building your inspiration seed list."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((f) => (
            <FavouriteCard
              key={f.id}
              fav={f}
              onRemove={() => remove(f.id)}
              onToggleActive={() => toggleActive(f.id, !f.active)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FavouriteCard({
  fav,
  onRemove,
  onToggleActive,
}: {
  fav: Favourite;
  onRemove: () => void;
  onToggleActive: () => void;
}) {
  return (
    <div className={`card p-5 space-y-4 ${fav.active ? "" : "opacity-60"}`}>
      <div className="flex items-start gap-3">
        {fav.profilePicUrl ? (
          <Image
            src={fav.profilePicUrl}
            alt={fav.handle}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover border border-ink-700"
            unoptimized
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-ink-800 border border-ink-700" />
        )}
        <div className="flex-1 min-w-0">
          <a
            href={fav.url ?? `https://www.instagram.com/${fav.handle}`}
            target="_blank"
            rel="noreferrer"
            className="text-base font-semibold text-ink-100 hover:text-accent block truncate"
          >
            @{fav.handle}
          </a>
          {fav.displayName && (
            <div className="text-xs text-ink-300 truncate">{fav.displayName}</div>
          )}
          {fav.bio && (
            <div className="text-xs text-ink-400 mt-1 line-clamp-2">{fav.bio}</div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleActive}
            className="text-[11px] px-2 py-1 rounded-md border border-ink-700 text-ink-300 hover:border-ink-600"
            title={fav.active ? "Pause monitoring" : "Resume monitoring"}
          >
            {fav.active ? "Pause" : "Resume"}
          </button>
          <button
            onClick={onRemove}
            className="text-ink-400 hover:text-signal-red p-1"
            aria-label="Remove favourite"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label="Followers" value={formatNumber(fav.followersCount)} />
        <Stat label="Posts / wk" value={fav.postsPerWeek != null ? fav.postsPerWeek.toFixed(1) : "—"} />
        <Stat label="Avg likes" value={formatNumber(fav.avgLikes)} />
        <Stat
          label="Velocity"
          value={fav.engagementVelocity != null ? formatPercent(fav.engagementVelocity * 100, 2) : "—"}
        />
      </div>

      {fav.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {fav.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-ink-700 text-ink-300"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {fav.topPost && fav.topPost.thumbnailUrl && (
        <a
          href={fav.topPost.permalink ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg border border-ink-700 bg-ink-850 p-3 hover:border-ink-600 transition-colors"
        >
          <Image
            src={fav.topPost.thumbnailUrl}
            alt="Top recent post"
            width={56}
            height={56}
            className="w-14 h-14 object-cover rounded-md"
            unoptimized
          />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-ink-400">Top recent post</div>
            <div className="text-xs text-ink-100 truncate">{fav.topPost.caption ?? "(no caption)"}</div>
            <div className="text-[11px] text-ink-300 mt-0.5">
              {formatNumber(fav.topPost.likeCount)} likes · {formatNumber(fav.topPost.commentCount)} comments
            </div>
          </div>
        </a>
      )}

      {fav.notes && <div className="text-xs text-ink-300 italic">{fav.notes}</div>}

      <div className="text-[10px] text-ink-400">
        {fav.lastScannedAt ? `Last scanned ${relativeTime(fav.lastScannedAt)}` : "Never scanned"}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-ink-700 bg-ink-850 px-2 py-2">
      <div className="text-sm text-ink-100">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
    </div>
  );
}
