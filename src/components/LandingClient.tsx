"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { track } from "@/lib/track";
import { getAttribution } from "@/lib/attribution";
import { assignVariant, getVariant } from "@/lib/experiments";
import { fireLead } from "@/lib/marketing";

const GOLD = "#d9b96a";

// A/B headline variants for the landing hero (config in experiments.ts).
const HEADLINES: Record<string, string> = {
  a: "The clearest view of the Bitcoin cycle.",
  b: "Know where Bitcoin sits — before you check the price.",
};

// Hero with stable A/B headline + first landing_view (variant + attribution).
// `source` tags the funnel (e.g. "/start" vs "/free") so each landing's
// conversion can be measured separately. A custom `headline`/`sub` skips the
// /start A/B (so a different landing doesn't pollute that experiment).
export function LandingHero({
  source = "/start",
  headline,
  sub,
  eyebrow = "HalvingLens Research",
}: {
  source?: string;
  headline?: string;
  sub?: string;
  eyebrow?: string;
}) {
  const [variant, setVariant] = useState(headline ? "free" : "a");
  const fired = useRef(false);
  useEffect(() => {
    const v = headline ? "free" : assignVariant("start_headline");
    setVariant(v);
    if (!fired.current) {
      fired.current = true;
      track("landing_view", { variant: v, source, ...getAttribution() });
    }
  }, [headline, source]);

  return (
    <section className="pt-6 text-center max-w-3xl mx-auto">
      <div className="text-[10.5px] uppercase tracking-[0.24em] mb-5" style={{ color: GOLD }}>{eyebrow}</div>
      <h1 className="font-display text-[40px] sm:text-[60px] font-medium tracking-tightest text-ink-50 leading-[1.03]">
        {headline ?? HEADLINES[variant] ?? HEADLINES.a}
      </h1>
      <p className="mt-6 text-[16px] sm:text-[18px] text-ink-300 leading-relaxed max-w-xl mx-auto">
        {sub ?? "Understand today's Bitcoin market in under 60 seconds. No hype. No predictions. Just historical context."}
      </p>
      <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
        <LandingCta href="#signup" label="hero_primary" variant={variant} source={source}>Get today&apos;s free research</LandingCta>
        <LandingCta href="/accumulation" label="hero_secondary" variant={variant} source={source} kind="secondary">Explore today&apos;s analysis</LandingCta>
      </div>
    </section>
  );
}

export function LandingCta({
  href,
  label,
  kind = "primary",
  variant,
  source = "/start",
  children,
}: {
  href: string;
  label: string;
  kind?: "primary" | "secondary";
  variant?: string;
  source?: string;
  children: React.ReactNode;
}) {
  const cls =
    kind === "primary"
      ? "bg-accent text-ink-950 hover:bg-accent-soft"
      : "border border-white/[0.12] bg-white/[0.02] text-ink-100 hover:border-accent/40";
  return (
    <a
      href={href}
      onClick={() => track("landing_cta", { cta: label, variant: variant ?? getVariant("start_headline"), source, ...getAttribution() })}
      className={`inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl text-[14px] font-medium transition-colors ${cls}`}
    >
      {children}
      <ArrowRight size={16} />
    </a>
  );
}

// Email capture tuned for the landing — first-touch attribution + A/B variant
// ride along on the signup event.
export function StartSignup({ source = "/start", buttonLabel = "Get today's free research" }: { source?: string; buttonLabel?: string } = {}) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Once signed up, send them into the app (home) so they get the full site menu
  // — the paid landings are deliberately chrome-free. They read the confirmation
  // for a moment first; the button lets them go immediately.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => { window.location.assign("/"); }, 3500);
    return () => clearTimeout(t);
  }, [done]);

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
    const srcWithAttr = qs ? `${source}?${qs}` : source;
    const variant = source === "/start" ? getVariant("start_headline") : "free";
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: srcWithAttr, consent: true }),
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
      track("signup", { source, variant, ...attr });
      fireLead({ source, variant, ...attr });
      setDone(true);
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-signal-green/25 bg-signal-green/[0.08] text-signal-green text-[14px]">
          <Check size={16} /> You&apos;re in — check your inbox for a welcome email.
        </div>
        <p className="text-[12px] text-ink-400 leading-relaxed max-w-md">
          If it&apos;s not in your inbox, check your spam or junk folder and add{" "}
          <span className="text-ink-200">brief@halvinglens.com</span> to your contacts so you don&apos;t miss
          tomorrow&apos;s research.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-accent text-ink-950 text-[14px] font-medium hover:bg-accent-soft transition-colors"
        >
          Enter HalvingLens <ArrowRight size={16} />
        </a>
        <p className="text-[11px] text-ink-500">Taking you there automatically…</p>
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
        {busy ? "Subscribing…" : buttonLabel}
      </button>
      {error && <p className="w-full text-[12px] text-signal-red">{error}</p>}
    </form>
  );
}
