import { cookies } from "next/headers";
import { AdminLogin } from "@/components/AdminLogin";
import { experimentResults, type ExperimentResult } from "@/lib/experimentAnalytics";
import type { ExperimentStatus } from "@/lib/data/experimentRegistry";

export const dynamic = "force-dynamic";
export const metadata = { title: "Experiments — halvinglens.com", robots: { index: false } };

const STATUS_TONE: Record<ExperimentStatus, string> = {
  running: "text-signal-green border-signal-green/30 bg-signal-green/[0.08]",
  planned: "text-[#d9b96a] border-[#4a3f23] bg-[#d9b96a]/[0.08]",
  completed: "text-ink-300 border-white/[0.12] bg-white/[0.03]",
  cancelled: "text-ink-500 border-white/[0.1] bg-white/[0.02]",
};

export default async function ExperimentsPage({ searchParams }: { searchParams: { key?: string } }) {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;
  const cookieKey = cookies().get("hl_admin")?.value;
  const authed = !!expected && (cookieKey === expected || searchParams.key === expected);
  if (!authed) return <Shell>{expected ? <AdminLogin /> : <p className="text-[14px] text-ink-300">Set ANALYTICS_DASHBOARD_KEY to enable.</p>}</Shell>;

  const results = await experimentResults();
  const completed = results.filter((r) => r.spec.status === "completed");

  return (
    <Shell>
      <p className="text-[12.5px] text-ink-400 max-w-2xl -mt-2">
        Every A/B test, its hypothesis, live results and decision — version-controlled in
        <span className="font-mono text-ink-300"> src/lib/data/experimentRegistry.ts</span>. Add or update an experiment
        there; results compute automatically from first-party events.
      </p>

      <section className="space-y-4">
        {results.map((r) => (
          <ExperimentCard key={r.spec.id} r={r} />
        ))}
      </section>

      {/* Growth Knowledge Base */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#d9b96a] mb-3">Growth Knowledge Base</h2>
        {completed.length === 0 ? (
          <p className="text-[12.5px] text-ink-500">No completed experiments yet. When one finishes, set its status, winner and lessons in the registry — it&apos;s recorded here permanently so we never repeat a failed test.</p>
        ) : (
          <div className="space-y-3">
            {completed.map((r) => (
              <div key={r.spec.id} className="card p-5">
                <div className="text-[14px] font-medium text-ink-100">{r.spec.title}</div>
                <div className="mt-1 text-[12.5px] text-ink-400">{r.spec.lessons ?? "—"}</div>
                <div className="mt-2 text-[11.5px] text-ink-500">
                  Winner: <span className="text-ink-300">{r.spec.winner ?? "—"}</span> · Decision: {r.spec.decision ?? "—"} ·
                  Kept live: {r.spec.liveChange ? "yes" : "no"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}

function ExperimentCard({ r }: { r: ExperimentResult }) {
  const s = r.spec;
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-[0.12em] ${STATUS_TONE[s.status]}`}>{s.status}</span>
            <span className="text-[15px] font-medium text-ink-50">{s.title}</span>
          </div>
          <div className="mt-1.5 text-[12.5px] text-ink-400 max-w-2xl">{s.description}</div>
        </div>
        <div className="text-right text-[11px] text-ink-500">
          <div>{s.surface}</div>
          <div>{s.owner}{s.startDate ? ` · from ${s.startDate}` : ""}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[12.5px]">
        <Field label="Hypothesis" value={s.hypothesis} />
        <Field label="Why we believe this" value={s.rationale} />
        <Field label="Primary KPI" value={s.primaryKpi} />
        <Field label="Secondary KPIs" value={(s.secondaryKpis ?? []).join(", ") || "—"} />
      </div>

      {/* Results */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[480px]">
          <thead>
            <tr className="text-ink-500 text-[10.5px] uppercase tracking-[0.12em]">
              <th className="text-left font-normal pb-2">Variant</th>
              <th className="text-right font-normal pb-2">Visitors</th>
              <th className="text-right font-normal pb-2">Conversions</th>
              <th className="text-right font-normal pb-2">Rate</th>
            </tr>
          </thead>
          <tbody>
            {r.results.map((v) => {
              const isBest = v.key === r.bestKey;
              return (
                <tr key={v.key} className={`border-t border-white/[0.06] ${isBest ? "bg-accent/[0.06]" : ""}`}>
                  <td className="py-2 text-ink-200">
                    {v.key.toUpperCase()} · {v.label}
                    {v.key === r.controlKey && <span className="ml-2 text-[10px] uppercase tracking-wide text-ink-500">control</span>}
                  </td>
                  <td className="py-2 text-right font-mono text-ink-300">{v.visitors.toLocaleString()}</td>
                  <td className="py-2 text-right font-mono text-ink-300">{v.conversions.toLocaleString()}</td>
                  <td className={`py-2 text-right font-mono ${isBest ? "text-accent" : "text-ink-100"}`}>{v.conversionRate != null ? `${v.conversionRate}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
        <span className="text-ink-400">Lift: <span className={r.liftPct != null && r.liftPct >= 0 ? "text-signal-green" : "text-signal-red"}>{r.liftPct != null ? `${r.liftPct >= 0 ? "+" : ""}${r.liftPct}%` : "—"}</span></span>
        <span className="text-ink-400">Confidence: <span className="text-ink-100">{r.confidence != null ? `${r.confidence}%` : "—"}</span> {r.significant ? "✓ significant" : "(keep running)"}</span>
        <span className="text-ink-400">Sample: <span className="text-ink-100">{r.totalVisitors.toLocaleString()}</span> visitors</span>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-ink-500">{label}: </span>
      <span className="text-ink-300">{value}</span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-8">
      <header>
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-[#d9b96a]">Growth · internal</div>
        <h1 className="mt-2 font-display text-[28px] lg:text-[34px] text-ink-50 tracking-tight-2">Experiments</h1>
      </header>
      {children}
    </div>
  );
}
