import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/socialLinks";

const DESC =
  "HalvingLens is an independent Bitcoin research publication founded by Ben Thompson — evidence-based historical cycle analysis, without hype or price predictions.";
export const metadata = {
  title: { absolute: "About HalvingLens | HalvingLens" },
  description: DESC,
  alternates: { canonical: "/about" },
  openGraph: { title: "About HalvingLens", description: DESC, url: "/about", type: "website" },
  twitter: { card: "summary_large_image", title: "About HalvingLens", description: DESC },
};

const GOLD = "#d9b96a";

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <header className="space-y-4 pb-6 border-b border-white/[0.08]">
        <div className="text-[10.5px] uppercase tracking-[0.24em]" style={{ color: GOLD }}>About</div>
        <h1 className="font-display text-[36px] lg:text-[46px] leading-[1.05] text-ink-50 tracking-tightest">
          An independent Bitcoin research publication.
        </h1>
        <p className="text-[15.5px] text-ink-300 leading-relaxed">
          HalvingLens is an independent Bitcoin research publication founded by Ben Thompson. Its
          mission is to provide evidence-based historical Bitcoin cycle analysis — without hype, and
          without price predictions.
        </p>
      </header>

      <Section title="Why it exists">
        <p>
          Most Bitcoin commentary is prediction, opinion and noise. HalvingLens does the opposite: it
          turns real price and cycle history into a calm, clear read on where the market sits today,
          set against every prior halving cycle. The goal is perspective, not forecasts.
        </p>
      </Section>

      <Section title="What we publish">
        <p>
          A short <Link href="/brief/archive" className="text-accent">Morning Research Brief</Link> each
          day, a deeper <Link href="/weekly/archive" className="text-accent">Weekly Research</Link> report,
          and a growing library of <Link href="/research" className="text-accent">original findings</Link> and
          cycle <Link href="/metrics" className="text-accent">metrics</Link>. Every edition is dated and
          archived permanently.
        </p>
      </Section>

      <Section title="Our approach — no hype, no predictions">
        <p>
          Everything is educational historical context. We do not make price predictions, set price
          targets, or claim to call tops and bottoms. Where a number is modelled or estimated rather
          than live, we say so — see the <Link href="/methodology" className="text-accent">methodology</Link>.
          Nothing here is financial advice.
        </p>
      </Section>

      <Section title="Who it's for">
        <p>
          Long-term Bitcoin investors and researchers who want evidence and context instead of hype —
          people who value being able to place today in the sweep of Bitcoin's history.
        </p>
      </Section>

      <Section title="How the research is made">
        <p>
          HalvingLens combines automated data with editorial interpretation. Market and cycle data are
          refreshed from public sources; the analysis then frames that data against prior cycles. The
          automated layer keeps the facts current and traceable; the editorial layer decides what
          matters and explains it plainly. The two are kept distinct — the methodology page sets out
          which figures are live, derived, modelled or editorial.
        </p>
      </Section>

      <Section title="Who runs it">
        <p>
          HalvingLens is founded and published by <span className="text-ink-100">Ben Thompson</span>, who
          works in data analytics and business intelligence (Power BI) and has followed Bitcoin's cycles
          as a long-term researcher. HalvingLens is publication-led: the focus is the research, published
          under a named, responsible editor.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions, corrections or press enquiries:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent">{CONTACT_EMAIL}</a>.
        </p>
      </Section>

      <p className="pt-6 border-t border-white/[0.06] text-[11px] text-ink-500">
        Historical context. Not prediction. No price targets. Not financial advice.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="font-display text-[19px] font-medium tracking-tight-2 text-ink-100">{title}</h2>
      <div className="text-[14px] text-ink-300 leading-relaxed [&_p]:leading-relaxed">{children}</div>
    </section>
  );
}
