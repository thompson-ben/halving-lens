import { notFound } from "next/navigation";
import { WeeklyPrintView } from "@/components/WeeklyPrintView";
import { PrintControls } from "@/components/PrintControls";
import { getWeekly, allWeeklySlugs } from "@/lib/weekly";

export const metadata = { title: "Weekly Research — PDF", robots: { index: false } };

export function generateStaticParams() {
  return allWeeklySlugs().map((slug) => ({ slug }));
}

// A print-optimised, light-themed rendering for "Save as PDF". Auto-opens the
// browser print dialog; the document itself is black-on-white.
export default function WeeklyPrintPage({ params }: { params: { slug: string } }) {
  const w = getWeekly(params.slug);
  if (!w) notFound();
  return (
    <div className="print-page" style={{ background: "#fff", margin: "-40px -32px", minHeight: "100vh" }}>
      <PrintControls auto />
      <WeeklyPrintView w={w} />
    </div>
  );
}
