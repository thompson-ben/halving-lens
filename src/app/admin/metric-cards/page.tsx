import Link from "next/link";
import { AdminLogin } from "@/components/AdminLogin";
import { adminConfigured, isAdmin } from "@/lib/adminAuth";
import { metricCardsGallery, type CardPeriod, type AnyCardPayload } from "@/lib/metricCards";

// MW2-B — the Metric Content Pack gallery: a VISUAL EDITORIAL DESK, not
// another analytics table. The grid shows the ACTUAL social creatives
// (the same images the export produces), grouped and sized by the
// canonical significance hierarchy — Worth Looking At dominates, routine
// recedes — so the founder's workflow is OPEN → SCAN → something jumps
// out → select. The verdict header is the dashboard's own week verdict;
// Most Interesting / One to Watch stay distinct from the movers grouping.
// Selection + export land in MW2-C; this page is the scanning surface.

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const PERIODS: CardPeriod[] = [1, 7, 30];
const PERIOD_LABEL: Record<number, string> = { 1: "1D", 7: "7D", 30: "30D" };

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-6xl mx-auto space-y-8">{children}</div>;
}

function Thumb({ card, period, big }: { card: AnyCardPayload; period: CardPeriod; big?: boolean }) {
  const src = `/cards/metric/${card.metricId}${period === 7 ? "" : `?period=${period}`}`;
  return (
    <a href={src} target="_blank" rel="noreferrer" className={`block ${big ? "" : "opacity-60 hover:opacity-100 transition-opacity"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${card.label} card`}
        className={`w-full rounded-lg border ${big ? "border-editorial/30" : "border-white/[0.08]"}`}
        style={{ aspectRatio: "4 / 5" }}
      />
    </a>
  );
}

function Group({ title, cards, period, big }: { title: string; cards: AnyCardPayload[]; period: CardPeriod; big?: boolean }) {
  if (cards.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className={`eyebrow mb-3 ${big ? "text-editorial" : "text-ink-500"}`}>{title}</h2>
      <div className={`grid gap-4 ${big ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
        {cards.map((c) => (
          <Thumb key={c.metricId} card={c} period={period} big={big} />
        ))}
      </div>
    </section>
  );
}

export default function MetricCardsPage({ searchParams }: { searchParams?: { period?: string; anchor?: string } }) {
  if (!adminConfigured()) {
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl leading-relaxed">
          Set <code className="text-accent">ANALYTICS_DASHBOARD_KEY</code> in the environment to enable the studio.
        </p>
      </Shell>
    );
  }
  if (!isAdmin()) {
    return (
      <Shell>
        <AdminLogin />
      </Shell>
    );
  }

  const period: CardPeriod = searchParams?.period === "1" ? 1 : searchParams?.period === "30" ? 30 : 7;
  // Admin-only review affordance: ?anchor=YYYY-MM-DD re-anchors the verdict
  // and grouping to a historical day (e.g. inspecting a quiet week's state).
  // Card THUMBNAILS always render live data — the card route is
  // deliberately anchor-free, social cards are always "today" — so a
  // banner discloses the mixture whenever an anchor is set.
  const anchor = searchParams?.anchor && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.anchor) ? searchParams.anchor : undefined;
  const g = metricCardsGallery(period, anchor);
  const quietWatch = g.watch.mostInteresting === null && g.watch.oneToWatch === null;

  return (
    <Shell>
      <header className="space-y-3">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="eyebrow text-accent">Metric content pack</h1>
          <nav aria-label="Card period" className="flex items-baseline gap-3">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={p === 7 ? "/admin/metric-cards" : `/admin/metric-cards?period=${p}`}
                aria-current={period === p ? "true" : undefined}
                className={`eyebrow ${period === p ? "text-ink-100" : "text-ink-600 hover:text-ink-300"}`}
              >
                {PERIOD_LABEL[p]}
              </Link>
            ))}
          </nav>
        </div>
        {/* The week's verdict — the dashboard's own, verbatim */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-1.5">
          <div className="font-display text-headline font-medium text-ink-50">{g.verdict.activityLabel}</div>
          <p className="text-caption text-ink-400">{g.verdict.countsLine}</p>
          {quietWatch ? (
            <p className="text-caption text-ink-500">
              <span className="text-ink-400">Metric Watch:</span> {g.watch.quietLine}
            </p>
          ) : (
            <>
              {g.watch.mostInteresting && (
                <p className="text-caption text-ink-300">
                  <span className="text-ink-400">Most interesting:</span> {g.watch.mostInteresting.headline}
                </p>
              )}
              {g.watch.oneToWatch && (
                <p className="text-caption text-ink-400">
                  <span className="text-ink-500">One to watch:</span> {g.watch.oneToWatch.headline}
                </p>
              )}
            </>
          )}
          <p className="text-micro text-ink-600">
            Cards as of {g.asOf} · 1080×1350 · selection &amp; export arrive in MW2-C
          </p>
          {anchor && (
            <p className="text-micro text-editorial">
              Review anchor {anchor}: verdict and grouping are historical — thumbnails render live data.
            </p>
          )}
        </div>
      </header>

      <Group title="Worth looking at" cards={g.worthLookingAt} period={period} big />
      <Group title="Also moving" cards={g.alsoMoving} period={period} />
      <Group title="Routine" cards={g.routine} period={period} />
      <Group title="Comparison maturing" cards={g.maturing} period={period} />

      {g.unavailable.length > 0 && (
        <section aria-label="Not observable">
          <h2 className="eyebrow text-ink-600 mb-2">Not observable at this period</h2>
          {g.unavailable.map((u) => (
            <p key={u.metricId} className="text-micro text-ink-600">
              {u.label} — {u.reason}
            </p>
          ))}
        </section>
      )}
    </Shell>
  );
}
