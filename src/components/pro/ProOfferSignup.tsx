"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { track } from "@/lib/track";
import { getAttribution } from "@/lib/attribution";
import {
  decideProWaitlist,
  PRO_OFFER_VERSION,
  PRO_SOURCE_OFFER_PAGE,
  type ProWaitlistResponseBody,
  type ProUiState,
} from "@/lib/proWaitlist";

// /pro offer page — the waitlist form and CTA buttons (Sep 2026).
//
// Reuses the EXISTING waitlist machinery end to end: the same
// /api/pro-waitlist capture (capture-first, idempotent duplicate handling,
// suppression and the confirmation flow all live server-side and are
// untouched), the same decision contract (success only on confirmed durable
// capture), and the same event discipline:
//   · pro_waitlist_join fires ONLY on a confirmed NEW capture ("created"),
//     carrying source + the offer version shown + first-touch attribution —
//     a join is interest after seeing the proposed price, NEVER a purchase
//     or price acceptance;
//   · an EXISTING member re-submitting fires pro_waitlist_existing instead
//     (separately counted, no attribution props — their original first-touch
//     record stays exactly as it was);
//   · CTA clicks fire pro_offer_cta with their placement. No email address
//     ever reaches analytics.

export function ProOfferCta({ placement, targetId, children, className }: {
  placement: string;
  targetId: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={`#${targetId}`}
      className={className}
      onClick={() => track("pro_offer_cta", { placement, offer: PRO_OFFER_VERSION })}
    >
      {children}
    </a>
  );
}

export function ProOfferSignup() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<ProUiState | "idle">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const done = state === "success" || state === "existing";
  const error = state === "invalid" || state === "rate_limited" || state === "error" ? message : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    track("pro_offer_cta", { placement: "form", offer: PRO_OFFER_VERSION });
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
        body: JSON.stringify({ email, source: PRO_SOURCE_OFFER_PAGE }),
      });
      status = res.status;
      body = (await res.json().catch(() => null)) as ProWaitlistResponseBody | null;
    } catch {
      status = null;
    }
    const d = decideProWaitlist(status, body);
    // Confirmed NEW capture only — never a purchase, never a price acceptance.
    if (d.fireJoin) track("pro_waitlist_join", { source: PRO_SOURCE_OFFER_PAGE, offer: PRO_OFFER_VERSION, ...getAttribution() });
    if (d.state === "existing") track("pro_waitlist_existing", { source: PRO_SOURCE_OFFER_PAGE, offer: PRO_OFFER_VERSION });
    setState(d.state);
    setMessage(d.state === "existing" ? "You're already on the Pro waitlist — no need to join again." : d.message);
    setSubmitting(false);
  };

  return (
    <div>
      {done ? (
        <p className="text-body text-ink-100" role="status">
          {message}
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-2.5" noValidate>
          <div className="flex flex-col sm:flex-row gap-3">
            <label htmlFor="pro-offer-email" className="sr-only">
              Email address for the Pro waitlist
            </label>
            <input
              id="pro-offer-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state !== "idle") setState("idle");
              }}
              placeholder="you@email.com"
              aria-invalid={!!error}
              aria-describedby={error ? "pro-offer-error" : undefined}
              disabled={submitting}
              className={`w-full sm:flex-1 sm:min-w-0 h-11 px-3.5 rounded-lg bg-white/[0.03] border text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-editorial/40 transition-colors disabled:opacity-60 ${
                error ? "border-signal-red/50" : "border-white/[0.08]"
              }`}
            />
            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="w-full sm:w-auto h-11 px-5 rounded-lg bg-accent text-[#15120a] text-[13.5px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0"
            >
              {submitting ? "Joining…" : error ? "Try again" : "Join the Pro waitlist"}
            </button>
          </div>
          <p className="text-micro text-ink-500 leading-relaxed">
            Free to join. No payment details or commitment required — and this joins nothing else. We&apos;ll
            confirm your place by email, then email you again when Pro opens, with the final features and
            price confirmed before you decide. See our{" "}
            <a href="/privacy" className="underline decoration-white/20 underline-offset-2 hover:text-ink-300">
              Privacy policy
            </a>
            .
          </p>
        </form>
      )}
      {error && (
        <p id="pro-offer-error" role="alert" className="mt-2 flex items-center gap-1.5 text-caption text-signal-red">
          <AlertCircle size={13} className="shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
