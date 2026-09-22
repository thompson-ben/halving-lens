import type { Metadata } from "next";
import Link from "next/link";
import { TrackedSection } from "@/components/TrackedSection";
import { ProOfferCta, ProOfferSignup } from "@/components/pro/ProOfferSignup";

// /pro — the pre-launch HalvingLens Pro offer page (founder commission,
// 21 Sep 2026). Makes the PROPOSED paid offering tangible: what it would do,
// an ILLUSTRATIVE alert (fictional values, clearly labelled), and the
// existing Pro waitlist behind the proposed price. This page describes a
// PLANNED beta — nothing here is a live service, a charge, or a confirmed
// price, and the copy says so wherever it matters. No billing, alert
// delivery, preferences or history are implemented by this page.

export const metadata: Metadata = {
  title: "HalvingLens Pro — Planned Beta",
  description:
    "Pro is being designed to monitor the Bitcoin readings you follow and email you when a meaningful change appears — with a clear explanation and a link to the evidence. Proposed beta price £15/month.",
};

const GOLD = "#d9b96a";

export default function ProOfferPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-14 pb-16">
      {/* 1 · HERO */}
      <header className="pt-4">
        <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
          HalvingLens Pro · Planned beta
        </div>
        <h1 className="mt-3 font-display text-[32px] lg:text-[42px] text-ink-50 tracking-tight-2 leading-tight">
          Know when Bitcoin conditions meaningfully change.
        </h1>
        <p className="mt-4 text-[15px] text-ink-300 leading-relaxed max-w-xl">
          Spend less time checking charts. Pro is being designed to monitor the readings you follow and
          email you when a meaningful change appears—with a clear explanation and a link to the evidence.
        </p>
        <p className="mt-5 text-[15px] text-ink-100">
          <span className="text-ink-300">Proposed beta price:</span>{" "}
          <span className="font-semibold text-[18px]" style={{ color: GOLD }}>
            £15/month
          </span>
        </p>
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <ProOfferCta
            placement="hero"
            targetId="join"
            className="inline-flex justify-center items-center h-11 px-6 rounded-lg bg-accent text-[#15120a] text-[13.5px] font-semibold hover:opacity-90 transition-opacity"
          >
            Join the Pro waitlist
          </ProOfferCta>
          <a href="#example-alert" className="text-[13px] text-ink-300 underline decoration-white/20 underline-offset-2 hover:text-ink-100">
            See an example alert
          </a>
        </div>
        {/* WCAG AA: muted notes use ink-350 on the page shell (4.75:1) and
            ink-300 inside cards or the alert body (ink-500/400 fall short). */}
        <p className="mt-3 text-micro text-ink-350 leading-relaxed max-w-md">
          Free to join. No payment details or commitment required. We&apos;ll confirm the final features and
          price before you decide.
        </p>
      </header>

      {/* 2 · ILLUSTRATIVE ALERT */}
      <section id="example-alert" aria-labelledby="example-alert-heading" className="scroll-mt-6">
        <h2 id="example-alert-heading" className="eyebrow text-ink-350 mb-3">
          What a Pro alert could look like
        </h2>
        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          <div className="bg-signal-amber/[0.12] border-b border-signal-amber/30 px-4 py-2">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-signal-amber">
              Illustrative example — fictional values, not a live market alert
            </p>
          </div>
          <div className="bg-[#10131a] px-5 py-5 sm:px-7 sm:py-6">
            {/* Styled as a readable email: masthead line, subject-like title, body. */}
            <div className="flex items-baseline justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-200">
                <span style={{ color: GOLD }}>◆</span> HalvingLens Pro
              </span>
              <span className="text-[11px] text-ink-300">Example alert</span>
            </div>
            <h3 className="mt-4 font-display text-[20px] sm:text-[23px] text-ink-50 leading-snug">
              Bitcoin has crossed below its 200-day average
            </h3>
            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13.5px]">
              <div className="flex justify-between gap-3 border-b border-white/[0.04] py-1.5">
                <dt className="text-ink-300">Previous daily close</dt>
                <dd className="text-ink-100 font-mono">$82,000</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-white/[0.04] py-1.5">
                <dt className="text-ink-300">Previous 200-day average</dt>
                <dd className="text-ink-100 font-mono">$80,100</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-white/[0.04] py-1.5">
                <dt className="text-ink-300">Latest daily close</dt>
                <dd className="text-ink-100 font-mono">$79,500</dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-white/[0.04] py-1.5">
                <dt className="text-ink-300">Latest 200-day average</dt>
                <dd className="text-ink-100 font-mono">$80,000</dd>
              </div>
            </dl>
            <div className="mt-5 space-y-4">
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
                  Why you received this
                </h4>
                <p className="mt-1.5 text-[13.5px] text-ink-300 leading-relaxed">
                  You follow Bitcoin&apos;s position relative to its 200-day average. The latest daily close
                  moved from above the average to below it.
                </p>
              </div>
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
                  Why it matters
                </h4>
                <p className="mt-1.5 text-[13.5px] text-ink-300 leading-relaxed">
                  This changes Bitcoin&apos;s position relative to a widely followed long-term trend
                  reference. A crossing can reverse and does not, by itself, establish a lasting trend.
                </p>
              </div>
              <div className="pt-1">
                <Link
                  href="/price"
                  className="text-[13.5px] font-medium underline decoration-white/25 underline-offset-2 hover:text-ink-50"
                  style={{ color: GOLD }}
                >
                  Explore the live price and 200-day average →
                </Link>
                <p className="mt-1.5 text-micro text-ink-300">
                  This link shows actual market data, not the fictional values above.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 · PLANNED FEATURES */}
      <section aria-labelledby="planned-heading">
        <h2 id="planned-heading" className="font-display text-[24px] text-ink-50 tracking-tight-2">
          What we&apos;re planning for Pro
        </h2>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <h3 className="text-[14px] font-semibold text-ink-100">Choose what to follow</h3>
            <p className="mt-2 text-[13px] text-ink-300 leading-relaxed">
              Select from the readings supported in the beta.
            </p>
          </div>
          <div className="card p-5">
            <h3 className="text-[14px] font-semibold text-ink-100">Understand the change</h3>
            <p className="mt-2 text-[13px] text-ink-300 leading-relaxed">
              See what triggered an alert, why it matters and where to inspect the underlying data.
            </p>
          </div>
          <div className="card p-5">
            <h3 className="text-[14px] font-semibold text-ink-100">Review earlier alerts</h3>
            <p className="mt-2 text-[13px] text-ink-300 leading-relaxed">
              Return to previous alerts and the observations behind them.
            </p>
          </div>
        </div>
        <p className="mt-4 text-[12.5px] text-ink-350 leading-relaxed">
          These features are planned, not currently available. The initial feature set will be shaped by
          member feedback. We&apos;ll confirm supported readings and delivery frequency before launch.
        </p>
      </section>

      {/* 4 · FREE AND PRO COMPARISON */}
      <section aria-labelledby="compare-heading">
        <h2 id="compare-heading" className="font-display text-[24px] text-ink-50 tracking-tight-2">
          Free today, Pro as planned
        </h2>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-300">Free</h3>
            <ul className="mt-3 space-y-2 text-[13.5px] text-ink-300">
              <li>· Daily Brief.</li>
              <li>· Current dashboard and existing free research.</li>
              <li>· Explore the data when you visit.</li>
            </ul>
          </div>
          <div className="card p-5 border-accent/25">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: GOLD }}>
              Planned Pro
            </h3>
            <ul className="mt-3 space-y-2 text-[13.5px] text-ink-300">
              <li>· Monitoring of selected supported readings.</li>
              <li>· Email notifications when defined conditions trigger.</li>
              <li>· Preferences and alert history.</li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-[12.5px] text-ink-350 leading-relaxed">
          The existing free experience remains available. Pro is a planned additional monitoring service.
        </p>
      </section>

      {/* 5 · SHORT FAQ */}
      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="font-display text-[24px] text-ink-50 tracking-tight-2">
          Questions
        </h2>
        <dl className="mt-5 space-y-5">
          <div>
            <dt className="text-[14px] font-semibold text-ink-100">Is Pro available now?</dt>
            <dd className="mt-1.5 text-[13.5px] text-ink-300 leading-relaxed">
              Not yet. This page describes the proposed beta. Joining the waitlist does not purchase a
              subscription.
            </dd>
          </div>
          <div>
            <dt className="text-[14px] font-semibold text-ink-100">How much will it cost?</dt>
            <dd className="mt-1.5 text-[13.5px] text-ink-300 leading-relaxed">
              We&apos;re proposing £15/month for the beta. Final pricing and features will be confirmed
              before you choose whether to subscribe.
            </dd>
          </div>
          <div>
            <dt className="text-[14px] font-semibold text-ink-100">How is this different from the free Daily Brief?</dt>
            <dd className="mt-1.5 text-[13.5px] text-ink-300 leading-relaxed">
              The Daily Brief provides a general overview. Pro is intended to monitor the supported readings
              you choose and notify you when defined conditions change.
            </dd>
          </div>
          <div>
            <dt className="text-[14px] font-semibold text-ink-100">Are alerts real time?</dt>
            <dd className="mt-1.5 text-[13.5px] text-ink-300 leading-relaxed">
              Pro will evaluate changes when new source data becomes available. Different readings update at
              different frequencies. The supported schedule will be confirmed before launch.
            </dd>
          </div>
          <div>
            <dt className="text-[14px] font-semibold text-ink-100">Will I receive an alert every day?</dt>
            <dd className="mt-1.5 text-[13.5px] text-ink-300 leading-relaxed">
              Not necessarily. Alerts are intended to follow qualifying changes, rather than a daily
              publishing schedule.
            </dd>
          </div>
          <div>
            <dt className="text-[14px] font-semibold text-ink-100">Does Pro tell me when to buy or sell?</dt>
            <dd className="mt-1.5 text-[13.5px] text-ink-300 leading-relaxed">
              No. It provides market observations and historical context, without price predictions or
              personalised investment instructions.
            </dd>
          </div>
        </dl>
      </section>

      {/* 6 · FINAL WAITLIST FORM — the proposed price stays visible beside the
          form, so it is on screen even for visitors arriving via #join. */}
      <TrackedSection id="pro-offer-form">
        <section id="join" aria-labelledby="join-heading" className="card-glow p-6 sm:p-8 scroll-mt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="join-heading" className="font-display text-[24px] text-ink-50 tracking-tight-2">
              Interested in Pro at £15/month?
            </h2>
            <span className="text-[12px] text-ink-300">
              Proposed beta price: <span style={{ color: GOLD }}>£15/month</span>
            </span>
          </div>
          <p className="mt-2 mb-5 text-[13.5px] text-ink-300 leading-relaxed max-w-xl">
            Join the waitlist to hear when the beta is ready and decide whether it&apos;s right for you.
          </p>
          <ProOfferSignup />
        </section>
      </TrackedSection>
    </div>
  );
}
