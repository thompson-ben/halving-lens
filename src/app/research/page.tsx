import { ResearchLibrary } from "@/components/ResearchLibrary";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { allEditions, libraryStats } from "@/lib/research";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const metadata = {
  title: "Morning Research Library — halvinglens.com",
  description:
    "Every edition of HalvingLens Research, permanently archived. A daily Bitcoin cycle research note — searchable, dated and historically accurate forever. Educational context, not advice.",
  alternates: { canonical: "/research" },
};

const GOLD = "#d9b96a";

export default function ResearchLibraryPage() {
  const stats = libraryStats();
  // Cap the client payload; the archive can grow into the thousands.
  const editions = allEditions().slice(0, 400);

  return (
    <div className="space-y-12">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
          HalvingLens Research
        </div>
        <h1 className="font-display text-[34px] sm:text-[46px] font-medium tracking-tightest text-ink-50 leading-[1.05]">
          Morning Research Library
        </h1>
        <p className="mt-4 text-[14.5px] text-ink-300 leading-relaxed max-w-2xl">
          Every edition of HalvingLens Research, permanently archived — a daily Bitcoin cycle note,
          dated and historically accurate forever. <span className="text-ink-100">The website is the evidence; the research is the thinking.</span>
        </p>
        {stats.total > 0 && (
          <Link href="/research/timeline" className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-soft">
            Read the timeline <ArrowUpRight size={14} />
          </Link>
        )}
      </header>

      {stats.total === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-[14px] text-ink-300">The library is being published — the first edition lands with the next daily research run.</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
            <Stat label="Editions" value={stats.total.toLocaleString()} />
            <Stat label="First edition" value={stats.firstDate ?? "—"} />
            <Stat label="Latest" value={stats.latestDate ?? "—"} />
            <Stat label="Avg Context Score" value={stats.avgContextScore != null ? `${stats.avgContextScore}` : "—"} />
            <Stat label="Research streak" value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`} />
          </section>

          <ResearchLibrary editions={editions} />
        </>
      )}

      <FeedbackWidget section="research_library" contentType="research" label="Is the research library useful?" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-5">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className="mt-1.5 font-mono text-[18px] tabular-nums text-ink-50">{value}</div>
    </div>
  );
}
