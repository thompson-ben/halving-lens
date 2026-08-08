"use client";

import { useState } from "react";
import { Bell, AlertCircle } from "lucide-react";
import { track } from "@/lib/track";
import { getAttribution } from "@/lib/attribution";
import { decideProWaitlist, type ProWaitlistResponseBody, type ProUiState } from "@/lib/proWaitlist";

// HalvingLens Pro early-access capture (CD2) — a demand-validation seam,
// not a product. Explicitly a FUTURE feature: no payment, no gating, and
// the Lens above stays fully usable without it.
//
// Pro interest is FIRST-CLASS intent: it persists to its own pro_waitlist
// store via /api/pro-waitlist and joins nothing else. Success renders only
// on confirmed durable capture; repeat submissions are harmless. The table
// is the authoritative demand count.
const SOURCE = "/cycle-dashboard#pro-early-access";

export function ProEarlyAccess() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<ProUiState | "idle">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const done = state === "success" || state === "existing";
  const error = state === "invalid" || state === "rate_limited" || state === "error" ? message : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("invalid");
      setMessage("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    let status: number | null = null;
    let body: ProWaitlistResponseBody | null = null;
    try {
      const res = await fetch("/api/pro-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: SOURCE }),
      });
      status = res.status;
      body = (await res.json().catch(() => null)) as ProWaitlistResponseBody | null;
    } catch {
      status = null;
    }
    const d = decideProWaitlist(status, body);
    if (d.fireJoin) track("pro_waitlist_join", { source: SOURCE, ...getAttribution() });
    setState(d.state);
    setMessage(d.message);
    setSubmitting(false);
  };

  return (
    <section className="border-t border-white/[0.06] pt-6">
      <div className="max-w-xl">
        <div className="flex items-center gap-2 text-editorial mb-1.5">
          <Bell size={14} strokeWidth={1.8} />
          <span className="eyebrow">HalvingLens Pro · early access</span>
        </div>
        <h2 className="font-display text-headline font-medium tracking-tight-2 text-ink-100 leading-snug">
          Want to know when something meaningful changes?
        </h2>
        <p className="mt-2 text-body text-ink-300 leading-relaxed">
          Join the early-access list for future alerts when Bitcoin enters historically meaningful
          states — the moment a reading like the one above first becomes true, not weeks later.
          Pro doesn&apos;t exist yet; this list is how we decide to build it.
        </p>
        {done ? (
          <p className="mt-4 text-body text-ink-100">{message}</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-2.5" noValidate>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state !== "idle") setState("idle");
                }}
                placeholder="you@email.com"
                aria-label="Email address for Pro early access"
                aria-invalid={!!error}
                aria-describedby={error ? "pro-early-error" : undefined}
                disabled={submitting}
                className={`w-full sm:flex-1 sm:min-w-0 h-11 px-3.5 rounded-lg bg-white/[0.03] border text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-editorial/40 transition-colors disabled:opacity-60 ${
                  error ? "border-signal-red/50" : "border-white/[0.08]"
                }`}
              />
              <button
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
                className="w-full sm:w-auto h-11 px-5 rounded-lg border border-editorial/40 text-editorial text-[13px] font-medium hover:bg-editorial/[0.08] transition-colors disabled:opacity-60 shrink-0"
              >
                {submitting ? "Joining…" : error ? "Try again" : "Join early access"}
              </button>
            </div>
            <p className="text-micro text-ink-500 leading-relaxed">
              Early access only — nothing to pay now, and this joins nothing else. We&apos;ll email
              you once, when Pro opens.
            </p>
          </form>
        )}
        {error && (
          <p id="pro-early-error" role="alert" className="mt-2 flex items-center gap-1.5 text-caption text-signal-red">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </p>
        )}
      </div>
    </section>
  );
}
