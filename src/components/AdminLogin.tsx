"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

// Simple password gate for the metrics dashboard. Posts the key to
// /api/admin-login which sets a session cookie, then reloads to show the stats.
export function AdminLogin({ error }: { error?: boolean }) {
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(error ?? false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFailed(false);
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (res.ok) {
        window.location.href = "/admin/metrics";
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="card p-6 max-w-sm">
      <div className="flex items-center gap-2 text-accent mb-3">
        <Lock size={14} strokeWidth={1.8} />
        <span className="text-[10.5px] uppercase tracking-[0.2em]">Password required</span>
      </div>
      <p className="text-[13px] text-ink-300 mb-4 leading-relaxed">
        Enter the dashboard password to view metrics.
      </p>
      <input
        type="password"
        value={key}
        onChange={(e) => {
          setKey(e.target.value);
          setFailed(false);
        }}
        placeholder="Password"
        aria-label="Dashboard password"
        autoFocus
        className={`w-full h-11 px-3.5 rounded-lg bg-white/[0.03] border text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40 transition-colors ${
          failed ? "border-signal-red/50" : "border-white/[0.08]"
        }`}
      />
      {failed && <p className="mt-2 text-[12px] text-signal-red">Incorrect password.</p>}
      <button
        type="submit"
        disabled={submitting || !key}
        className="mt-3 w-full h-11 rounded-lg bg-accent text-ink-950 text-[13px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60"
      >
        {submitting ? "Checking…" : "View metrics"}
      </button>
    </form>
  );
}
