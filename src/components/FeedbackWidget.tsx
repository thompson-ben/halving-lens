"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { sessionId, visitorId, deviceType, track } from "@/lib/track";

// Lightweight "Was this useful?" feedback. 👍 / 👎 + an optional one-line
// follow-up. Frictionless: no login, no modal. Drop it at the bottom of any
// page (variant="card") or under any section (variant="inline").
//
// `section` + `contentType` tag the feedback so the dashboard can break it down
// per piece of content (e.g. section="mvrv_explanation", contentType="metric").
export function FeedbackWidget({
  section,
  contentType,
  label = "Was this useful?",
  variant = "card",
}: {
  section?: string;
  contentType?: string;
  label?: string;
  variant?: "card" | "inline";
}) {
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
        body: JSON.stringify({
          path: pathname,
          section,
          contentType,
          helpful: h,
          message: msg,
          sessionId: sessionId(),
          visitorId: visitorId(),
          deviceType: deviceType(),
        }),
      });
    } catch {
      /* never break the page */
    }
    track("feedback", { helpful: h, section });
  };

  const thanks = (
    <span className="inline-flex items-center gap-2 text-[12.5px] text-signal-green">
      <Check size={14} /> Thanks — this helps shape what we improve next.
    </span>
  );

  // Optional comment form, shown after a vote until submitted or skipped.
  const commentForm = helpful !== null && !sent && (
    <form
      className={variant === "inline" ? "mt-2.5 flex gap-2 flex-wrap" : "mt-4 flex gap-2 flex-wrap"}
      onSubmit={(e) => {
        e.preventDefault();
        void send(helpful, message);
        setSent(true);
      }}
    >
      <input
        type="text"
        maxLength={250}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What would make this more useful? (optional)"
        className="flex-1 min-w-[200px] h-9 px-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[12.5px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40"
      />
      <button
        type="submit"
        className="h-9 px-3.5 rounded-lg bg-accent text-ink-950 text-[12px] font-medium hover:bg-accent-soft transition-colors"
      >
        Send
      </button>
      <button
        type="button"
        onClick={() => setSent(true)}
        className="h-9 px-3 rounded-lg text-[12px] text-ink-400 hover:text-ink-200"
      >
        Skip
      </button>
    </form>
  );

  const buttons = (
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
        <ThumbsUp size={13} /> Yes
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
        <ThumbsDown size={13} /> No
      </button>
    </div>
  );

  // ── Inline variant — slim, for under homepage sections ─────────────────────
  if (variant === "inline") {
    return (
      <div className="mt-4 pt-3 border-t border-white/[0.05]">
        {sent ? (
          thanks
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[12px] text-ink-400">{label}</span>
              {buttons}
            </div>
            {commentForm}
          </>
        )}
      </div>
    );
  }

  // ── Card variant — for the bottom of a full page ───────────────────────────
  return (
    <div className="card p-5 sm:p-6">
      {sent ? (
        thanks
      ) : (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[13px] text-ink-200">{label}</span>
            {buttons}
          </div>
          {commentForm}
        </>
      )}
    </div>
  );
}
