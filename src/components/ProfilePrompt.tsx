"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { track } from "@/lib/track";

// "Create your HalvingLens Profile" — the magic-link request, framed as
// unlocking a personalised experience, never as registration. Shown only when a
// visitor reaches for a personal feature; browsing never requires it.
export function ProfilePrompt({
  open,
  onClose,
  next,
  reason = "Save your progress across all your devices.",
}: {
  open: boolean;
  onClose: () => void;
  next?: string;
  reason?: string;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await fetch("/api/profile/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next: next ?? (typeof window !== "undefined" ? window.location.pathname : "/dashboard") }),
      });
      track("profile_request", {});
      setSent(true);
    } catch {
      setSent(true); // never reveal failure
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="card-glow rounded-2xl p-6 sm:p-7 max-w-md w-full relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-ink-500 hover:text-ink-200">
          <X size={18} />
        </button>

        {sent ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-signal-green/25 bg-signal-green/[0.08] text-signal-green text-[14px]">
              <Check size={16} /> Check your inbox
            </div>
            <p className="mt-4 text-[13px] text-ink-400 leading-relaxed">
              We&apos;ve sent a secure sign-in link to <span className="text-ink-200">{email}</span>. Click it to unlock
              your HalvingLens Profile — it expires in an hour.
            </p>
          </div>
        ) : (
          <>
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-[#d9b96a]">Your HalvingLens Profile</div>
            <h2 className="mt-2 font-display text-[22px] text-ink-50 leading-snug">{reason}</h2>
            <p className="mt-2 text-[13px] text-ink-400">Create your free HalvingLens Profile — it takes one click.</p>
            <ul className="mt-4 space-y-1.5">
              {["No password", "No username", "One-click secure sign in"].map((b) => (
                <li key={b} className="flex items-center gap-2 text-[13px] text-ink-300">
                  <Check size={14} className="text-signal-green shrink-0" /> {b}
                </li>
              ))}
            </ul>
            <form onSubmit={submit} className="mt-5 space-y-2.5">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="you@email.com"
                aria-label="Email address"
                className={`w-full h-11 px-3.5 rounded-lg bg-white/[0.03] border text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40 ${error ? "border-signal-red/50" : "border-white/[0.1]"}`}
              />
              <button type="submit" disabled={busy} className="w-full h-11 rounded-lg bg-accent text-ink-950 text-[14px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60">
                {busy ? "Sending…" : "Email me a secure sign-in link"}
              </button>
              {error && <p className="text-[12px] text-signal-red">{error}</p>}
            </form>
            <p className="mt-3 text-[11px] text-ink-500">Browsing never requires a profile — this just saves your progress across devices.</p>
          </>
        )}
      </div>
    </div>
  );
}
