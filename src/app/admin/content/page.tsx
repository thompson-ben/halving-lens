import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { AdminLogin } from "@/components/AdminLogin";
import { ContentPackStudio, type StudioPack } from "@/components/ContentPackStudio";
import { buildPack, CARD_LABELS, type Deck, type PackId } from "@/lib/contentCards";
import { contentPack } from "@/lib/brief";
import { historicalContentPack } from "@/lib/historicalPack";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Content Pack Generator — halvinglens.com",
  robots: { index: false },
};

// Admin-only Daily Content Pack studio: one-click branded carousel cards + copy
// blocks, all generated from today's Daily Brief. Auth via the metrics dashboard
// session cookie (or ?key= match). Noindex, unlinked from public nav.
export default function ContentPackPage({ searchParams }: { searchParams: { key?: string } }) {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;

  if (!expected) {
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl leading-relaxed">
          Set <code className="text-accent">ANALYTICS_DASHBOARD_KEY</code> in the environment to
          enable the studio.
        </p>
      </Shell>
    );
  }

  const cookieKey = cookies().get("hl_admin")?.value;
  const authed = cookieKey === expected || searchParams.key === expected;
  if (!authed) {
    return (
      <Shell>
        <AdminLogin />
      </Shell>
    );
  }

  const toStudioPack = (
    id: PackId,
    label: string,
    deck: Deck,
    content: ReturnType<typeof contentPack>,
  ): StudioPack => ({
    id,
    label,
    slug: deck.slug,
    dateLabel: deck.dateLabel,
    cards: deck.cards.map((c) => ({ id: c.id, index: c.index, name: CARD_LABELS[c.id].name })),
    copy: {
      caption: content.instagram,
      thread: content.xThread.join("\n\n"),
      linkedin: content.linkedin,
      email: `Subject: ${content.emailSubject}\n\n${content.emailBody}`,
    },
  });

  const packs: StudioPack[] = [
    toStudioPack("daily", "Generate Daily Brief Pack", buildPack("daily"), contentPack()),
    toStudioPack("historical", "Generate Historical Context Pack", buildPack("historical"), historicalContentPack()),
  ];

  return (
    <Shell>
      <ContentPackStudio packs={packs} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-7">
      <header className="pt-2">
        <Link
          href="/admin/metrics"
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-ink-200 mb-4"
        >
          <ArrowLeft size={13} /> Metrics dashboard
        </Link>
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-3">Internal</div>
        <h1 className="font-display text-[32px] lg:text-[40px] font-medium tracking-tightest text-ink-50">
          Content Pack Generator
        </h1>
        <p className="mt-3 text-[13.5px] text-ink-300 max-w-2xl leading-relaxed">
          One-click branded carousels from the live cycle data — pick the{" "}
          <span className="text-ink-100">Daily Brief Pack</span> or the{" "}
          <span className="text-ink-100">Historical Context Pack</span> (which leads with the
          strongest historical narrative: drawdowns, cycle position or sentiment). Each produces
          Instagram-ready cards plus captions for X, LinkedIn and email. Generated server-side; no
          manual design.
        </p>
      </header>
      {children}
    </div>
  );
}
