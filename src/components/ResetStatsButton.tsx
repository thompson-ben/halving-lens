"use client";

import { useState } from "react";
import { Trash2, RefreshCw, AlertTriangle } from "lucide-react";

// Admin-only "Reset stats" control. Two-step confirm, then clears the analytics
// events table via /api/admin/reset-stats and reloads to show the clean
// baseline. Only page-view/session data is cleared — subscribers, feedback,
// votes and warehouse data are untouched.
export function ResetStatsButton() {
  const [stage, setStage] = useState<"idle" | "confirm" | "working" | "error">("idle");

  const reset = async () => {
    setStage("working");
    try {
      const res = await fetch("/api/admin/reset-stats", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      window.location.reload();
    } catch {
      setStage("error");
    }
  };

  if (stage === "confirm") {
    return (
      <div className="rounded-xl border border-signal-red/25 bg-signal-red/[0.05] p-4 max-w-md">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-signal-red mt-0.5 shrink-0" strokeWidth={1.8} />
          <div>
            <p className="text-[12.5px] text-ink-200 leading-relaxed">
              Clear <span className="text-ink-50 font-medium">all page-view & session stats</span> and
              start from zero? This can&apos;t be undone. Subscribers, feedback and votes are kept.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-signal-red/90 text-white text-[12px] font-medium hover:bg-signal-red transition-colors"
              >
                <Trash2 size={13} /> Yes, reset stats
              </button>
              <button
                onClick={() => setStage("idle")}
                className="px-3 py-1.5 rounded-lg text-[12px] text-ink-300 hover:text-ink-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setStage("confirm")}
      disabled={stage === "working"}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/[0.08] text-ink-400 text-[12px] hover:text-signal-red hover:border-signal-red/30 transition-colors disabled:opacity-60"
    >
      {stage === "working" ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
      {stage === "working" ? "Resetting…" : stage === "error" ? "Failed — try again" : "Reset stats"}
    </button>
  );
}
