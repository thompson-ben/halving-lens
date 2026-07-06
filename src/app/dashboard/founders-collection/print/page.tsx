import type { Metadata } from "next";
import { PrintControls } from "@/components/PrintControls";
import { cycleSummary, HEAT_LABEL } from "@/lib/cycleSummary";
import { fmtUsd } from "@/lib/format";

// Founder's Collection — printable one-page cycle summary. Light, black-on-white
// so the browser's "Save as PDF" produces a clean, premium document. Built from
// the live cycle read, so it stays current with zero upkeep.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "HalvingLens — Cycle Summary (PDF)", robots: { index: false } };

const INK = "#15171c";
const SUB = "#3f444d";
const DIM = "#6b7079";
const GOLD = "#9a7c2e";
const HAIR = "#e6e8ec";

export default function FoundersCollectionPrintPage() {
  const s = cycleSummary();
  const H = (t: string) => (
    <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: GOLD, margin: "0 0 8px", fontWeight: 600 }}>{t}</div>
  );
  const stats: { label: string; value: string }[] = [
    { label: "Cycle progress", value: `${s.progressPct}%` },
    { label: "Phase", value: s.phaseLabel },
    { label: "Risk read", value: HEAT_LABEL[s.heat] },
    { label: "Confidence", value: s.confidence[0].toUpperCase() + s.confidence.slice(1) },
    { label: "BTC price", value: fmtUsd(s.price) },
    { label: "From cycle high", value: `${s.drawdownFromAth > 0 ? "−" : ""}${Math.abs(s.drawdownFromAth).toFixed(0)}%` },
  ];

  return (
    <div className="print-page" style={{ background: "#fff", margin: "-40px -32px", minHeight: "100vh" }}>
      <PrintControls auto />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 56px", background: "#fff", color: INK, fontFamily: "Georgia, 'Times New Roman', serif" }}>
        {/* Masthead */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `2px solid ${INK}`, paddingBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Helvetica, Arial, sans-serif" }}>
            HalvingLens · Cycle Summary
          </div>
          <div style={{ fontSize: 12, color: DIM }}>Founder&apos;s Collection</div>
        </div>

        {/* Headline read */}
        <h1 style={{ fontSize: 30, lineHeight: 1.25, fontWeight: 600, margin: "26px 0 0" }}>{s.keyInsight}</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: SUB, marginTop: 14 }}>{s.summary}</p>

        {/* Snapshot table */}
        <div style={{ marginTop: 28 }}>
          {H("The read at a glance")}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <tbody>
              {stats.map((r) => (
                <tr key={r.label} style={{ borderBottom: `1px solid ${HAIR}` }}>
                  <td style={{ padding: "8px 0", color: DIM }}>{r.label}</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* What's different */}
        <div style={{ marginTop: 26 }}>
          {H("What's different this cycle")}
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: SUB, margin: 0 }}>{s.whatsDifferent}</p>
        </div>

        {/* What to watch */}
        <div style={{ marginTop: 22 }}>
          {H("What to watch next")}
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: SUB, margin: 0 }}>{s.whatToWatch}</p>
        </div>

        {/* Evidence */}
        {s.evidence.length > 0 && (
          <div style={{ marginTop: 26 }}>
            {H("The evidence")}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <tbody>
                {s.evidence.map((e) => (
                  <tr key={e.label} style={{ borderBottom: `1px solid ${HAIR}` }}>
                    <td style={{ padding: "8px 0", color: DIM, verticalAlign: "top", width: 150 }}>{e.label}</td>
                    <td style={{ padding: "8px 0", fontWeight: 600 }}>{e.reading}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 34, paddingTop: 14, borderTop: `1px solid ${HAIR}`, fontSize: 11.5, color: DIM, lineHeight: 1.6 }}>
          halvinglens.com — deterministic, explainable Bitcoin-cycle context. Historical context, never financial advice.
        </div>
      </div>
    </div>
  );
}
