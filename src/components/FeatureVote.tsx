"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { sessionId, track } from "@/lib/track";

const OPTIONS: { key: string; label: string }[] = [
  { key: "alerts", label: "Cycle & price alerts" },
  { key: "daily_emails", label: "Daily email brief" },
  { key: "etf_tracking", label: "Deeper ETF tracking" },
  { key: "more_cycle_comparisons", label: "More cycle comparisons" },
  { key: "portfolio_tracking", label: "Portfolio tracking" },
  { key: "other", label: "Something else" },
];

// "What should we build next?" — let users vote rather than us assuming.
export function FeatureVote() {
  const [voted, setVoted] = useState<string | null>(null);

  const vote = async (feature: string) => {
    setVoted(feature);
    try {
      await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, sessionId: sessionId() }),
      });
    } catch {
      /* never break the page */
    }
    track("feature_vote", { feature });
  };

  return (
    <section className="card-glow p-6 lg:p-8 relative overflow-hidden">
      <div className="relative z-10">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
          Help shape the roadmap
        </div>
        <h2 className="font-display text-[22px] lg:text-[26px] font-medium tracking-tight-2 text-ink-100 leading-tight">
          What should we build next?
        </h2>
        <p className="mt-2 text-[13.5px] text-ink-300 max-w-2xl leading-relaxed">
          We&apos;d rather measure than assume. One tap — no signup needed.
        </p>

        {voted ? (
          <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-signal-green/25 bg-signal-green/[0.08] text-signal-green text-[13px]">
            <Check size={15} /> Thanks for voting — it genuinely guides what comes next.
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2.5">
            {OPTIONS.map((o) => (
              <button
                key={o.key}
                onClick={() => vote(o.key)}
                className="px-3.5 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[13px] text-ink-200 hover:text-ink-50 hover:border-accent/40 hover:bg-accent/[0.06] transition-colors"
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="watermark">halving.lens · roadmap</div>
    </section>
  );
}
