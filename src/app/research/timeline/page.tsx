import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { editionsByMonth, libraryStats } from "@/lib/research";

export const metadata = {
  title: "Research Timeline — halvinglens.com",
  description:
    "Scroll through Bitcoin's history one research note per day. Every edition of HalvingLens Research, in order. Educational context, not advice.",
  alternates: { canonical: "/research/timeline" },
};

const GOLD = "#d9b96a";

export default function ResearchTimelinePage() {
  const months = editionsByMonth();
  const stats = libraryStats();

  return (
    <div className="space-y-10">
      <Link href="/research" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">
        <ArrowLeft size={13} /> Morning Research Library
      </Link>

      <header className="pt-1">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>HalvingLens Research</div>
        <h1 className="font-display text-[32px] sm:text-[44px] font-medium tracking-tightest text-ink-50 leading-[1.05]">Research Timeline</h1>
        <p className="mt-4 text-[14px] text-ink-300 leading-relaxed max-w-2xl">
          Bitcoin&apos;s history, one research note per day — read the cycle as it unfolded.
          {stats.total > 0 && <> <span className="text-ink-100">{stats.total} edition{stats.total === 1 ? "" : "s"} and counting.</span></>}
        </p>
      </header>

      {months.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-[14px] text-ink-300">The timeline begins with the first edition — published on the next daily research run.</p>
        </div>
      ) : (
        <div className="relative space-y-12">
          {months.map((m) => (
            <section key={m.key}>
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="font-display text-[20px] text-ink-100">{m.label}</h2>
                <span className="text-[11px] text-ink-500">{m.editions.length} edition{m.editions.length === 1 ? "" : "s"}</span>
              </div>
              <ol className="border-l border-white/[0.08] ml-1.5 space-y-1">
                {m.editions.map((e) => (
                  <li key={e.edition} className="relative">
                    <span className="absolute -left-[5px] top-[18px] w-2 h-2 rounded-full" style={{ background: GOLD }} aria-hidden />
                    <Link
                      href={`/research/${e.edition}`}
                      className="block pl-6 pr-4 py-3.5 rounded-lg hover:bg-white/[0.03] group transition-colors"
                    >
                      <div className="flex items-center gap-3 text-[11px] mb-1">
                        <span className="font-mono" style={{ color: GOLD }}>#{e.edition}</span>
                        <span className="text-ink-500">{e.slug}</span>
                        <span className="text-ink-500">·</span>
                        <span className="text-ink-400">{e.feature.title}</span>
                        <span className="ml-auto text-ink-500">Context {e.contextScore.score}</span>
                      </div>
                      <div className="text-[14px] text-ink-200 group-hover:text-ink-50 leading-snug line-clamp-1">{e.take}</div>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
