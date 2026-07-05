"use client";

import { useState } from "react";

// Small toggle: opt in/out of the public Hall of Founders. Persists via
// /api/profile/hall (read-modify-write, so other profile state is preserved).
export function HallOptOut({ initialHidden }: { initialHidden: boolean }) {
  const [hidden, setHidden] = useState(initialHidden);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    const next = !hidden;
    setBusy(true);
    setHidden(next); // optimistic
    try {
      const res = await fetch("/api/profile/hall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hide: next }),
      });
      if (!res.ok) setHidden(!next); // revert on failure
    } catch {
      setHidden(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="inline-flex items-center gap-2 text-[12.5px] text-ink-400 hover:text-ink-200 transition-colors disabled:opacity-60"
    >
      <span
        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${hidden ? "bg-white/[0.1]" : "bg-accent/70"}`}
      >
        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${hidden ? "translate-x-0.5" : "translate-x-3.5"}`} />
      </span>
      {hidden ? "Hidden from the Hall of Founders" : "Shown in the Hall of Founders"}
    </button>
  );
}
