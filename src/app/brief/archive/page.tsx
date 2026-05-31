import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { archiveIndex } from "@/lib/briefArchive";

export const metadata = {
  title: "Bitcoin Cycle Brief — Archive · halving.lens",
  description: "Browse the daily Bitcoin Cycle Brief archive by date.",
};

export default function BriefArchivePage() {
  const months = archiveIndex();

  return (
    <div className="space-y-12">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-4">
          Brief archive
        </div>
        <h1 className="font-display text-[34px] sm:text-[40px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Daily Bitcoin Cycle Briefs
        </h1>
        <p className="mt-5 text-[15px] text-ink-300 max-w-2xl leading-relaxed">
          One clear, plain-English read of where Bitcoin sits in the cycle, every day. Browse by
          date below.
        </p>
      </header>

      {months.map((m) => (
        <section key={m.label}>
          <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100 mb-5">
            {m.label}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {m.days.map((d) =>
              d.available ? (
                <Link
                  key={d.slug}
                  href={`/brief/${d.slug}`}
                  className="card card-interactive p-4 block group hover:border-accent/25"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-ink-100 group-hover:text-accent transition-colors">
                      {m.label.split(" ")[0]} {d.day}
                    </span>
                    <ArrowRight size={13} className="text-ink-500 group-hover:text-accent" />
                  </div>
                  {d.isToday && (
                    <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-accent">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent live-dot relative inline-block" />
                      Today
                    </span>
                  )}
                </Link>
              ) : (
                <div
                  key={d.slug}
                  className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 opacity-60"
                  title="Not archived yet"
                >
                  <span className="text-[13px] text-ink-500">
                    {m.label.split(" ")[0]} {d.day}
                  </span>
                  <div className="mt-2 text-[10px] text-ink-600 uppercase tracking-wide">Soon</div>
                </div>
              ),
            )}
          </div>
        </section>
      ))}

      <p className="text-[12px] text-ink-500 leading-relaxed max-w-2xl">
        Briefs are generated live from the latest Bitcoin, ETF, sentiment and cycle data. A stored
        archive of each day&apos;s brief is being built — for now, today&apos;s dated brief is the
        live one. Historical cycle behaviour is not a forecast; this is educational analysis, not
        financial advice.
      </p>
    </div>
  );
}
