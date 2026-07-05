"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";

// Set an optional public display name. When set, it replaces the anonymous
// handle on the leaderboard, the Hall of Founders and the weekly round-up.
// Persists via /api/profile/name (server enforces validation + uniqueness).
const MAX = 24;

export function DisplayNameForm({ initialName }: { initialName: string | null }) {
  const [saved, setSaved] = useState<string | null>(initialName);
  const [value, setValue] = useState(initialName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const dirty = value.trim() !== (saved ?? "");

  const save = async () => {
    setBusy(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch("/api/profile/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; displayName: string | null };
      if (data.ok) {
        setSaved(data.displayName);
        setValue(data.displayName ?? "");
        setOk(true);
        setTimeout(() => setOk(false), 2200);
      } else {
        setError(data.error ?? "Couldn't save — try again.");
      }
    } catch {
      setError("Couldn't reach the server — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-ink-500 mb-2">
        <Pencil size={11} /> Display name
      </div>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          maxLength={MAX}
          placeholder="Add a public name (optional)"
          spellCheck={false}
          className="flex-1 min-w-0 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-[13.5px] text-ink-100 placeholder:text-ink-600 focus:outline-none focus:border-accent/40"
        />
        <button
          onClick={save}
          disabled={busy || !dirty}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent text-ink-950 text-[12.5px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {ok ? <Check size={14} /> : null} {ok ? "Saved" : saved && value.trim() === "" ? "Remove" : "Save"}
        </button>
      </div>
      {error ? (
        <p className="mt-1.5 text-[11.5px] text-signal-red">{error}</p>
      ) : (
        <p className="mt-1.5 text-[11.5px] text-ink-500">
          Shown on the leaderboard, Hall of Founders and your weekly round-up. Leave blank to stay anonymous.
        </p>
      )}
    </div>
  );
}
