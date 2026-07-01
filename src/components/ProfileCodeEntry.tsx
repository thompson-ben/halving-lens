"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { verifyCode, requestMagicLink } from "@/lib/profileClient";
import { track } from "@/lib/track";

// Step 2 of sign-in: enter the 6-digit code from the email. Gateway-safe (no
// link needed). Shared by the inline form and the modal prompt.
export function ProfileCodeEntry({ email, next }: { email: string; next?: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/\D/g, "");
    if (clean.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await verifyCode(email, clean, next);
    if (res.ok) {
      track("profile_signin", {});
      window.location.href = res.next ?? "/profile/welcome";
      return;
    }
    setError(res.error ?? "That code isn't right.");
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-signal-green/25 bg-signal-green/[0.08] text-signal-green text-[13px]">
        <Check size={15} /> We&apos;ve emailed <span className="font-medium">{email}</span>
      </div>
      <p className="text-[13px] text-ink-300">Enter the 6-digit code from the email (or just click the link inside it).</p>
      <form onSubmit={submit} className="flex gap-2 flex-wrap">
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
          placeholder="123456"
          aria-label="6-digit sign-in code"
          className={`flex-1 min-w-[140px] h-12 px-4 rounded-xl bg-white/[0.03] border text-[18px] tracking-[0.3em] font-mono text-ink-100 placeholder:text-ink-600 focus:outline-none focus:border-accent/40 ${error ? "border-signal-red/50" : "border-white/[0.1]"}`}
        />
        <button type="submit" disabled={busy} className="h-12 px-6 rounded-xl bg-accent text-ink-950 text-[14px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {error && <p className="text-[12px] text-signal-red">{error}</p>}
      <button
        type="button"
        onClick={async () => { await requestMagicLink(email, next); setResent(true); }}
        className="text-[12px] text-ink-500 hover:text-ink-300 underline"
      >
        {resent ? "New code sent" : "Didn't get it? Resend"}
      </button>
    </div>
  );
}
