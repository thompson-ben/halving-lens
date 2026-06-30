"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { track } from "@/lib/track";

// Inline "create / sign in to your HalvingLens Profile" form (non-modal), used
// on the /profile page. Same magic-link request, framed as unlocking access.
export function ProfileSignInForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ email, next: next ?? "/profile/welcome" }),
      });
      track("profile_request", {});
    } catch {
      /* never reveal */
    } finally {
      setSent(true);
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-2.5">
        <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-signal-green/25 bg-signal-green/[0.08] text-signal-green text-[14px]">
          <Check size={16} /> Check your inbox for a secure sign-in link.
        </div>
        <p className="text-[12px] text-ink-400">It expires in an hour and works once. Add brief@halvinglens.com to your contacts so it lands.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2.5 max-w-md">
      <ul className="space-y-1.5 mb-3">
        {["No password", "No username", "One-click secure sign in"].map((b) => (
          <li key={b} className="flex items-center gap-2 text-[13px] text-ink-300">
            <Check size={14} className="text-signal-green shrink-0" /> {b}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 flex-wrap">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          placeholder="you@email.com"
          aria-label="Email address"
          className={`flex-1 min-w-[200px] h-12 px-4 rounded-xl bg-white/[0.03] border text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40 ${error ? "border-signal-red/50" : "border-white/[0.1]"}`}
        />
        <button type="submit" disabled={busy} className="h-12 px-6 rounded-xl bg-accent text-ink-950 text-[14px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60">
          {busy ? "Sending…" : "Email me a sign-in link"}
        </button>
      </div>
      {error && <p className="text-[12px] text-signal-red">{error}</p>}
    </form>
  );
}

export function SignOutButton() {
  return (
    <button
      onClick={async () => {
        await fetch("/api/profile/signout", { method: "POST" });
        window.location.href = "/";
      }}
      className="inline-flex items-center px-3.5 py-2 rounded-lg border border-white/[0.1] text-[12.5px] text-ink-400 hover:text-ink-100 hover:border-accent/30 transition-colors"
    >
      Sign out
    </button>
  );
}
