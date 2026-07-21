import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { allWeeklies, weeklyStats } from "@/lib/weekly";

export const metadata = {
  title: "Weekly Research Archive",
  description: "Every edition of HalvingLens Weekly Research, permanently archived. Educational historical context, not advice.",
  alternates: { canonical: "/weekly/archive" },
};

const GOLD = "#d9b96a";

export default function WeeklyArchivePage() {
  const all = allWeeklies();
  const stats = weeklyStats();

  return (
    <div className="space-y-8">
      <Link href="/weekly" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">
        <ArrowLeft size={13} /> Latest weekly
      </Link>
      <header className="pt-1">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>HalvingLens Weekly Research</div>
        <h1 className="font-display text-[32px] sm:text-[44px] font-medium tracking-tightest text-ink-50 leading-[1.05]">Weekly Archive</h1>
        <p className="mt-4 text-[14px] text-ink-300 max-w-2xl">
          Every weekly report, permanently archived. {stats.total > 0 && <span className="text-ink-100">{stats.total} report{stats.total === 1 ? "" : "s"} and counting.</span>}
        </p>
      </header>

      {all.length === 0 ? (
        <div className="card p-8 text-center"><p className="text-[14px] text-ink-300">The first weekly publishes this Sunday.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {all.map((w) => (
            <Link key={w.slug} href={`/weekly/${w.slug}`} className="card card-interactive p-5 group hover:border-accent/30">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono" style={{ color: GOLD }}>Weekly #{w.edition}</span>
                <span className="text-ink-500">{w.weekLabel}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="font-display text-[16px] text-ink-50 line-clamp-2">{w.biggestStory.title}</span>
                <ArrowUpRight size={15} className="text-accent shrink-0" />
              </div>
              <div className="mt-2 text-[11px] text-ink-500">Context Score {w.contextScore.score} · {w.metrics.sentiment}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
