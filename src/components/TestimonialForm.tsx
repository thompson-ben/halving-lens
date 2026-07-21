"use client";

import { useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import { QUOTE_MAX } from "@/lib/testimonials";

// Reader-facing testimonial form. Submits to /api/testimonials (always stored as
// pending → approved by an admin before it can appear anywhere). `email`/`token`
// come from the Day-14 email link for attribution; the form also works without
// them (anonymous, rate-limited).
export function TestimonialForm({ email, token }: { email?: string; token?: string }) {
  const [quote, setQuote] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote, displayName, role, consent, email, token }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setError("We couldn’t reach the server. Please try again.");
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="card-glow p-6 sm:p-8" role="status" aria-live="polite">
        <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-signal-green/25 bg-signal-green/[0.08] text-signal-green text-[13.5px]">
          <Check size={16} /> Thank you — that means a lot.
        </div>
        <p className="mt-3 text-[13px] text-ink-300 leading-relaxed max-w-md">
          We read every note. If we&apos;d like to feature yours, it&apos;ll only ever appear with the display name
          you gave — and only after we&apos;ve reviewed it.
        </p>
      </div>
    );
  }

  const disabled = state === "submitting";
  return (
    <form onSubmit={submit} className="card-glow p-6 sm:p-8 space-y-4" noValidate>
      <div>
        <label htmlFor="tst-quote" className="text-[12px] uppercase tracking-[0.14em] text-ink-400">In a sentence or two</label>
        <textarea
          id="tst-quote"
          value={quote}
          onChange={(e) => setQuote(e.target.value.slice(0, QUOTE_MAX))}
          rows={3}
          maxLength={QUOTE_MAX}
          placeholder="How does HalvingLens help you? e.g. it saves me research time and gives me historical context without the hype."
          className="mt-2 w-full px-3.5 py-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40 leading-relaxed"
        />
        <div className="mt-1 text-right text-[11px] text-ink-500">{quote.length}/{QUOTE_MAX}</div>
        <p className="text-[11px] text-ink-500 leading-relaxed">
          Please don&apos;t include specific investment returns or price predictions — just how it helps.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="tst-name" className="text-[12px] uppercase tracking-[0.14em] text-ink-400">Display name</label>
          <input
            id="tst-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How you'd like to be credited"
            className="mt-2 w-full h-11 px-3.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40"
          />
        </div>
        <div>
          <label htmlFor="tst-role" className="text-[12px] uppercase tracking-[0.14em] text-ink-400">Role <span className="text-ink-600">(optional)</span></label>
          <input
            id="tst-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. long-term holder"
            className="mt-2 w-full h-11 px-3.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40"
          />
        </div>
      </div>

      <label className="flex items-start gap-2 text-[12px] text-ink-300 cursor-pointer">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-[#5eead4]" />
        <span>I&apos;m happy for HalvingLens to publish this on the site with my display name.</span>
      </label>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[12px] text-signal-red">
          <AlertCircle size={13} className="shrink-0" /> {error}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled}
        aria-busy={disabled}
        className="h-11 px-6 rounded-lg bg-accent text-ink-950 text-[13px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60"
      >
        {disabled ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
