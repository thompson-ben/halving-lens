"use client";

import { useState } from "react";
import { Youtube, Check, ArrowUpRight } from "lucide-react";

// Self-attested YouTube subscription. Opens the channel, then lets the member
// confirm they've subscribed — which earns the achievement. Honour system:
// YouTube gives us no signal to verify, so we simply record the claim via
// /api/profile/youtube (read-modify-write, other state preserved).
export function YouTubeSubscribe({ url, initialSubscribed }: { url: string; initialSubscribed: boolean }) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [busy, setBusy] = useState(false);

  const set = async (next: boolean) => {
    setBusy(true);
    setSubscribed(next); // optimistic
    try {
      const res = await fetch("/api/profile/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscribed: next }),
      });
      if (!res.ok) setSubscribed(!next); // revert on failure
    } catch {
      setSubscribed(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5 min-w-0">
        <Youtube size={18} className="text-signal-red shrink-0" />
        <div className="min-w-0">
          <div className="text-[13.5px] text-ink-100 font-medium">Subscribe on YouTube</div>
          <div className="text-[11.5px] text-ink-500">
            {subscribed ? "Thanks for subscribing — achievement earned." : "Deeper walk-throughs of the cycle, in video."}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.1] text-[12.5px] text-ink-200 hover:text-ink-50 hover:border-white/20 transition-colors"
        >
          Open channel <ArrowUpRight size={13} />
        </a>
        <button
          onClick={() => set(!subscribed)}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors disabled:opacity-60 ${
            subscribed
              ? "border border-white/[0.1] text-ink-400 hover:text-ink-200"
              : "bg-accent text-ink-950 hover:bg-accent-soft"
          }`}
        >
          {subscribed ? "Subscribed ✓ — undo" : (<><Check size={13} /> I&apos;ve subscribed</>)}
        </button>
      </div>
    </div>
  );
}
