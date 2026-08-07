"use client";

import { useState } from "react";
import { Bell, AlertCircle } from "lucide-react";
import { track } from "@/lib/track";
import { getAttribution } from "@/lib/attribution";
import { fireLead } from "@/lib/marketing";
import { decideFromResponse, type SubscribeResponseBody, type UiState } from "@/lib/subscription";

// HalvingLens Pro early-access capture (CD2) — a demand-validation seam,
// not a product. Explicitly a FUTURE feature: no payment, no gating, and
// the Lens above stays fully usable without it.
//
// Reuses the existing durable signup machinery end-to-end (/api/subscribe,
// the subscription decision contract, the canonical analytics events) with
// a distinct source so Pro interest is measurable as its own cohort. The
// consent copy is honest that joining also starts the free Daily Brief —
// this deliberately creates no second identity or storage system; a
// dedicated Pro list can supersede the source tag when Pro is real.
const SOURCE = "/cycle-dashboard#pro-early-access";

export function ProEarlyAccess() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<UiState | "idle">("idle");
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
    const attr = getAttribution();
    track("subscription_submit_attempt", { source: SOURCE, ...attr });
    let status: number | null = null;
    let body: SubscribeResponseBody | null = null;
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: SOURCE, consent: true }),
      });
      status = res.status;
      body = (await res.json().catch(() => null)) as SubscribeResponseBody | null;
    } catch {
      status = null;
    }
    const d = decideFromResponse(status, body);
    if (d.fireConversion) {
      track(d.analyticsEvent, { source: SOURCE, ...attr });
      fireLead({ source: SOURCE, ...attr });
    } else {
      track(d.analyticsEvent, { source: SOURCE, category: d.failureCategory ?? null, ...attr });
    }
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
          Pro will notify you when Bitcoin enters a historically meaningful state — the moment a
          reading like the one above first becomes true, not weeks later. It doesn&apos;t exist yet;
          this list is how we decide to build it.
        </p>
        {done ? (
          <p className="mt-4 text-body text-ink-100">
            You&apos;re on the early-access list — we&apos;ll email you when Pro opens.
          </p>
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
                {submitting ? "Joining…" : error ? "Try again" : "Join Pro early access"}
              </button>
            </div>
            <p className="text-micro text-ink-500 leading-relaxed">
              Early access only — nothing to pay now. Joining also starts the free Daily Brief
              (unsubscribe anytime).
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
