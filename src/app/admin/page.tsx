import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AdminLogin } from "@/components/AdminLogin";
import { TestimonialModeration } from "@/components/TestimonialModeration";
import { isAdmin, adminConfigured } from "@/lib/adminAuth";
import { pendingTestimonials } from "@/lib/testimonials";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — halvinglens.com", robots: { index: false } };

// The Admin Hub — the single operational control centre. Every admin area links
// from here; future admin functionality should be added as a card rather than a
// stray page. Items without a route yet are shown as "soon".

interface AdminItem {
  label: string;
  href?: string;
  soon?: boolean;
}
interface AdminSection {
  title: string;
  emoji: string;
  items: AdminItem[];
}

const SECTIONS: AdminSection[] = [
  {
    title: "Growth",
    emoji: "📈",
    items: [
      { label: "Founder Intelligence", href: "/admin/founder" },
      { label: "Growth Dashboard", href: "/admin/growth" },
      { label: "Lifecycle Analytics", href: "/admin/lifecycle" },
      { label: "Share campaigns", href: "/admin/campaigns" },
      { label: "Experiments", href: "/admin/experiments" },
      { label: "Funnel & WAES", href: "/admin/growth" },
      { label: "Recommendations", href: "/admin/growth" },
      { label: "Referrals", href: "/admin/growth" },
    ],
  },
  {
    title: "Content",
    emoji: "📝",
    items: [
      { label: "Daily Brief", href: "/brief" },
      { label: "Weekly Research", href: "/weekly" },
      { label: "Research Library", href: "/research" },
      { label: "Research Findings", href: "/research/findings" },
      { label: "Email preview", href: "/api/admin/founder-report-preview" },
    ],
  },
  {
    title: "Analytics",
    emoji: "📊",
    items: [
      { label: "Executive summary", href: "/admin/executive" },
      { label: "Lifecycle Analytics", href: "/admin/lifecycle" },
      { label: "Website Analytics", href: "/admin/analytics" },
      { label: "Visitor Journeys", href: "/admin/journeys" },
      { label: "Email Analytics", href: "/admin/growth" },
      { label: "Campaign Analytics", href: "/admin/growth" },
      { label: "Metrics admin", href: "/admin/metrics" },
      { label: "Behaviour", href: "/admin/analytics" },
    ],
  },
  {
    title: "Community",
    emoji: "👥",
    items: [
      { label: "Subscribers", soon: true },
      { label: "HalvingLens Profiles", soon: true },
      { label: "Badges", soon: true },
      { label: "Leaderboards", href: "/admin/growth" },
      { label: "Premium", soon: true },
    ],
  },
  {
    title: "Founder",
    emoji: "👤",
    items: [
      { label: "Weekly Report", href: "/api/admin/founder-report-preview" },
      { label: "Founder Journal", href: "/admin/founder-journal" },
      { label: "KPIs", href: "/admin/growth" },
      { label: "Experiment History", href: "/admin/experiments" },
      { label: "Revenue", soon: true },
    ],
  },
  {
    title: "Platform",
    emoji: "⚙️",
    items: [
      { label: "Health", href: "/admin/growth" },
      { label: "Jobs", soon: true },
      { label: "Feature Flags", soon: true },
      { label: "Logs", soon: true },
      { label: "Settings", soon: true },
    ],
  },
];

export default async function AdminHub() {
  if (!isAdmin())
    return (
      <Shell>{adminConfigured() ? <AdminLogin /> : <p className="text-[14px] text-ink-300">Set ANALYTICS_DASHBOARD_KEY to enable.</p>}</Shell>
    );

  const pending = await pendingTestimonials();

  return (
    <Shell>
      <TestimonialModeration pending={pending} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((s) => (
          <div key={s.title} className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[15px]">{s.emoji}</span>
              <span className="text-[11px] uppercase tracking-[0.18em] text-[#d9b96a]">{s.title}</span>
            </div>
            <div className="space-y-0.5">
              {s.items.map((it) =>
                it.href && !it.soon ? (
                  <Link key={it.label} href={it.href} className="group flex items-center justify-between gap-2 px-2 py-1.5 -mx-2 rounded-lg hover:bg-white/[0.03]">
                    <span className="text-[13px] text-ink-200 group-hover:text-ink-50">{it.label}</span>
                    <ArrowUpRight size={13} className="text-ink-500 group-hover:text-accent" />
                  </Link>
                ) : (
                  <div key={it.label} className="flex items-center justify-between gap-2 px-2 py-1.5">
                    <span className="text-[13px] text-ink-500">{it.label}</span>
                    <span className="text-[9.5px] uppercase tracking-wide text-ink-600 border border-white/[0.08] rounded px-1.5 py-0.5">soon</span>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-8">
      <header>
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-[#d9b96a]">HalvingLens · Control centre</div>
        <h1 className="mt-2 font-display text-[30px] lg:text-[38px] text-ink-50 tracking-tight-2">Admin</h1>
        <p className="mt-2 text-[13px] text-ink-400">Every operational area, in one place.</p>
      </header>
      {children}
    </div>
  );
}
