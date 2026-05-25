"use client";

import { useEffect, useState } from "react";
import { Users, Plus } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";

type Competitor = {
  id: string;
  platform: string;
  handle: string;
  url: string | null;
  followers: number | null;
  notes: string | null;
  active: boolean;
};

export default function CompetitorsPage() {
  const [items, setItems] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [platform, setPlatform] = useState("instagram");
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");
  const [followers, setFollowers] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/competitors")
      .then((r) => r.json())
      .then((d) => setItems(d.items))
      .finally(() => setLoading(false));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const res = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        handle,
        url: url || undefined,
        followers: followers ? Number(followers) : undefined,
        notes: notes || undefined,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setItems((cur) => [d.item, ...cur.filter((x) => x.id !== d.item.id)]);
      setHandle("");
      setUrl("");
      setFollowers("");
      setNotes("");
    }
    setAdding(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-100">Competitor accounts</h1>
        <p className="text-sm text-ink-300 mt-1">Track other supercar pages. Used for sourcing and benchmarking.</p>
      </div>

      <form onSubmit={add} className="card p-5 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div className="md:col-span-1">
          <label className="label">Platform</label>
          <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="twitter">X / Twitter</option>
          </select>
        </div>
        <div className="md:col-span-1">
          <label className="label">Handle</label>
          <input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="carlifestyle" required />
        </div>
        <div className="md:col-span-2">
          <label className="label">URL</label>
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div className="md:col-span-1">
          <label className="label">Followers</label>
          <input className="input" value={followers} onChange={(e) => setFollowers(e.target.value)} type="number" />
        </div>
        <div className="md:col-span-1">
          <button className="btn-primary w-full" disabled={adding}>
            <Plus className="w-4 h-4" /> {adding ? "Adding…" : "Add"}
          </button>
        </div>
        <div className="md:col-span-6">
          <label className="label">Notes</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </form>

      {loading ? (
        <div className="text-sm text-ink-300">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title="No competitors tracked yet" description="Add a handle above to begin tracking." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-300 border-b border-ink-700">
              <tr>
                <th className="px-4 py-3">Handle</th>
                <th className="px-4 py-3">Platform</th>
                <th className="px-4 py-3">Followers</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-ink-700">
                  <td className="px-4 py-3">
                    {c.url ? (
                      <a href={c.url} target="_blank" rel="noreferrer" className="text-ink-100 hover:text-accent">
                        @{c.handle}
                      </a>
                    ) : (
                      <span className="text-ink-100">@{c.handle}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-300">{c.platform}</td>
                  <td className="px-4 py-3 text-ink-100">{formatNumber(c.followers)}</td>
                  <td className="px-4 py-3 text-ink-300">{c.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
