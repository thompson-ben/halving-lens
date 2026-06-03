import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { AdminLogin } from "@/components/AdminLogin";
import { ContentPackStudio, type StudioCard } from "@/components/ContentPackStudio";
import { buildDeck, CARD_LABELS } from "@/lib/contentCards";
import { contentPack } from "@/lib/brief";

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

  const deck = buildDeck();
  const cards: StudioCard[] = deck.cards.map((c) => ({
    id: c.id,
    index: c.index,
    name: CARD_LABELS[c.id].name,
  }));

  const pack = contentPack();
  const copy = {
    caption: pack.instagram,
    thread: pack.xThread.join("\n\n"),
    linkedin: pack.linkedin,
    email: `Subject: ${pack.emailSubject}\n\n${pack.emailBody}`,
  };

  return (
    <Shell>
      <ContentPackStudio slug={deck.slug} dateLabel={deck.dateLabel} cards={cards} copy={copy} />
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
          One-click branded carousel from today&apos;s Daily Brief — a full set of Instagram-ready
          cards plus captions for X, LinkedIn and email. Generated server-side from the live data;
          no manual design.
        </p>
      </header>
      {children}
    </div>
  );
}
