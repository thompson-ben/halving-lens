import Link from "next/link";
import { ArrowUpRight, Check, X } from "lucide-react";
import { LandingHero, LandingCta, StartSignup } from "@/components/LandingClient";
import { cycleDashboardIntel } from "@/lib/cycleDashboardIntel";
import { libraryStats } from "@/lib/research";
import { absoluteUrl } from "@/lib/site";

const DESC =
  "Understand today's Bitcoin market in about thirty seconds. Daily research grounded in historical context — no hype, no predictions, no price targets.";
export const metadata = {
  title: { absolute: "HalvingLens — The Clearest View of the Bitcoin Cycle" },
  description: DESC,
  alternates: { canonical: "/start" },
  robots: { index: false, follow: true }, // paid landing — keep out of organic index
  openGraph: { title: "The clearest view of the Bitcoin cycle.", description: DESC, url: "/start", type: "website" },
  twitter: { card: "summary_large_image", title: "The clearest view of the Bitcoin cycle.", description: DESC },
};

const GOLD = "#d9b96a";

export default function StartPage() {
  // Programme 1 (truth correction): this page's proof now comes from the SAME
  // canonical authority the Daily Brief and the Cycle Dashboard both quote, so
  // a visitor cannot be shown a reading the product no longer produces. It
  // previously led with the retired Context Score and the retired edition
  // engine's take line — neither of which a subscriber meets after signing up.
  const intel = cycleDashboardIntel();
  const states = intel.strip.filter((r) => r.available && r.stateLabel);
  const stats = libraryStats();

  return (
    <div className="space-y-24">
      <LandingHero />

      {/* Today's Bitcoin Check — immediate value */}
      <section>
        <SectionLabel>Today&apos;s Bitcoin check</SectionLabel>
        <div className="card-glow p-6 sm:p-8">
          <p className="font-display text-[20px] sm:text-[26px] text-ink-50 leading-snug max-w-3xl">
            {intel.summary.activityLabel}. {intel.summary.countsLine}
          </p>
          {states.length > 0 && (
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
              {states.map((r) => (
                <Check2 key={r.id} label={r.label} value={r.stateLabel ?? "—"} sub={r.detail ?? ""} />
              ))}
            </div>
          )}
          <p className="mt-5 text-[12px] text-ink-500">Historical context — not a prediction, not financial advice.</p>
        </div>
      </section>

      {/* Why HalvingLens */}
      <section>
        <SectionLabel>Why HalvingLens</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-6">
            <div className="text-[12px] uppercase tracking-[0.16em] text-ink-500 mb-4">Everyone else</div>
            {["Predictions", "Opinions", "More indicators", "Hype"].map((x) => (
              <div key={x} className="flex items-center gap-2.5 py-2 text-[14px] text-ink-400">
                <X size={15} className="text-signal-red shrink-0" /> {x}
              </div>
            ))}
          </div>
          <div className="card p-6" style={{ borderColor: "rgba(217,185,106,0.25)" }}>
            <div className="text-[12px] uppercase tracking-[0.16em] mb-4" style={{ color: GOLD }}>HalvingLens</div>
            {["Historical context", "Research, not opinions", "Daily evidence", "Educational", "Calm and professional"].map((x) => (
              <div key={x} className="flex items-center gap-2.5 py-2 text-[14px] text-ink-100">
                <Check size={15} className="text-signal-green shrink-0" /> {x}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product showcase */}
      <section>
        <SectionLabel>Inside HalvingLens</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            // Programme 1: the signature product was missing from the showcase on
            // both paid landings; it now leads here as it does on /free.
            { t: "Cycle Dashboard", d: "The whole checked market — the working behind the brief.", href: "/cycle-dashboard" },
            { t: "Morning Research", d: "A daily analyst note — the day's one thing that matters.", href: "/research" },
            { t: "Research Library", d: "Every edition, permanently archived and searchable.", href: "/research" },
            { t: "Accumulation Index", d: "How attractive today is versus Bitcoin's whole history.", href: "/accumulation" },
            { t: "Similar Moments", d: "The historical moments today most resembles.", href: "/similar-moments" },
            { t: "Historical Drawdowns", d: "How far prior cycles fell from points like this.", href: "/historical-price-paths" },
            { t: "Dynamic DCA", d: "How leaning into cheap conditions behaved historically.", href: "/accumulation" },
          ].map((s) => (
            <Link key={s.t} href={s.href} className="card card-interactive p-5 flex items-center justify-between gap-4 group hover:border-accent/30">
              <div>
                <div className="text-[14px] font-medium text-ink-100">{s.t}</div>
                <div className="text-[12.5px] text-ink-400 mt-0.5">{s.d}</div>
              </div>
              <ArrowUpRight size={16} className="text-accent shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Proof label="Research editions" value={stats.total > 0 ? `${stats.total}` : "Daily"} />
        <Proof label="Years of history analysed" value="13+" />
        <Proof label="Research streak" value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`} />
        <Proof label="Cost" value="Free" />
      </section>

      {/* Email capture */}
      <section id="signup" className="card-glow p-7 sm:p-10 text-center">
        <h2 className="font-display text-[26px] sm:text-[34px] font-medium tracking-tight-2 text-ink-50 leading-tight">
          Start every day with context, not hype.
        </h2>
        <p className="mt-3 text-[14px] text-ink-300 max-w-lg mx-auto">
          The daily research brief, free. One clear read on where Bitcoin sits in its cycle.
        </p>
        <div className="mt-6 flex justify-center">
          <StartSignup />
        </div>
        <p className="mt-3 text-[11px] text-ink-500">No spam. Unsubscribe anytime. Historical context, not advice.</p>
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
          Join investors who begin every day with historical context — not hype.
        </h2>
        <div className="mt-6 flex justify-center">
          <LandingCta href="#signup" label="final_primary">Get today&apos;s free research</LandingCta>
        </div>
        <p className="mt-8 text-[11px] text-ink-500">Historical context. Not prediction. No price targets. Not financial advice.</p>
      </section>
    </div>
  );
}

const FAQ = [
  { q: "What is HalvingLens?", a: "A daily Bitcoin cycle research publication. We turn real price history into a clear, calm read on where the market sits today — and archive every edition permanently." },
  { q: "Who is it for?", a: "Long-term Bitcoin investors who want evidence and context instead of predictions, hype or noise." },
  { q: "Is this financial advice?", a: "No. Everything is educational historical context — no advice, no predictions, no price targets." },
  { q: "Why is it free?", a: "The daily brief is free to build trust and a readership. A premium tier may follow, but the core read stays accessible." },
  { q: "Where does the data come from?", a: "Public market and on-chain sources, refreshed daily. Every figure traces to real data — nothing is fabricated." },
  { q: "How often is research published?", a: "A Morning Research Brief every day, plus a deeper Weekly Research report on Sundays." },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10.5px] uppercase tracking-[0.22em] mb-5" style={{ color: GOLD }}>{children}</div>;
}
function Check2({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-5">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className="mt-1.5 font-display text-[19px] text-ink-50 leading-snug">{value}</div>
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
