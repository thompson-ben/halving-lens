import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How HalvingLens collects and uses data — privacy-first, first-party analytics, no selling of personal data.",
  alternates: { canonical: "/privacy" },
};

const GOLD = "#d9b96a";
const UPDATED = "30 June 2026";

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl mx-auto">
      <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>Legal</div>
      <h1 className="mt-3 font-display text-[30px] lg:text-[38px] leading-[1.1] text-ink-50 tracking-tight-2">Privacy Policy</h1>
      <p className="mt-3 text-[12.5px] text-ink-500">Last updated {UPDATED}</p>

      <div className="mt-8 space-y-8 text-[14.5px] leading-relaxed text-ink-300">
        <Section title="The short version">
          HalvingLens is built privacy-first. We use first-party analytics, collect as little as possible, never sell your
          personal data, and you can unsubscribe in one click at any time.
        </Section>

        <Section title="What we collect">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><span className="text-ink-100">Email address</span> — only if you subscribe to the research brief, so we can send it.</li>
            <li><span className="text-ink-100">Anonymous usage analytics</span> — pages viewed, time on page, scroll depth, and which features and research you interact with, tied to a random, anonymous device identifier (not your name or email).</li>
            <li><span className="text-ink-100">Email engagement</span> — we measure email opens and link clicks using first-party analytics to improve the quality and relevance of our emails. This is stored against a non-identifying token, not your raw address.</li>
            <li><span className="text-ink-100">Marketing attribution</span> — if you arrive from an ad or link, we record the campaign/source (e.g. UTM parameters) so we understand which channels work.</li>
          </ul>
        </Section>

        <Section title="What we don't do">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>We don&apos;t sell or rent your personal data.</li>
            <li>We don&apos;t collect financial accounts, wallets, or portfolio information.</li>
            <li>We don&apos;t require an account to use the site.</li>
          </ul>
        </Section>

        <Section title="Why we collect it">
          To deliver the research you asked for, to understand what readers find useful, and to measure our marketing so we
          can grow responsibly. This is a legitimate interest in operating and improving the service; you can opt out of
          emails at any time.
        </Section>

        <Section title="Cookies & local storage">
          We use privacy-friendly first-party storage (a random session/device identifier and your on-device dashboard
          preferences such as saved research). We may load third-party measurement tags (e.g. Meta Pixel, Google
          Analytics) where enabled, to measure advertising. We do not use cross-site advertising cookies beyond standard
          campaign measurement.
        </Section>

        <Section title="Your choices">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Unsubscribe from any email using the one-click link in its footer.</li>
            <li>Clear your browser&apos;s local storage to reset your on-device dashboard and anonymous identifier.</li>
            <li>Request access to or deletion of any personal data we hold by contacting us.</li>
          </ul>
        </Section>

        <Section title="Data retention">
          Subscriber emails are kept until you unsubscribe. Anonymous analytics are retained in aggregate to understand
          long-term trends.
        </Section>

        <Section title="Contact">
          Questions or requests: <span className="text-ink-100">brief@halvinglens.com</span>.
        </Section>

        <p className="text-[12px] text-ink-500 border-t border-white/[0.06] pt-5">
          HalvingLens provides educational, historical context only — not financial advice. This policy may be updated as
          the product evolves; the date above reflects the latest version.
        </p>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[11px] uppercase tracking-[0.18em] mb-2.5" style={{ color: GOLD }}>{title}</h2>
      <div className="text-ink-300">{children}</div>
    </section>
  );
}
