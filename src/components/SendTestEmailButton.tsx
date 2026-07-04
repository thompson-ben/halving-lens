"use client";

import { useState } from "react";
import { Mail, Loader2, Check, AlertTriangle } from "lucide-react";

// One-click "send today's brief now" for the admin dashboard. POSTs to the
// existing send route with force=1 (bypasses the once-per-day guard) and shows
// the result inline — no curl/console needed. Auth rides on the admin cookie;
// if the page was opened with ?key=, that's forwarded too.
interface SendResult {
  ok?: boolean;
  reason?: string;
  subscriberCount?: number;
  sent?: number;
  delivered?: number;
  failed?: number;
  error?: string;
}

export function SendTestEmailButton({
  endpoint = "/api/admin/send-brief",
  label = "Send test email now",
  query = "force=1",
}: {
  endpoint?: string;
  label?: string;
  query?: string; // extra query for the POST, e.g. "test=1" (to me) or "force=1" (to all)
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  const send = async () => {
    setBusy(true);
    setResult(null);
    try {
      const key = new URLSearchParams(window.location.search).get("key");
      const qs = `${query}${key ? `&key=${encodeURIComponent(key)}` : ""}`;
      const res = await fetch(`${endpoint}?${qs}`, { method: "POST" });
      setResult((await res.json()) as SendResult);
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const ok = result?.ok && (!result.reason || result.reason === "test_sent");
  const summary = (() => {
    if (!result) return null;
    if (result.ok && result.reason === "test_sent") return "Test sent to you — check your inbox.";
    if (result.ok && result.reason === "already_sent_today") return "Already sent today (use this to re-send).";
    if (result.error === "no_test_recipient") return "No test recipient — set FOUNDER_EMAIL.";
    if (result.reason && result.reason !== "test_sent") return `Not sent — ${result.reason.replace(/_/g, " ")}.`;
    if (result.error) return `Failed — ${result.error}.`;
    if (result.ok)
      return `Sent ${result.sent ?? 0} · delivered ${result.delivered ?? 0} · failed ${result.failed ?? 0}.`;
    return "Something went wrong.";
  })();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={send}
        disabled={busy}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-accent text-ink-950 text-[12.5px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
        {busy ? "Sending…" : label}
      </button>
      {summary && (
        <span
          className={`inline-flex items-center gap-1.5 text-[12px] ${
            ok ? "text-signal-green" : "text-signal-amber"
          }`}
        >
          {ok ? <Check size={13} /> : <AlertTriangle size={13} />}
          {summary}
        </span>
      )}
    </div>
  );
}
