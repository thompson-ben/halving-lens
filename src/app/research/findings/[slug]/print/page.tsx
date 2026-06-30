import { notFound } from "next/navigation";
import { format } from "date-fns";
import { PrintControls } from "@/components/PrintControls";
import { findingBySlug, findingSlugs } from "@/lib/findings";
import { simulateThreeWay, DISTRIBUTION_PRESETS } from "@/lib/accumulationDca";
import { forwardReturnByBand, pricedSentimentSeries, type SentimentBand } from "@/lib/sentiment";
import { fmtUsd } from "@/lib/format";
import { absoluteUrl } from "@/lib/site";

export const metadata = { title: "Research Finding — PDF", robots: { index: false } };

export function generateStaticParams() {
  return findingSlugs().map((slug) => ({ slug }));
}

const INK = "#16181d";
const SUB = "#454a53";
const DIM = "#787e88";
const HAIR = "#e2e4e8";
const GOLD = "#9a7b2e";

const SCEN = { standard: "Standard DCA", dynamic: "Dynamic DCA", distribute: "Dynamic DCA + Distribution" } as const;

function H({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: GOLD, fontWeight: 700, margin: "26px 0 10px" }}>
      {children}
    </div>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13.5, lineHeight: 1.65, color: SUB, margin: "0 0 9px" }}>{children}</p>;
}

