import { executiveSummary, type Tile, type DeltaTone } from "@/lib/executiveSummary";
import { AdminLogin } from "@/components/AdminLogin";
import { isAdmin, adminConfigured } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Executive summary — halvinglens.com", robots: { index: false } };

// One-screen CEO/Founder executive summary — a calm, dense financial-terminal
// read across audience, growth, social, content, email and performance. Every
// number traces to a real aggregator (executiveSummary composes them); anything
// without a live source renders as an em-dash with a short note, never a guess.
// Admin-gated exactly like /admin/metrics.
export default async function AdminExecutivePage() {
  if (!adminConfigured()) {
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl leading-relaxed">
          Set <code className="text-accent">ANALYTICS_DASHBOARD_KEY</code> in the environment to enable the dashboard.
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

  const s = await executiveSummary();
  if (!s.configured) {
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl">
          Supabase isn&apos;t configured yet — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and run{" "}
          <code className="text-accent">supabase/analytics.sql</code>.
        </p>
      </Shell>
    );
  }

  const asOf = new Date(s.generatedAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

  return (
    <Shell asOf={asOf}>
      <div className="space-y-5">
        {s.groups.map((group) => (
          <section key={group.key}>
            <h2 className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink-500 mb-2">{group.title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
              {group.tiles.map((t) => (
                <StatTile key={t.label} tile={t} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-8 pt-5 border-t border-white/[0.06] text-[11px] text-ink-500 max-w-2xl leading-relaxed">
        Live first-party analytics — no fabricated figures. Social counts are manual snapshots entered in the Founder
        Journal (dated per tile). An em-dash means there&apos;s no source connected yet, not zero.
      </p>
    </Shell>
  );
}

const TONE: Record<DeltaTone, string> = {
  up: "text-signal-green",
  down: "text-signal-red",
  neutral: "text-ink-500",
};
const ARROW: Record<DeltaTone, string> = { up: "▲", down: "▼", neutral: "·" };

function StatTile({ tile }: { tile: Tile }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-3.5">
      <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-400">{tile.label}</div>
      <div
        className={`mt-1.5 font-mono text-[20px] tabular-nums leading-none ${
          tile.available ? "text-ink-50" : "text-ink-500"
        }`}
      >
        {tile.value}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5 min-h-[14px]">
        {tile.delta && tile.deltaTone && (
          <span className={`text-[10.5px] font-mono tabular-nums ${TONE[tile.deltaTone]}`}>
            {ARROW[tile.deltaTone]} {tile.delta}
          </span>
        )}
        {tile.sub && <span className="text-[10px] text-ink-500 truncate">{tile.sub}</span>}
      </div>
    </div>
  );
}

function Shell({ children, asOf }: { children: React.ReactNode; asOf?: string }) {
  return (
    <div className="space-y-6">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-3">Internal · Executive</div>
        <h1 className="font-display text-[32px] lg:text-[40px] font-medium tracking-tightest text-ink-50">
          Executive Summary
        </h1>
        <p className="mt-3 text-[12.5px] text-ink-400">
          {asOf ? (
            <>
              as of <span className="text-ink-200 tabular-nums">{asOf} UTC</span> · every figure is live first-party
              data or a dated manual entry — no estimates.
            </>
          ) : (
            "The one-screen read on the whole business."
          )}
        </p>
      </header>
      {children}
    </div>
  );
}
