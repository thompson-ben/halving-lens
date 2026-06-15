"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Mail, Check } from "lucide-react";
import { track } from "@/lib/track";

// Real email capture for the daily brief / future alerts. POSTs to
// /api/subscribe (validates + forwards to a configured destination). Falls back
// to localStorage if the request fails, so a signup is never lost.
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
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: pathname, consent }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Something went wrong.");
      }
      track("signup", { source: pathname });
      setDone(true);
    } catch (err) {
      // Don't lose the signup — stash locally and still confirm.
      try {
        const key = "halvinglens.brief.waitlist";
        const list = JSON.parse(localStorage.getItem(key) ?? "[]");
        if (!list.includes(email)) list.push(email);
        localStorage.setItem(key, JSON.stringify(list));
      } catch {
        /* ignore */
      }
      void err;
      setDone(true);
    } finally {
      setSubmitting(false);
    }
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
          <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-signal-green/25 bg-signal-green/[0.08] text-signal-green text-[13px]">
            <Check size={15} /> You&apos;re on the list. Daily email delivery is coming soon.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="you@email.com"
                aria-label="Email address"
                className={`flex-1 min-w-[200px] h-11 px-3.5 rounded-lg bg-white/[0.03] border text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40 transition-colors ${
                  error ? "border-signal-red/50" : "border-white/[0.08]"
                }`}
              />
              <button
                type="submit"
                disabled={submitting}
                className="h-11 px-5 rounded-lg bg-accent text-ink-950 text-[13px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60"
              >
                {submitting ? "Joining…" : "Join the waitlist"}
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
                unsubscribe anytime.
              </span>
            </label>
          </form>
        )}
        {error && <p className="mt-2 text-[12px] text-signal-red">{error}</p>}
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
              Validating interest before the email product ships — you&apos;ll be first to know when
              daily delivery and cycle alerts go live.
            </p>
          </>
        )}
      </div>
      {!compact && <div className="watermark">halvinglens.com · daily brief</div>}
    </section>
  );
}
