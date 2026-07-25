import Link from "next/link";
import { METRICS } from "@/lib/metrics";
import { metricStatus, metricSource } from "@/lib/cycleIntel";

const DESC =
  "How HalvingLens is calculated: definitions, data sources, update frequency, and a clear distinction between live market data, derived metrics, modelled estimates and editorial interpretation.";
export const metadata = {
  title: { absolute: "Methodology & Data Transparency | HalvingLens" },
  description: DESC,
  alternates: { canonical: "/methodology" },
  openGraph: { title: "Methodology & Data Transparency", description: DESC, url: "/methodology", type: "website" },
  twitter: { card: "summary_large_image", title: "Methodology & Data Transparency", description: DESC },
};

const GOLD = "#d9b96a";

// Honest status labels derived from the SAME classifier the product uses, so this
// page can never drift from what's actually shown. Never label a modelled metric
// as live.
const STATUS: Record<string, { label: string; color: string; note: string }> = {
  live: { label: "Live", color: "#5fd0a0", note: "Sourced from live market data, refreshed daily." },
  "live-derived": { label: "Derived", color: "#e0a64f", note: "Computed by HalvingLens from live inputs (e.g. price history)." },
  modelled: { label: "Modelled", color: "#a78bfa", note: "Calculated from documented, versioned assumptions applied to observed network data (e.g. Cost of Production). Always displayed with the MODELLED badge — historical context, never an exact observable value." },
  "coming-soon": { label: "Modelled — not yet live", color: "#8c919c", note: "Shown as modelled/illustrative only; hidden from the live product until a licensed data source is connected. Never presented as a live reading." },
};

export default function MethodologyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <header className="space-y-4 pb-6 border-b border-white/[0.08]">
        <div className="text-[10.5px] uppercase tracking-[0.24em]" style={{ color: GOLD }}>Methodology</div>
        <h1 className="font-display text-[34px] lg:text-[44px] leading-[1.05] text-ink-50 tracking-tightest">
          Methodology &amp; data transparency
        </h1>
        <p className="text-[15px] text-ink-300 leading-relaxed">
          Everything HalvingLens publishes traces back to real data or is labelled as modelled. This
          page sets out how each metric is defined and sourced, and — critically — which figures are
          live, which are derived, which are modelled, and which are editorial judgement.
        </p>
      </header>

      {/* The four categories */}
      <section className="space-y-4">
        <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100">The four kinds of number on this site</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Category color="#5fd0a0" title="Live market data" body="Prices and market values fetched from public sources and refreshed daily. Facts, not interpretation." />
          <Category color="#e0a64f" title="Derived metrics" body="Calculated by HalvingLens from live inputs (e.g. drawdowns, cycle-day alignment, accumulation scoring). The formula is ours; the inputs are live." />
          <Category color="#8c919c" title="Modelled estimates" body="On-chain metrics we cannot yet source live are modelled for illustration and kept out of the live product — clearly marked, never shown as live. One clearly-marked exception is published: Cost of Production, a modelled electricity-cost estimate with documented, versioned assumptions, always displayed with the MODELLED badge and a visible methodology." />
          <Category color={GOLD} title="Editorial interpretation" body="The written read — what today's data means in historical context. Judgement, clearly the voice of the publication, never a prediction." />
        </div>
      </section>

      {/* Update frequency + revisions */}
      <section className="space-y-3">
        <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100">Update frequency &amp; revisions</h2>
        <p className="text-[14px] text-ink-300 leading-relaxed">
          Live and derived data refresh daily. Historical values can be revised when an upstream
          source restates data or when a calculation is improved; when that happens the change applies
          across the archive so the record stays internally consistent. Editions themselves are dated
          and never rewritten after publication.
        </p>
      </section>

      {/* Per-metric transparency */}
      <section className="space-y-4">
        <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100">Metric-by-metric</h2>
        <div className="space-y-3">
          {METRICS.map((m) => {
            const st = STATUS[metricStatus(m.slug)] ?? STATUS["coming-soon"];
            return (
              <div key={m.slug} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/metrics/${m.slug}`} className="text-[15px] font-medium text-ink-100 hover:text-accent transition-colors">
                      {m.name}
                    </Link>
                    <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500 mt-0.5">{m.group}</div>
                  </div>
                  <span
                    className="shrink-0 text-[10.5px] uppercase tracking-[0.12em] px-2 py-1 rounded-md border"
                    style={{ color: st.color, borderColor: `${st.color}44` }}
                  >
                    {st.label}
                  </span>
                </div>
                <dl className="mt-3 space-y-2 text-[13px]">
                  <Row label="Definition">{m.description}</Row>
                  <Row label="Why we use it">{m.why}</Row>
                  <Row label="Data source">{metricSource(m.slug)}</Row>
                  <Row label="Status">{st.note}</Row>
                </dl>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100">Limitations &amp; known gaps</h2>
        <ul className="space-y-2 text-[14px] text-ink-300 leading-relaxed list-disc pl-5">
          <li>Several on-chain metrics are modelled and deliberately withheld from the live product until a licensed live source is connected — they are never shown as live readings.</li>
          <li>Historical context is not predictive. Similarity to a past moment does not imply a repeat.</li>
          <li>Sentiment and flow data depend on third-party providers and can lag or be revised.</li>
        </ul>
      </section>

      <p className="pt-6 border-t border-white/[0.06] text-[11px] text-ink-500">
        Questions on methodology? See <Link href="/about" className="text-accent">About</Link>. Historical
        context, not prediction; not financial advice.
      </p>
    </div>
  );
}

function Category({ color, title, body }: { color: string; title: string; body: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-[13.5px] font-medium text-ink-100">{title}</span>
      </div>
      <p className="mt-2 text-[12.5px] text-ink-400 leading-relaxed">{body}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3">
      <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-500 pt-0.5">{label}</dt>
      <dd className="text-ink-300 leading-relaxed">{children}</dd>
    </div>
  );
}
