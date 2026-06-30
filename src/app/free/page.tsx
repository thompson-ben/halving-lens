import Link from "next/link";
import { ArrowUpRight, Check, X } from "lucide-react";
import { LandingHero, LandingCta, StartSignup } from "@/components/LandingClient";
import { editionContent } from "@/lib/emailBrief";
import { sentimentRead, SENTIMENT_AVAILABLE } from "@/lib/sentiment";
import { libraryStats } from "@/lib/research";

// /free — the paid-acquisition (Meta) landing. Conversion-first, "free" as the
// hook. Its own funnel attribution (source="/free") so its conversion can be
// compared against /start. Kept out of organic sitemap (paid entry point).

const DESC =
  "Free daily Bitcoin cycle research — understand where Bitcoin sits today in under 60 seconds. No hype, no predictions, no price targets. Always free.";
export const metadata = {
  title: "Free Bitcoin Cycle Research — HalvingLens",
  description: DESC,
  alternates: { canonical: "/free" },
  openGraph: { title: "Free Bitcoin cycle research, every morning.", description: DESC, url: "/free", type: "website" },
  twitter: { card: "summary_large_image", title: "Free Bitcoin cycle research, every morning.", description: DESC },
};

const GOLD = "#d9b96a";

export default function FreePage() {
  const e = editionContent();
  const sr = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  const stats = libraryStats();

  return (
    <div className="space-y-20 sm:space-y-24">
      <LandingHero
        source="/free"
        eyebrow="Free · daily Bitcoin research"
        headline="Bitcoin cycle research. Completely free."
        sub="One clear, calm read on where Bitcoin sits in its cycle — every morning, grounded in 13+ years of history. No hype. No predictions. No paywall."
      />

      {/* Today's free read — immediate proof of value */}
      <section>
        <SectionLabel>Today&apos;s free read</SectionLabel>
        <div className="card-glow p-6 sm:p-8">
          <p className="font-display text-[20px] sm:text-[26px] text-ink-50 leading-snug max-w-3xl">{e.take}</p>
          <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
            <Stat label="Context Score" value={`${e.contextScore.score}/100`} sub={e.contextScore.label} />
            <Stat label="Accumulation Index" value={`${e.metrics.accumulationScore}/100`} sub={e.metrics.accumulationBand.replace("Historically ", "")} />
            <Stat label="Fear & Greed" value={sr ? `${sr.value}` : "—"} sub={sr ? sr.band.label : "Sentiment"} />
            <Stat label="Closest moment" value={e.historicalContext ? e.historicalContext.match : "—"} sub={e.historicalContext ? `${e.historicalContext.similarity}% match` : "Similar moments"} />
          </div>
          <p className="mt-5 text-[12px] text-ink-500">This is today&apos;s actual read — historical context, not a prediction or financial advice.</p>
        </div>
      </section>

      {/* What you get, free */}
      <section>
        <SectionLabel>What you get — free, every day</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { t: "Morning Research Brief", d: "The day's one thing that matters, in a 30-second read." },
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

      {/* Social proof */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Proof label="Research editions" value={stats.total > 0 ? `${stats.total}` : "Daily"} />
        <Proof label="Years of history analysed" value="13+" />
        <Proof label="Cost, forever" value="Free" />
        <Proof label="Predictions made" value="0" />
      </section>

      {/* Email capture */}
      <section id="signup" className="card-glow p-7 sm:p-10 text-center">
        <h2 className="font-display text-[26px] sm:text-[34px] font-medium tracking-tight-2 text-ink-50 leading-tight">
          Get tomorrow&apos;s research, free.
        </h2>
        <p className="mt-3 text-[14px] text-ink-300 max-w-lg mx-auto">
          Join readers who start every day with historical context instead of hype. One email each morning. Unsubscribe anytime.
        </p>
        <div className="mt-6 flex justify-center">
          <StartSignup source="/free" buttonLabel="Get my free research" />
        </div>
        <p className="mt-3 text-[11px] text-ink-500">100% free. No spam. Historical context, not advice.</p>
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
          <LandingCta href="#signup" label="final_primary" source="/free">Get my free research</LandingCta>
        </div>
        <p className="mt-8 text-[11px] text-ink-500">Historical context. Not prediction. No price targets. Not financial advice.</p>
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
function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-5">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className="mt-1.5 font-display text-[24px] text-ink-50 leading-none">{value}</div>
      <div className="mt-1.5 text-[11.5px]" style={{ color: GOLD }}>{sub}</div>
    </div>
  );
}
function Proof({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-6 text-center">
      <div className="font-display text-[26px] text-ink-50">{value}</div>
      <div className="mt-1 text-[10.5px] uppercase tracking-[0.14em] text-ink-400">{label}</div>
    </div>
  );
}
