"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { sessionId, track } from "@/lib/track";

// Lightweight "Was this page useful?" widget. 👍 / 👎 + optional follow-up text.
// Stored via /api/feedback. Drop it at the bottom of any page.
export function FeedbackWidget() {
  const pathname = usePathname();
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const send = async (h: boolean, msg?: string) => {
    setHelpful(h);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, helpful: h, message: msg, sessionId: sessionId() }),
      });
    } catch {
      /* never break the page */
    }
    track("feedback", { helpful: h });
  };

  if (sent) {
    return (
      <div className="inline-flex items-center gap-2 text-[12.5px] text-signal-green">
        <Check size={14} /> Thanks — your feedback helps shape what we build next.
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-[13px] text-ink-200">Was this page useful?</span>
        <div className="flex gap-2">
          <button
            onClick={() => send(true)}
            aria-pressed={helpful === true}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] transition-colors ${
              helpful === true
                ? "border-signal-green/40 bg-signal-green/10 text-signal-green"
                : "border-white/[0.08] text-ink-300 hover:text-ink-100 hover:border-white/20"
            }`}
          >
            <ThumbsUp size={13} /> Helpful
          </button>
          <button
            onClick={() => send(false)}
            aria-pressed={helpful === false}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] transition-colors ${
              helpful === false
                ? "border-signal-amber/40 bg-signal-amber/10 text-signal-amber"
                : "border-white/[0.08] text-ink-300 hover:text-ink-100 hover:border-white/20"
            }`}
          >
            <ThumbsDown size={13} /> Not helpful
          </button>
        </div>
      </div>

      {helpful !== null && (
        <form
          className="mt-4 flex gap-2 flex-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            void send(helpful, message);
            setSent(true);
          }}
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What would make this more useful? (optional)"
            className="flex-1 min-w-[220px] h-10 px-3.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[13px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40"
          />
          <button
            type="submit"
            className="h-10 px-4 rounded-lg bg-accent text-ink-950 text-[12.5px] font-medium hover:bg-accent-soft transition-colors"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
