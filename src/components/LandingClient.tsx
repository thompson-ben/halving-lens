"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { track } from "@/lib/track";
import { getAttribution } from "@/lib/attribution";
import { assignVariant, getVariant } from "@/lib/experiments";

const GOLD = "#d9b96a";

// A/B headline variants for the landing hero (config in experiments.ts).
const HEADLINES: Record<string, string> = {
  a: "The clearest view of the Bitcoin cycle.",
  b: "Know where Bitcoin sits — before you check the price.",
};

// Hero with stable A/B headline + first landing_view (variant + attribution).
export function LandingHero() {
  const [variant, setVariant] = useState("a");
  const fired = useRef(false);
  useEffect(() => {
    const v = assignVariant("start_headline");
    setVariant(v);
    if (!fired.current) {
      fired.current = true;
      track("landing_view", { variant: v, ...getAttribution() });
    }
  }, []);

  return (
    <section className="pt-6 text-center max-w-3xl mx-auto">
      <div className="text-[10.5px] uppercase tracking-[0.24em] mb-5" style={{ color: GOLD }}>HalvingLens Research</div>
      <h1 className="font-display text-[40px] sm:text-[60px] font-medium tracking-tightest text-ink-50 leading-[1.03]">
        {HEADLINES[variant] ?? HEADLINES.a}
      </h1>
      <p className="mt-6 text-[16px] sm:text-[18px] text-ink-300 leading-relaxed max-w-xl mx-auto">
        Understand today&apos;s Bitcoin market in under 60 seconds. No hype. No predictions. Just historical context.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
        <LandingCta href="#signup" label="hero_primary" variant={variant}>Get today&apos;s free research</LandingCta>
        <LandingCta href="/accumulation" label="hero_secondary" variant={variant} kind="secondary">Explore today&apos;s analysis</LandingCta>
      </div>
    </section>
  );
}

export function LandingCta({
  href,
  label,
  kind = "primary",
  variant,
  children,
}: {
  href: string;
  label: string;
  kind?: "primary" | "secondary";
  variant?: string;
  children: React.ReactNode;
}) {
  const cls =
    kind === "primary"
      ? "bg-accent text-ink-950 hover:bg-accent-soft"
      : "border border-white/[0.12] bg-white/[0.02] text-ink-100 hover:border-accent/40";
  return (
    <a
      href={href}
      onClick={() => track("landing_cta", { cta: label, variant: variant ?? getVariant("start_headline"), ...getAttribution() })}
      className={`inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl text-[14px] font-medium transition-colors ${cls}`}
    >
      {children}
      <ArrowRight size={16} />
    </a>
  );
}

// Email capture tuned for the landing — first-touch attribution + A/B variant
// ride along on the signup event.
export function StartSignup() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
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
    const attr = getAttribution();
    const qs = new URLSearchParams(attr).toString();
    const source = qs ? `/start?${qs}` : "/start";
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, consent: true }),
      });
      if (!res.ok) throw new Error();
    } catch {
      try {
        const key = "halvinglens.brief.waitlist";
        const list = JSON.parse(localStorage.getItem(key) ?? "[]");
        if (!list.includes(email)) list.push(email);
        localStorage.setItem(key, JSON.stringify(list));
      } catch {
        /* ignore */
      }
    } finally {
      track("signup", { source: "/start", variant: getVariant("start_headline"), ...attr });
      setDone(true);
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
    <form onSubmit={submit} className="flex gap-2 flex-wrap max-w-md">
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
