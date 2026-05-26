"use client";

import { useState } from "react";
import { RefreshCw, Rss, Search, Zap } from "lucide-react";

export function TopBar() {
  const [syncing, setSyncing] = useState(false);
  const [syncingRss, setSyncingRss] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function syncInstagram() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/instagram/sync", { method: "POST" });
      const data = await res.json();
      setMessage(
        data.usingMock
          ? `Synced ${data.imported} mock posts (live IG not configured).`
          : `Synced ${data.imported} posts from Instagram.`,
      );
    } catch {
      setMessage("Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function syncRss() {
    setSyncingRss(true);
    setMessage(null);
    try {
      const res = await fetch("/api/rss/sync", { method: "POST" });
      const data = await res.json();
      const suffix = data.usingMock ? " (mock feeds)" : ` from ${data.feeds} feed${data.feeds === 1 ? "" : "s"}`;
      setMessage(`RSS: ${data.imported} new, ${data.skipped} skipped${suffix}.`);
    } catch {
      setMessage("RSS sync failed.");
    } finally {
      setSyncingRss(false);
    }
  }

  async function rescore() {
    setRescoring(true);
    setMessage(null);
    try {
      const res = await fetch("/api/score", { method: "POST" });
      const data = await res.json();
      setMessage(`Rescored ${data.updated} items (model ${data.modelVersion}).`);
    } catch {
      setMessage("Rescore failed.");
    } finally {
      setRescoring(false);
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b border-ink-700 bg-ink-950/70 backdrop-blur">
      <div className="px-6 md:px-8 py-3 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search content, makes, models…" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {message && <span className="text-xs text-ink-300 mr-2">{message}</span>}
          <button onClick={syncInstagram} className="btn-secondary" disabled={syncing}>
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync IG"}
          </button>
          <button onClick={syncRss} className="btn-secondary" disabled={syncingRss}>
            <Rss className={`w-4 h-4 ${syncingRss ? "animate-spin" : ""}`} />
            {syncingRss ? "Syncing…" : "Sync RSS"}
          </button>
          <button onClick={rescore} className="btn-primary" disabled={rescoring}>
            <Zap className="w-4 h-4" />
            {rescoring ? "Rescoring…" : "Rescore queue"}
          </button>
        </div>
      </div>
    </header>
  );
}
