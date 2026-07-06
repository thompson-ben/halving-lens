"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

// Preference toggle for milestone celebrations. Default on; power users can
// switch them off. Persists via /api/profile/celebrations (read-modify-write).
export function CelebrationsToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    const next = !enabled;
    setBusy(true);
    setEnabled(next); // optimistic
    try {
      const res = await fetch("/api/profile/celebrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) setEnabled(!next);
    } catch {
      setEnabled(!next);
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
      <span className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${enabled ? "bg-accent/70" : "bg-white/[0.1]"}`}>
        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-3.5" : "translate-x-0.5"}`} />
      </span>
      <Sparkles size={12} /> Celebrations {enabled ? "on" : "off"}
    </button>
  );
}
