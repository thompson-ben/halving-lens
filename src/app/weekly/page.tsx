import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { WeeklyReport } from "@/components/WeeklyReport";
import { ResearchHubNav } from "@/components/ResearchHubNav";
import { RelatedResearch } from "@/components/RelatedResearch";
import { ShareButtons } from "@/components/ShareButtons";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { latestWeekly, weeklyStats } from "@/lib/weekly";
import { absoluteUrl } from "@/lib/site";

export const metadata = {
  title: "HalvingLens Weekly Research — halvinglens.com",
  description:
    "A premium weekly Bitcoin cycle research report, published every Sunday. The week's story in historical context — not predictions, not advice.",
  alternates: { canonical: "/weekly" },
};

const GOLD = "#d9b96a";

export default function WeeklyPage() {
  const w = latestWeekly();
  const stats = weeklyStats();

  return (
    <div className="space-y-10">
      <ResearchHubNav active="weekly" />
      <header className="pt-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>HalvingLens Weekly Research</div>
          <div className="flex items-center gap-4">
            {w && (
              <a href={`/weekly/${w.slug}/print`} className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">
                Save as PDF
              </a>
            )}
            {stats.total > 0 && (
              <Link href="/weekly/archive" className="inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft">
                Weekly archive <ArrowUpRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </header>

      {!w ? (
        <div className="card p-8 text-center">
          <p className="text-[14px] text-ink-300">The first weekly report publishes this Sunday.</p>
        </div>
      ) : (
        <>
          <WeeklyReport w={w} liveChart />
          <section className="border-t border-white/[0.06] pt-6">
            <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>Share this week</div>
            <ShareButtons url={absoluteUrl(`/weekly/${w.slug}`)} title={`HalvingLens Weekly Research: ${w.biggestStory.title}`} edition={w.edition} />
          </section>
        </>
      )}

      <RelatedResearch topics={["Accumulation", "Dynamic DCA", "Fear & Greed"]} heading="Original Research Findings" limit={2} />

      <FeedbackWidget section="weekly_research" contentType="weekly" label="Is the weekly research useful?" />
    </div>
  );
}
