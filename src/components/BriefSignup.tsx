"use client";

import { useState } from "react";
import { Mail, Check } from "lucide-react";

// Soft email capture for the daily brief / future alerts. No backend yet — this
// validates demand. Submissions are kept in localStorage so we don't pretend to
// deliver anything we can't; wiring a real list is a follow-up.
export function BriefSignup({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) {
      setError(true);
      return;
    }
    try {
      const key = "halvinglens.brief.waitlist";
      const list = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (!list.includes(email)) list.push(email);
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      // localStorage unavailable — still show confirmation
    }
    setDone(true);
  };

  return (
    <section className={compact ? "" : "card-glow p-6 lg:p-8 relative overflow-hidden"}>
      <div className="relative z-10 max-w-xl">
        <div className="flex items-center gap-2 text-accent mb-2">
          <Mail size={15} strokeWidth={1.8} />
          <span className="text-[10.5px] uppercase tracking-[0.2em]">Daily brief</span>
        </div>
        <h2 className="font-display text-[20px] lg:text-[24px] font-medium tracking-tight-2 text-ink-100 leading-snug">
          Get the daily Bitcoin Cycle Brief
        </h2>
        <p className="mt-2 text-[13px] text-ink-300 leading-relaxed">
          One clear summary of where Bitcoin sits in the cycle — historical context, not advice.
        </p>

        {done ? (
          <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-signal-green/25 bg-signal-green/[0.08] text-signal-green text-[13px]">
            <Check size={15} /> You&apos;re on the waitlist. We&apos;ll be in touch when the brief ships.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 flex gap-2 flex-wrap">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(false);
              }}
              placeholder="you@email.com"
              aria-label="Email address"
              className={`flex-1 min-w-[200px] h-11 px-3.5 rounded-lg bg-white/[0.03] border text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40 transition-colors ${
                error ? "border-signal-red/50" : "border-white/[0.08]"
              }`}
            />
            <button
              type="submit"
              className="h-11 px-5 rounded-lg bg-accent text-ink-950 text-[13px] font-medium hover:bg-accent-soft transition-colors"
            >
              Join the waitlist
            </button>
          </form>
        )}
        {error && <p className="mt-2 text-[12px] text-signal-red">Please enter a valid email.</p>}
        <p className="mt-3 text-[11px] text-ink-500">
          No spam, no account needed. We&apos;re validating interest before building the email
          product — nothing is sent yet.
        </p>
      </div>
      {!compact && <div className="watermark">halving.lens · daily brief</div>}
    </section>
  );
}
