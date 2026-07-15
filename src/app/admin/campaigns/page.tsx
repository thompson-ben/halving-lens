import { AdminLogin } from "@/components/AdminLogin";
import { CampaignStudio, type DestOption, type CampaignRow } from "@/components/CampaignStudio";
import { shareDashboard } from "@/lib/shareAnalytics";
import { PRIMARY, EXPLORE } from "@/components/navItems";
import { allFindings } from "@/lib/findings";
import { isAdmin, adminConfigured } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Share campaigns — halvinglens.com", robots: { index: false } };

// Founder-only: create named share campaigns (branded short link + QR) for
// business cards, events, social profiles and printed marketing — each with its
// own attribution and analytics.
export default async function CampaignsPage() {
  if (!isAdmin())
    return <Shell>{adminConfigured() ? <AdminLogin /> : <p className="text-[14px] text-ink-300">Set ANALYTICS_DASHBOARD_KEY to enable.</p>}</Shell>;

  const { campaigns } = await shareDashboard();
  const rows: CampaignRow[] = campaigns.map((c) => ({
    slug: c.slug,
    name: c.name,
    destination: c.destination,
    scans: c.scans,
    visits: c.visits,
    subscribers: c.subscribers,
    conversionPct: c.conversionPct,
  }));

  // Destination options — the pages a campaign can point at.
  const options: DestOption[] = [
    ...PRIMARY.map((n) => ({ label: n.label, path: n.href })),
    ...EXPLORE.map((n) => ({ label: n.label, path: n.href })),
    ...allFindings().map((f) => ({ label: `${f.id} — ${f.title}`.slice(0, 60), path: `/research/findings/${f.slug}` })),
  ];

  return (
    <Shell>
      <CampaignStudio options={options} initial={rows} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-3 flex items-center gap-3">
          <span>Internal</span>
          <a href="/admin/growth" className="text-ink-500 hover:text-ink-300 normal-case tracking-normal text-[11px]">← Growth dashboard</a>
        </div>
        <h1 className="font-display text-[32px] lg:text-[40px] font-medium tracking-tightest text-ink-50">Share campaigns</h1>
        <p className="mt-3 text-[13.5px] text-ink-300 max-w-2xl">
          Branded short links + QR codes for the real world — networking, business cards, talks, social profiles. Every
          scan, visit and signup is attributed back to the campaign.
        </p>
      </header>
      {children}
    </div>
  );
}
