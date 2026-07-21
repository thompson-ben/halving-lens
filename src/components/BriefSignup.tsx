"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Mail, Check, AlertCircle } from "lucide-react";
import { track } from "@/lib/track";
import { getAttribution } from "@/lib/attribution";
import { fireLead } from "@/lib/marketing";
import { decideFromResponse, type SubscribeResponseBody, type UiState } from "@/lib/subscription";
import { SignupConfirmation } from "./SignupConfirmation";

// Real email capture for the daily brief. POSTs to /api/subscribe and shows a
// success state ONLY when the server confirms the subscriber was durably
// captured (outcome "created" or "existing"). Any failure — validation, rate
// limit, server error or network error — shows a clear, retryable error and
// preserves the entered email. Meta Lead + the canonical `signup` conversion
// fire only for a confirmed NEW subscriber.
export function BriefSignup({
  compact = false,
  heading,
  blurb,
}: {
  compact?: boolean;
  heading?: string;
  blurb?: string;
}) {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(true);
  const [state, setState] = useState<UiState | "idle">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const done = state === "success" || state === "existing";
  const error = state === "invalid" || state === "rate_limited" || state === "error" ? message : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // prevent duplicate submissions while in-flight
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("invalid");
      setMessage("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setMessage(null);

    const attr = getAttribution();
    track("subscription_submit_attempt", { source: pathname, ...attr });

    // Resolve to a definite (status, body) pair; a thrown fetch → status null.
    let status: number | null = null;
    let body: SubscribeResponseBody | null = null;
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: pathname, consent }),
      });
      status = res.status;
      body = (await res.json().catch(() => null)) as SubscribeResponseBody | null;
    } catch {
      status = null; // network failure / timeout
    }

    const d = decideFromResponse(status, body);
    if (d.fireConversion) {
      // Confirmed NEW subscriber only: canonical conversion event + ad platforms.
      track("signup", { source: pathname, ...attr });
      track("subscription_success", { source: pathname, ...attr });
      fireLead({ source: pathname, ...attr });
    } else {
      track(d.analyticsEvent, { source: pathname, category: d.failureCategory ?? null, ...attr });
    }

    setState(d.state);
    setMessage(d.message);
    setSubmitting(false);
  };

  return (
    <section className={compact ? "" : "card-glow p-6 lg:p-8 relative overflow-hidden"}>
      <div className="relative z-10 max-w-xl">
        <div className="flex items-center gap-2 text-accent mb-2">
          <Mail size={15} strokeWidth={1.8} />
          <span className="text-[10.5px] uppercase tracking-[0.2em]">Daily brief</span>
        </div>
        <h2 className="font-display text-[20px] lg:text-[24px] font-medium tracking-tight-2 text-ink-100 leading-snug">
          {heading ?? "Get the daily Bitcoin Cycle Brief"}
        </h2>
        <p className="mt-2 text-[13px] text-ink-300 leading-relaxed">
          {blurb ?? "One clear daily summary of where Bitcoin sits in the cycle."}
        </p>

        {!done && (
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {[
              "30-second read",
              "What changed today",
              "Historical context",
              "What to watch next",
              "No hype, no predictions",
            ].map((b) => (
              <li key={b} className="flex items-center gap-2 text-[12.5px] text-ink-300">
                <Check size={13} className="text-accent shrink-0" strokeWidth={2.4} />
                {b}
              </li>
            ))}
          </ul>
        )}

        {done ? (
          <div className="mt-5">
            <SignupConfirmation variant={state === "existing" ? "existing" : "success"} />
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
            <div className="flex gap-2 flex-wrap">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state !== "idle") setState("idle");
                }}
                placeholder="you@email.com"
                aria-label="Email address"
                aria-invalid={!!error}
                aria-describedby={error ? "brief-signup-error" : undefined}
                disabled={submitting}
                className={`flex-1 min-w-[200px] h-11 px-3.5 rounded-lg bg-white/[0.03] border text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40 transition-colors disabled:opacity-60 ${
                  error ? "border-signal-red/50" : "border-white/[0.08]"
                }`}
              />
              <button
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
                className="h-11 px-5 rounded-lg bg-accent text-ink-950 text-[13px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60"
              >
                {submitting ? "Subscribing…" : error ? "Try again" : "Subscribe free"}
              </button>
            </div>
            <label className="flex items-start gap-2 text-[11px] text-ink-400 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 accent-[#5eead4]"
              />
              <span>
                I&apos;m happy to receive the daily brief and occasional updates. No spam,
                unsubscribe anytime. See our{" "}
                <a href="/privacy" className="underline decoration-white/20 underline-offset-2 hover:text-ink-200">Privacy policy</a>.
              </span>
            </label>
          </form>
        )}
        {error && (
          <p id="brief-signup-error" role="alert" className="mt-2 flex items-center gap-1.5 text-[12px] text-signal-red">
            <AlertCircle size={13} className="shrink-0" /> {error}
          </p>
        )}
        {!done && (
          <>
            <div className="mt-3 flex items-center gap-3 flex-wrap text-[11px] text-ink-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-green live-dot relative inline-block" /> Live data
              </span>
              <span>· Free</span>
              <span>· Unsubscribe anytime</span>
            </div>
            <p className="mt-2 text-[11px] text-ink-500">
              Delivered every morning. You&apos;ll get a welcome email now, then the daily brief from
              tomorrow.
            </p>
          </>
        )}
      </div>
      {!compact && <div className="watermark">halvinglens.com · daily brief</div>}
    </section>
  );
}
