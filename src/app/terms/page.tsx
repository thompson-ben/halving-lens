import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/socialLinks";

const DESC = "The terms of use for HalvingLens — an independent Bitcoin research publication. Educational content only; not financial advice.";
export const metadata = {
  title: { absolute: "Terms of Use | HalvingLens" },
  description: DESC,
  alternates: { canonical: "/terms" },
  openGraph: { title: "Terms of Use", description: DESC, url: "/terms", type: "website" },
  twitter: { card: "summary_large_image", title: "Terms of Use", description: DESC },
  robots: { index: true, follow: true },
};

const GOLD = "#d9b96a";

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="space-y-3 pb-6 border-b border-white/[0.08]">
        <div className="text-[10.5px] uppercase tracking-[0.24em]" style={{ color: GOLD }}>Terms of use</div>
        <h1 className="font-display text-[34px] lg:text-[42px] leading-[1.05] text-ink-50 tracking-tightest">
          Terms of use
        </h1>
        <p className="text-[13px] text-ink-400">
          HalvingLens is an independent Bitcoin research publication founded and published by Ben
          Thompson. By using this site or subscribing to its emails, you agree to these terms.
        </p>
      </header>

      <Section title="Not financial advice">
        Everything HalvingLens publishes is educational and informational historical context about
        Bitcoin&apos;s market cycles. It is <span className="text-ink-100">not financial, investment, legal or
        tax advice</span>, not a recommendation to buy or sell any asset, and not a prediction or price
        target. Bitcoin is volatile and you can lose money. Always do your own research and consider
        professional advice before making decisions.
      </Section>

      <Section title="No warranty">
        The site and its data are provided &ldquo;as is&rdquo;. While we work to keep figures accurate and
        traceable to real sources (see the{" "}
        <Link href="/methodology" className="text-accent">methodology</Link>), we make no warranty that
        the content is complete, current or error-free. Some metrics are modelled and are labelled as
        such. To the extent permitted by law, HalvingLens is not liable for any loss arising from use
        of the site or reliance on its content.
      </Section>

      <Section title="Intellectual property">
        The research, writing, design and original charts are the property of HalvingLens unless
        otherwise stated. You may share and cite the work with attribution and a link; you may not
        republish it wholesale or present it as your own. Underlying market data belongs to its
        respective sources.
      </Section>

      <Section title="Email &amp; subscriptions">
        Subscribing adds you to the daily brief and related research emails. Every email includes a
        one-click unsubscribe, and you can opt out at any time. How we handle your data is set out in
        the <Link href="/privacy" className="text-accent">privacy policy</Link>.
      </Section>

      <Section title="Third-party links">
        The site may link to third-party sites and data providers. We are not responsible for their
        content, availability or practices.
      </Section>

      <Section title="Changes">
        We may update these terms as the publication evolves. Material changes will be reflected on
        this page. Continued use after a change means you accept the updated terms.
      </Section>

      <Section title="Contact">
        Questions about these terms:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent">{CONTACT_EMAIL}</a>.
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-[18px] font-medium tracking-tight-2 text-ink-100">{title}</h2>
      <p className="text-[14px] text-ink-300 leading-relaxed">{children}</p>
    </section>
  );
}
