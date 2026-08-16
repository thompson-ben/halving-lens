import Link from "next/link";
import { Check, X } from "lucide-react";
import { FreeHero, LandingCta, StartSignup } from "@/components/LandingClient";
import { DailyBriefPreview } from "@/components/DailyBriefPreview";
import { TodaysConfigurationStrip } from "@/components/TodaysConfigurationStrip";
import { SocialProof } from "@/components/SocialProof";
import { Testimonials } from "@/components/Testimonials";
import { libraryStats } from "@/lib/research";
import { FOUNDING_MEMBER_LIMIT } from "@/lib/entitlements";

// /free — the paid-acquisition (Meta) landing. Conversion-first: capture is
// above the fold (FreeHero), the actual daily brief is shown (DailyBriefPreview),
// and there is no leave-the-site route before the first signup. Kept out of the
// organic sitemap and marked noindex (paid entry point, not organic content).

const DESC =
  "Free daily Bitcoin cycle research — know where Bitcoin sits in its cycle in about thirty seconds. No hype, no predictions, no price targets. Always free.";
export const metadata = {
  title: "Free Bitcoin Cycle Research",
  description: DESC,
  alternates: { canonical: "/free" },
  robots: { index: false, follow: true }, // paid landing — keep out of organic index
  openGraph: { title: "Know where Bitcoin sits in its cycle.", description: DESC, url: "/free", type: "website" },
  twitter: { card: "summary_large_image", title: "Know where Bitcoin sits in its cycle.", description: DESC },
};

const GOLD = "#d9b96a";

