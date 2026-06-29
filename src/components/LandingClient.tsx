"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { track } from "@/lib/track";

// UTM + referrer for the /start landing — captured client-side and attached to
// landing + signup events so paid campaigns are attributable.
function utm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const o: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const v = p.get(k);
    if (v) o[k] = v.slice(0, 80);
  }
  return o;
}

// Fires landing_view once per session with UTM + referrer.
export function LandingAnalytics() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("hl.landing")) return;
      sessionStorage.setItem("hl.landing", "1");
    } catch {
      /* ignore */
    }
    track("landing_view", { ...utm(), ref: (typeof document !== "undefined" ? document.referrer : "").slice(0, 120) });
  }, []);
  return null;
}

// A premium CTA that records landing_cta (with which CTA + UTM) before navigating.
export function LandingCta({
  href,
  label,
  variant = "primary",
  children,
}: {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}) {
  const cls =
    variant === "primary"
      ? "bg-accent text-ink-950 hover:bg-accent-soft"
      : "border border-white/[0.12] bg-white/[0.02] text-ink-100 hover:border-accent/40";
  return (
    <a
      href={href}
      onClick={() => track("landing_cta", { cta: label, ...utm() })}
      className={`inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl text-[14px] font-medium transition-colors ${cls}`}
    >
      {children}
      <ArrowRight size={16} />
    </a>
  );
}

// Email capture tuned for the landing — posts source with UTM and fires a
// signup event tagged with the campaign.
export function StartSignup({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useRef<Record<string, string>>({});
  useEffect(() => {
    params.current = utm();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }
    setBusy(true);
    setError(null);
    const u = params.current;
    const qs = new URLSearchParams(u).toString();
    const source = qs ? `/start?${qs}` : "/start";
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, consent: true }),
      });
      if (!res.ok) throw new Error();
      track("signup", { source: "/start", ...u });
      setDone(true);
    } catch {
      try {
        const key = "halvinglens.brief.waitlist";
        const list = JSON.parse(localStorage.getItem(key) ?? "[]");
        if (!list.includes(email)) list.push(email);
        localStorage.setItem(key, JSON.stringify(list));
      } catch {
        /* ignore */
      }
      track("signup", { source: "/start", ...u });
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-signal-green/25 bg-signal-green/[0.08] text-signal-green text-[14px]">
        <Check size={16} /> You&apos;re in. Tomorrow&apos;s research lands in your inbox.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`flex gap-2 flex-wrap ${compact ? "" : "max-w-md"}`}>
      <input
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError(null); }}
        placeholder="you@email.com"
        aria-label="Email address"
        className={`flex-1 min-w-[200px] h-12 px-4 rounded-xl bg-white/[0.03] border text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40 ${error ? "border-signal-red/50" : "border-white/[0.1]"}`}
      />
      <button type="submit" disabled={busy} className="h-12 px-6 rounded-xl bg-accent text-ink-950 text-[14px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60">
        {busy ? "Joining…" : "Get today's free research"}
      </button>
      {error && <p className="w-full text-[12px] text-signal-red">{error}</p>}
    </form>
  );
}
