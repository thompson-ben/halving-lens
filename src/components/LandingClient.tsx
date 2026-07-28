"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/track";
import { getAttribution } from "@/lib/attribution";
import { assignVariant, getVariant } from "@/lib/experiments";
import { fireLead } from "@/lib/marketing";
import { decideFromResponse, type SubscribeResponseBody, type UiState } from "@/lib/subscription";
import { DEFAULT_FREE_HEADLINE, resolveFreeHeadline, type FreeHeadline } from "@/lib/freeHeadlines";
import { SignupConfirmation } from "./SignupConfirmation";

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

// Above-the-fold hero for the paid /free landing: headline + what/when/how-long
// + the email field itself (no scroll-to-find), honest reassurance, and a
// stay-on-page "see a sample" anchor instead of a leave-the-site secondary CTA
// (P1.1/P1.3/P1.4). Fires landing_view so /free's funnel is measured separately.
// Mobile vertical rhythm is deliberately tight so the email field AND button
// clear the effective fold on small phones (measured down to 360x640 with
// browser chrome); delivery expectations live in the reassurance row below the
// form rather than above it.
// Message match: the CURRENT visit's utm_content (the ad just clicked — not
// first-touch attribution, which can be an older ad) resolves against the
// allowlisted headline map so the hero repeats the clicked ad's promise; the
// resolved key rides on landing_view for per-creative measurement.
export function FreeHero({ previewHref = "#preview" }: { previewHref?: string }) {
  const [copy, setCopy] = useState<FreeHeadline>(DEFAULT_FREE_HEADLINE);
  const fired = useRef(false);
  useEffect(() => {
    const utmContent = new URLSearchParams(window.location.search).get("utm_content");
    const resolved = resolveFreeHeadline(utmContent);
    setCopy(resolved.copy);
    if (!fired.current) {
      fired.current = true;
      track("landing_view", { variant: "free", source: "/free", headline: resolved.key, ...getAttribution() });
    }
  }, []);

  return (
    <section className="pt-2 sm:pt-6 max-w-2xl mx-auto text-center">
      <div className="text-[10.5px] uppercase tracking-[0.24em] mb-3 sm:mb-5" style={{ color: GOLD }}>Free · daily Bitcoin research</div>
      <h1 className="font-display text-[34px] sm:text-[56px] font-medium tracking-tightest text-ink-50 leading-[1.04]">
        {copy.headline}
      </h1>
      <p className="mt-4 sm:mt-5 text-[15px] sm:text-[17px] text-ink-300 leading-relaxed max-w-xl mx-auto">
        {copy.sub ?? DEFAULT_FREE_HEADLINE.sub}
      </p>

      <div className="mt-5 sm:mt-7 flex justify-center">
        <StartSignup source="/free" buttonLabel="Get today’s free brief" />
      </div>

      {/* Honest reassurance + delivery expectations — no urgency, no inflated claims */}
      <div className="mt-4 flex items-center justify-center gap-x-3 gap-y-1.5 flex-wrap text-[11px] text-ink-400">
        <span>Free forever</span>
        <span aria-hidden>·</span>
        <span>No hype or predictions</span>
        <span aria-hidden>·</span>
        <span>Arrives ~8am UK</span>
        <span aria-hidden>·</span>
        <span>60-second read</span>
        <span aria-hidden>·</span>
        <span>Unsubscribe anytime</span>
        <span aria-hidden>·</span>
        <a href="/privacy" className="underline decoration-white/20 underline-offset-2 hover:text-ink-200">Privacy</a>
      </div>

      {/* Stay-on-page: inspect the product without navigating away */}
      <div className="mt-6">
        <a href={previewHref} className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-300 hover:text-accent transition-colors">
          See a sample brief <ArrowRight size={14} className="rotate-90" />
        </a>
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
// ride along on the conversion event. Success shows ONLY when the server
// confirms durable capture; failures show a retryable error and keep the email.
export function StartSignup({ source = "/start", buttonLabel = "Get today's free research", variant: variantOverride }: { source?: string; buttonLabel?: string; variant?: string } = {}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<UiState | "idle">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const done = state === "success" || state === "existing";
  const error = state === "invalid" || state === "rate_limited" || state === "error" ? message : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return; // prevent duplicate submissions while in-flight
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("invalid");
      setMessage("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    setMessage(null);

    const attr = getAttribution();
    const qs = new URLSearchParams(attr).toString();
    const srcWithAttr = qs ? `${source}?${qs}` : source;
    const variant = variantOverride ?? (source === "/start" ? getVariant("start_headline") : "free");
    track("subscription_submit_attempt", { source, variant, ...attr });

    let status: number | null = null;
    let respBody: SubscribeResponseBody | null = null;
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: srcWithAttr, consent: true }),
      });
      status = res.status;
      respBody = (await res.json().catch(() => null)) as SubscribeResponseBody | null;
    } catch {
      status = null; // network failure / timeout
    }

    const d = decideFromResponse(status, respBody);
    // One analytics event per outcome — `signup` on a confirmed new
    // subscriber, else the failure/existing event (see BriefSignup).
    if (d.fireConversion) {
      track(d.analyticsEvent, { source, variant, ...attr });
      fireLead({ source, variant, ...attr });
    } else {
      track(d.analyticsEvent, { source, variant, category: d.failureCategory ?? null, ...attr });
    }

    setState(d.state);
    setMessage(d.message);
    setBusy(false);
  };

  if (done) {
    return <SignupConfirmation variant={state === "existing" ? "existing" : "success"} />;
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md" noValidate>
      <input
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (state !== "idle") setState("idle"); }}
        placeholder="you@email.com"
        aria-label="Email address"
        aria-invalid={!!error}
        aria-describedby={error ? "start-signup-error" : undefined}
        disabled={busy}
        className={`w-full sm:flex-1 sm:min-w-0 h-12 px-4 rounded-xl bg-white/[0.03] border text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40 disabled:opacity-60 ${error ? "border-signal-red/50" : "border-white/[0.1]"}`}
      />
      <button type="submit" disabled={busy} aria-busy={busy} className="w-full sm:w-auto h-12 px-6 rounded-xl bg-accent text-ink-950 text-[14px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60 shrink-0">
        {busy ? "Subscribing…" : error ? "Try again" : buttonLabel}
      </button>
      {error && <p id="start-signup-error" role="alert" className="w-full text-[12px] text-signal-red">{error}</p>}
    </form>
  );
}