export default function FindingPrintPage({ params }: { params: { slug: string } }) {
  const f = findingBySlug(params.slug);
  if (!f) notFound();

  let dl = f.datePublished;
  try {
    dl = format(new Date(f.datePublished), "d MMMM yyyy");
  } catch {
    /* keep iso */
  }

  const cfg = DISTRIBUTION_PRESETS.balanced;
  const sim = f.evidence === "dca-threeway" ? simulateThreeWay({ standardWeekly: 100, buyByBand: cfg.buy, targetSellPct: cfg.sell }) : null;
  const rows = sim ? [sim.standard, sim.dynamic, sim.distribute] : [];

  // Fear & Greed forward-return evidence (HL-R002).
  const FEAR_ORDER: SentimentBand[] = ["extreme-fear", "fear", "neutral", "greed", "extreme-greed"];
  const fearH = [30, 90, 365];
  const fearData =
    f.evidence === "fear-forward"
      ? (() => {
          const series = pricedSentimentSeries();
          const m = new Map<SentimentBand, { label: string; per: Record<number, { avg: number; n: number }> }>();
          for (const h of fearH) {
            for (const r of forwardReturnByBand(h)) {
              const e = m.get(r.band) ?? { label: r.label, per: {} };
              e.per[h] = { avg: r.avgReturn, n: r.count };
              m.set(r.band, e);
            }
          }
          return {
            rows: FEAR_ORDER.filter((b) => m.has(b)).map((b) => ({ band: b, ...m.get(b)! })),
            fromYear: series.length ? new Date(series[0].ts).getFullYear() : 2018,
            toYear: series.length ? new Date(series[series.length - 1].ts).getFullYear() : new Date().getUTCFullYear(),
            n: series.length,
          };
        })()
      : null;
  const pctR = (n: number) => `${n >= 0 ? "+" : ""}${Math.round(n)}%`;

  return (
    <div className="print-page" style={{ background: "#fff", margin: "-40px -32px", minHeight: "100vh" }}>
      <PrintControls auto />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "44px 40px 64px", fontFamily: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `2px solid ${INK}`, paddingBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, color: INK }}>HALVINGLENS RESEARCH</div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, color: GOLD }}>{f.id}</div>
        </div>

        <div style={{ fontSize: 11, color: DIM, marginTop: 14 }}>Research Finding · {dl}</div>
        <h1 style={{ fontSize: 27, lineHeight: 1.15, color: INK, margin: "8px 0 0", fontWeight: 700 }}>{f.title}</h1>
        <p style={{ fontSize: 15, lineHeight: 1.5, color: SUB, margin: "12px 0 0" }}>{f.headline}</p>
        <div style={{ fontSize: 11, color: DIM, marginTop: 10 }}>{f.topics.join(" · ")}</div>

        <H>Summary</H>
        <P>{f.summary}</P>

        <H>Key Conclusion</H>
        <P>{f.keyConclusion}</P>

        <H>Background</H>
        {f.background.map((p, i) => (
          <P key={i}>{p}</P>
        ))}

        <H>Methodology</H>
        {f.methodology.map((p, i) => (
          <P key={i}>
            {i + 1}. {p}
          </P>
        ))}

        <H>Historical Evidence</H>
        {f.evidenceIntro.map((p, i) => (
          <P key={i}>{p}</P>
        ))}
        {sim && (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginTop: 8 }}>
              <thead>
                <tr style={{ color: DIM, textAlign: "left" }}>
                  <th style={{ padding: "6px 0", fontWeight: 600 }}>Strategy</th>
                  <th style={{ padding: "6px 0", fontWeight: 600, textAlign: "right" }}>Your money</th>
                  <th style={{ padding: "6px 0", fontWeight: 600, textAlign: "right" }}>Bitcoin</th>
                  <th style={{ padding: "6px 0", fontWeight: 600, textAlign: "right" }}>End value</th>
                  <th style={{ padding: "6px 0", fontWeight: 600, textAlign: "right" }}>Per $1k</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} style={{ borderTop: `1px solid ${HAIR}` }}>
                    <td style={{ padding: "7px 0", color: INK, fontWeight: r.key === sim.bestKey ? 700 : 400 }}>
                      {SCEN[r.key]}
                      {r.key === sim.bestKey ? " ◂ most growth" : ""}
                    </td>
                    <td style={{ padding: "7px 0", textAlign: "right", color: SUB }}>{fmtUsd(r.investedNew, { compact: true })}</td>
                    <td style={{ padding: "7px 0", textAlign: "right", color: INK }}>{r.btc.toFixed(2)}</td>
                    <td style={{ padding: "7px 0", textAlign: "right", color: INK }}>{fmtUsd(r.endValue, { compact: true })}</td>
                    <td style={{ padding: "7px 0", textAlign: "right", color: INK, fontWeight: 600 }}>{fmtUsd(Math.round(r.valuePerThousand), { compact: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 10.5, color: DIM, marginTop: 8 }}>
              {cfg.label} preset · {sim.from} → {sim.to} · per $1,000 of new money · evidence as of {sim.to}.
            </div>
          </>
        )}
        {fearData && (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginTop: 8 }}>
              <thead>
                <tr style={{ color: DIM, textAlign: "left" }}>
                  <th style={{ padding: "6px 0", fontWeight: 600 }}>Sentiment that day</th>
                  <th style={{ padding: "6px 0", fontWeight: 600, textAlign: "right" }}>1 month</th>
                  <th style={{ padding: "6px 0", fontWeight: 600, textAlign: "right" }}>3 months</th>
                  <th style={{ padding: "6px 0", fontWeight: 600, textAlign: "right" }}>1 year</th>
                  <th style={{ padding: "6px 0", fontWeight: 600, textAlign: "right" }}>Days</th>
                </tr>
              </thead>
              <tbody>
                {fearData.rows.map((r) => (
                  <tr key={r.band} style={{ borderTop: `1px solid ${HAIR}` }}>
                    <td style={{ padding: "7px 0", color: INK, fontWeight: r.band === "extreme-fear" ? 700 : 400 }}>{r.label}</td>
                    <td style={{ padding: "7px 0", textAlign: "right", color: INK }}>{r.per[30] ? pctR(r.per[30].avg) : "—"}</td>
                    <td style={{ padding: "7px 0", textAlign: "right", color: INK }}>{r.per[90] ? pctR(r.per[90].avg) : "—"}</td>
                    <td style={{ padding: "7px 0", textAlign: "right", color: INK, fontWeight: 600 }}>{r.per[365] ? pctR(r.per[365].avg) : "—"}</td>
                    <td style={{ padding: "7px 0", textAlign: "right", color: SUB }}>{(r.per[90]?.n ?? r.per[30]?.n ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 10.5, color: DIM, marginTop: 8 }}>
              Fear &amp; Greed Index · daily · {fearData.fromYear}–{fearData.toYear} · {fearData.n.toLocaleString()} readings
              · average forward BTC return by band.
            </div>
          </>
        )}

        <H>Myth vs Reality</H>
        <P>
          <b>Myth:</b> {f.myth.myth}
        </P>
        <P>
          <b>Reality:</b> {f.myth.reality}
        </P>
        <P>
          <b>Takeaway:</b> {f.myth.takeaway}
        </P>

        <H>Limitations</H>
        {f.limitations.map((p, i) => (
          <P key={i}>• {p}</P>
        ))}

        <H>Why This Matters</H>
        {f.whyThisMatters.map((p, i) => (
          <P key={i}>{p}</P>
        ))}

        <div style={{ borderTop: `1px solid ${HAIR}`, marginTop: 28, paddingTop: 14, fontSize: 11, color: DIM, lineHeight: 1.6 }}>
          Cite as {f.id}. Permanent URL: {absoluteUrl(`/research/findings/${f.slug}`)}.<br />
          HalvingLens Research is educational and historical. Not investment advice, not a prediction. Past behaviour is
          not a guide to future results.
        </div>
      </div>
    </div>
  );
}