export default function FreePage() {
  const stats = libraryStats();

  return (
    <div className="space-y-20 sm:space-y-24">
      <FreeHero previewHref="#preview" />

      {/* Live proof before promises: today's configuration, computed — the
          deterministic trust moment (linkless: no route away pre-signup). */}
      <TodaysConfigurationStrip />

      {/* The actual product — a live example of tomorrow's brief */}
      <section id="preview" className="scroll-mt-24">
        <DailyBriefPreview />
      </section>

      {/* Self-evidencing proof, directly under the product it evidences.
          This strip renders unconditionally, so the page always carries a
          trust layer even while SocialProof/Testimonials are below their
          honest render thresholds. */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
          <Proof label="Research editions" value={stats.total > 0 ? `${stats.total}` : "Daily"} />
          <Proof label="Years of history analysed" value="13+" />
          <Proof label="Cost, forever" value="Free" />
          <Proof label="Predictions made" value="0" />
        </div>
        <p className="mt-3 text-center text-[11.5px] text-ink-500">
          Every figure traces to public data —{" "}
          <Link href="/methodology" className="underline decoration-white/20 underline-offset-2 hover:text-ink-300">
            here&apos;s how it&apos;s made
          </Link>
          .
        </p>
      </section>

      {/* What you get, free */}
      <section>
        <SectionLabel>What you get — free, every day</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { t: "Morning Research Brief", d: "The day's one thing that matters, in a 30-second read." },
            // Programme 1 (continuity): the Cycle Dashboard is the Brief's own
            // destination and the day-3 onboarding product — it belonged here.
            { t: "Cycle Dashboard", d: "The whole checked market, open at any hour — the working behind the brief." },
            { t: "Accumulation Index", d: "How attractive today is versus Bitcoin's whole history." },
            { t: "Similar Moments", d: "The historical moments today most resembles." },
            { t: "Weekly Research", d: "A deeper report every Sunday, in context." },
            { t: "Original Research Findings", d: "Citable, evidence-first studies of Bitcoin's history." },
            { t: "Permanent archive", d: "Every edition, searchable and dated forever." },
          ].map((s) => (
            <div key={s.t} className="card p-5">
              <div className="flex items-start gap-2.5">
                <Check size={16} className="text-signal-green shrink-0 mt-0.5" />
                <div>
                  <div className="text-[14px] font-medium text-ink-100">{s.t}</div>
                  <div className="text-[12.5px] text-ink-400 mt-0.5">{s.d}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why different */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-6">
          <div className="text-[12px] uppercase tracking-[0.16em] text-ink-500 mb-4">Most crypto content</div>
          {["Price predictions", "Hype and fear", "Opinions", "Paywalls"].map((x) => (
            <div key={x} className="flex items-center gap-2.5 py-2 text-[14px] text-ink-400">
              <X size={15} className="text-signal-red shrink-0" /> {x}
            </div>
          ))}
        </div>
        <div className="card p-6" style={{ borderColor: "rgba(217,185,106,0.25)" }}>
          <div className="text-[12px] uppercase tracking-[0.16em] mb-4" style={{ color: GOLD }}>HalvingLens</div>
          {["Historical context", "Evidence, not opinions", "Calm and professional", "Always free"].map((x) => (
            <div key={x} className="flex items-center gap-2.5 py-2 text-[14px] text-ink-100">
              <Check size={15} className="text-signal-green shrink-0" /> {x}
            </div>
          ))}
        </div>
      </section>

      {/* Reader testimonials — renders only once approved ones exist */}
      <Testimonials />

      {/* Email capture */}
      <section id="signup" className="card-glow p-7 sm:p-10 text-center scroll-mt-24">
        <h2 className="font-display text-[26px] sm:text-[34px] font-medium tracking-tight-2 text-ink-50 leading-tight">
          Get tomorrow&apos;s brief, free.
        </h2>
        <p className="mt-3 text-[14px] text-ink-300 max-w-lg mx-auto">
          One clear Bitcoin cycle update each morning — historical context instead of hype. Unsubscribe anytime.
        </p>
        <div className="mt-6 flex justify-center">
          <StartSignup source="/free" buttonLabel="Get my free brief" />
        </div>
        <div className="mt-4 flex justify-center">
          <SocialProof />
        </div>
        {/* Founding Members — one honest line, one offer, one action (no
            competing CTA; the same signup earns the place). */}
        <p className="mt-4 text-[12px] text-ink-400 max-w-lg mx-auto leading-relaxed">
          Subscribing now also reserves your place among the first{" "}
          {FOUNDING_MEMBER_LIMIT.toLocaleString()} Founding Members — permanent status, recognised in the{" "}
          <Link href="/founders" className="text-accent">Hall of Founders</Link>.
        </p>
        <p className="mt-3 text-[11px] text-ink-500">
          100% free · No hype or predictions · Unsubscribe anytime ·{" "}
          <Link href="/privacy" className="underline decoration-white/20 underline-offset-2 hover:text-ink-300">Privacy</Link>
        </p>
      </section>

      {/* FAQ */}
      <section>
        <SectionLabel>Questions</SectionLabel>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <div key={f.q} className="card p-5">
              <div className="text-[14px] font-medium text-ink-100">{f.q}</div>
              <p className="mt-1.5 text-[13.5px] text-ink-300 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center pb-6">
        <h2 className="font-display text-[24px] sm:text-[32px] font-medium tracking-tight-2 text-ink-100 leading-tight max-w-2xl mx-auto">
          The clearest view of the Bitcoin cycle — and it costs nothing.
        </h2>
        <div className="mt-6 flex justify-center">
          <LandingCta href="#signup" label="final_primary" source="/free">Get my free brief</LandingCta>
        </div>
        {/* The beginner exit (audit R8) — a retained learner beats a bounce.
            Below the final CTA so it never competes with the primary action. */}
        <p className="mt-8 text-[12.5px] text-ink-400">
          New to Bitcoin?{" "}
          <Link href="/start-here" className="text-accent">Start here</Link> — a calm introduction, no
          jargon.
        </p>
        <p className="mt-6 text-[11px] text-ink-500">Historical context. Not prediction. No price targets. Not financial advice.</p>
      </section>
    </div>
  );
}

const FAQ = [
  { q: "Is it really free?", a: "Yes — the daily research brief, the weekly report and the full archive are completely free. We may add an optional premium tier later, but the core read stays free." },
  { q: "Is this financial advice?", a: "No. Everything is educational historical context — no advice, no predictions, no price targets." },
  { q: "Who is it for?", a: "Long-term Bitcoin investors who want calm evidence and context instead of hype and noise." },
  { q: "How often will you email me?", a: "A short Morning Research Brief each day, plus a deeper Weekly Research report on Sundays. Unsubscribe in one click anytime." },
  { q: "Where does the data come from?", a: "Public market and on-chain sources, refreshed daily. Every figure traces to real data — nothing is fabricated." },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10.5px] uppercase tracking-[0.22em] mb-5" style={{ color: GOLD }}>{children}</div>;
}
function Proof({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-6 text-center">
      <div className="font-display text-[26px] text-ink-50">{value}</div>
      <div className="mt-1 text-[10.5px] uppercase tracking-[0.14em] text-ink-400">{label}</div>
    </div>
  );
}
