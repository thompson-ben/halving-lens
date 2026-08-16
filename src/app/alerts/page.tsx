import Link from "next/link";

// Cycle Alerts — an HONEST statement of what exists and what does not.
//
// Programme 1 (truth correction). This page previously listed four delivery
// channels, configurable zone crossings, Pi Cycle triggers and composite-index
// thresholds — none of which are built — and asserted that one indicator had
// identified every cycle peak, a prediction-adjacent claim that contradicts the
// house rule on every other surface.
//
// It now says exactly what the rest of the product says: the DETECTION is
// built and runs every morning; the DELIVERY is not. No channels are named, no
// paid product is implied, and nothing suggests a reader can configure an alert
// today.
//
// Deliberately NO second capture form: the early-access list already lives at
// the foot of the Cycle Dashboard and writes to one store. A second path to the
// same table would fragment the only honest demand signal HalvingLens has.
//
// ROUTE STATUS: this page is noindex, absent from the sitemap, and linked from
// nowhere in the app. Retiring the route entirely is a live recommendation
// awaiting a founder decision; until then it must at least be true.

export const metadata = {
  title: "Cycle Alerts — not yet available",
  description:
    "HalvingLens checks fifteen readings against their own histories every morning. Sending you an alert when one of them changes is not built yet — here is exactly where that stands.",
  robots: { index: false, follow: true },
};

const GOLD = "#d9b96a";

export default function AlertsPage() {
  return (
    <div className="space-y-12 pt-2 max-w-3xl">
      <header>
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>Alerts</div>
        <h1 className="font-display text-[38px] lg:text-[50px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-2xl">
          Alerts are not built yet.
        </h1>
        <p className="mt-5 text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          It would be easy to list the channels we could send them on. Here is the honest position
          instead: the part that notices a change already runs every morning. The part that tells
          you about it does not exist.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-6" style={{ borderColor: "rgba(217,185,106,0.25)" }}>
          <div className="text-[11px] uppercase tracking-[0.16em] mb-4" style={{ color: GOLD }}>
            What already runs
          </div>
          <ul className="space-y-3">
            {[
              "Fifteen readings checked each morning against their own recorded history.",
              "How unusual a move is, measured against that metric’s own record — with the sample size.",
              "Each tracked state and the date it started, so a change of state is a dated fact.",
            ].map((t) => (
              <li key={t} className="text-[13.5px] text-ink-200 leading-relaxed">
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[12.5px] text-ink-400 leading-relaxed">
            All of it is visible today on the{" "}
            <Link href="/cycle-dashboard" className="text-accent">Cycle Dashboard</Link>, free and without
            an account, and summarised each morning in the Daily Brief.
          </p>
        </div>

        <div className="card p-6">
          <div className="text-[11px] uppercase tracking-[0.16em] text-ink-500 mb-4">What does not exist</div>
          <ul className="space-y-3">
            {[
              "Any way for you to choose which readings you care about.",
              "Any way for you to set your own thresholds.",
              "Any alert delivery at all — no notifications, no separate alert emails.",
              "Any paid tier. Nothing on HalvingLens costs anything today.",
            ].map((t) => (
              <li key={t} className="text-[13.5px] text-ink-400 leading-relaxed">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card p-6 sm:p-7">
        <h2 className="font-display text-[20px] sm:text-[23px] text-ink-100 leading-snug tracking-tight-2">
          Whether we build it depends on whether people want it.
        </h2>
        <p className="mt-3 text-[13.5px] text-ink-300 leading-relaxed max-w-2xl">
          There is one early-access list, at the foot of the Cycle Dashboard. Joining it costs
          nothing, commits you to nothing, and is how we decide whether this gets built at all.
        </p>
        <Link
          href="/cycle-dashboard#pro-early-access"
          className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-accent/40 text-accent text-[13.5px] font-medium hover:bg-accent/[0.08] transition-colors"
        >
          Join the early-access list →
        </Link>
      </section>

      <p className="text-[11.5px] text-ink-500 leading-relaxed max-w-2xl">
        Historical context, not a prediction. HalvingLens does not call tops or bottoms, set price
        targets, or claim that any indicator predicts what happens next — and an alert, if one is
        ever built, would say only that something changed.
      </p>
    </div>
  );
}
