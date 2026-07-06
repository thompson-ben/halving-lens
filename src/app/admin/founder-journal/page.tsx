import { cookies } from "next/headers";
import { AdminLogin } from "@/components/AdminLogin";
import { FounderJournalForm } from "@/components/FounderJournalForm";
import { latestJournal } from "@/lib/companyHistory";

export const dynamic = "force-dynamic";
export const metadata = { title: "Founder Journal — halvinglens.com", robots: { index: false } };

// Admin-only page to write the monthly Founder Reflection and log manual metrics.
export default async function FounderJournalPage({ searchParams }: { searchParams: { key?: string } }) {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;
  const cookieKey = cookies().get("hl_admin")?.value;
  const authed = !!expected && (cookieKey === expected || searchParams.key === expected);

  if (!authed) {
    return (
      <div className="max-w-xl mx-auto px-5 py-10">
        {expected ? <AdminLogin /> : <p className="text-[14px] text-ink-300">Set ANALYTICS_DASHBOARD_KEY to enable.</p>}
      </div>
    );
  }

  const latest = await latestJournal();

  return (
    <div className="max-w-2xl mx-auto px-5 py-10 space-y-6">
      <header className="border-b border-white/[0.08] pb-5">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-500">Founder Review</div>
        <h1 className="mt-2 font-display text-[26px] text-ink-50 tracking-tight-2">Founder Journal</h1>
        <p className="mt-2 text-[13px] text-ink-400">
          The story behind the numbers. Your entry appears in the weekly Founder Review and builds a permanent, chronological record.
        </p>
      </header>
      <FounderJournalForm latest={latest} />
    </div>
  );
}
