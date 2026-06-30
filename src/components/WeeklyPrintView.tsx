import type { WeeklyReport } from "@/lib/weekly";
import { fmtUsd } from "@/lib/format";

// Light, print-optimised rendering of a weekly report — black-on-white, so the
// browser's "Save as PDF" produces a clean, premium document. Inline styles so
// it prints correctly regardless of the app's dark theme.
const INK = "#15171c";
const SUB = "#3f444d";
const DIM = "#6b7079";
const GOLD = "#9a7c2e";
const HAIR = "#e6e8ec";

export function WeeklyPrintView({ w }: { w: WeeklyReport }) {
  const H = (t: string) => (
    <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: GOLD, margin: "0 0 8px", fontWeight: 600 }}>{t}</div>
  );
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 56px", background: "#fff", color: INK, fontFamily: "Georgia, 'Times New Roman', serif" }}>
      {/* Masthead */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `2px solid ${INK}`, paddingBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", fontFamily: "Helvetica, Arial, sans-serif" }}>
          HalvingLens Weekly Research
        </div>
        <div style={{ fontSize: 12, color: DIM }}>Weekly #{w.edition}</div>
      </div>
      <div style={{ fontSize: 13, color: DIM, marginTop: 8 }}>{w.weekLabel}</div>

      {/* Headline */}
      <h1 style={{ fontSize: 30, lineHeight: 1.2, fontWeight: 600, margin: "26px 0 0" }}>{w.biggestStory.title}</h1>

      {/* Executive summary */}
      <div style={{ marginTop: 28 }}>
        {H("The week in 30 seconds")}
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14.5, lineHeight: 1.6, color: SUB }}>
          {w.executiveSummary.map((b, i) => <li key={i} style={{ marginBottom: 5 }}>{b}</li>)}
        </ul>
      </div>

      <Section title="The week's biggest story" body={w.biggestStory.body} H={H} />

      {/* What changed */}
      <div style={{ marginTop: 26 }}>
        {H("What changed this week")}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {w.whatChanged.map((c) => (
              <tr key={c.label} style={{ borderBottom: `1px solid ${HAIR}` }}>
                <td style={{ padding: "8px 0", color: DIM }}>{c.label}</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>{c.from ? `${c.from} → ` : ""}{c.to}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Market health */}
      <div style={{ marginTop: 26 }}>
        {H("Weekly market health")}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {w.marketHealth.map((r) => (
              <tr key={r.label} style={{ borderBottom: `1px solid ${HAIR}` }}>
                <td style={{ padding: "8px 0", color: DIM }}>{r.label}</td>
                <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600 }}>
                  {r.value}
                  {r.metric ? <span style={{ color: DIM, fontWeight: 500, marginLeft: 8 }}>{r.metric}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {w.similar && <Section title="Similar moments" body={`${w.similar.match} (${w.similar.similarity}% similar). ${w.similar.body}`} H={H} />}
      <Section title="Research Desk" body={w.researchDesk} H={H} />

      {/* Week ahead */}
      <div style={{ marginTop: 26 }}>
        {H("The week ahead")}
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.6, color: SUB }}>
          {w.weekAhead.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
        </ol>
      </div>

      <Section title="The long view" body={w.longView} H={H} />

      {/* Metrics */}
      <div style={{ marginTop: 26, fontSize: 12.5, color: DIM, borderTop: `1px solid ${HAIR}`, paddingTop: 14 }}>
        As published: BTC {fmtUsd(w.metrics.price)} · Context Score {w.metrics.contextScore} · Accumulation {w.metrics.accumulationScore}/100 ·
        Fear &amp; Greed {w.metrics.fearGreed ?? "—"} · cycle day {w.metrics.cycleDay}.
      </div>
      <div style={{ marginTop: 18, fontSize: 11.5, color: DIM, fontFamily: "Helvetica, Arial, sans-serif" }}>
        Historical context, not a prediction. Educational analysis — not financial advice, no price targets. halvinglens.com
      </div>
    </div>
  );
}

function Section({ title, body, H }: { title: string; body: string; H: (t: string) => React.ReactNode }) {
  return (
    <div style={{ marginTop: 26 }}>
      {H(title)}
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: SUB }}>{body}</p>
    </div>
  );
}
