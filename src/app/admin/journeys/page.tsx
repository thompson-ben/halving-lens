import {
  journeyAnalytics,
  type JourneyPath,
  type LandingRow,
  type ExitRow,
  type TransitionFrom,
  type DiscoveryRow,
  type SegmentDepth,
  type JourneyInsight,
  type FunnelStep,
  type SankeyNode,
  type SankeyLink,
  type AcquisitionState,
} from "@/lib/journeyAnalytics";
import { AdminLogin } from "@/components/AdminLogin";
import { isAdmin, adminConfigured } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Visitor Journey Intelligence — halvinglens.com", robots: { index: false } };

// Visitor Journey Intelligence — the founder's product-intelligence dashboard.
// It tells the story of what visitors DO (journeys, exploration, exits, the paths
// that create subscribers), not which pages got traffic. Every figure is live
// first-party data; anything depending on the newer instrumentation says
// "collecting since <date>" rather than showing an empty or fabricated widget.

const fmtN = (n: number) => n.toLocaleString();
const rate = (r: number | null) => (r == null ? "—" : `${r}%`);
function fmtDur(sec: number | null): string {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}
const asOfFmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const sinceFmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function AdminJourneysPage() {
  if (!adminConfigured())
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl leading-relaxed">
          Set <code className="text-accent">ANALYTICS_DASHBOARD_KEY</code> in the environment to enable the dashboard.
        </p>
      </Shell>
    );
  if (!isAdmin())
    return (
      <Shell>
        <AdminLogin />
      </Shell>
    );

  const j = await journeyAnalytics();
  if (!j.configured)
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl">
          Supabase isn&apos;t configured yet — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and run{" "}
          <code className="text-accent">supabase/analytics.sql</code>. Journeys appear as visitors browse.
        </p>
      </Shell>
    );

  const k = j.kpis;
  return (
    <Shell asOf={asOfFmt(j.generatedAt)}>
      <div className="-mt-2">
        <a
          href="/admin/analytics"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-accent/25 bg-accent/[0.06] text-accent text-[12.5px] hover:bg-accent/[0.1] transition-colors"
        >
          ← Website Analytics
        </a>
      </div>

      {/* North-star + journey KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Kpi label="Explorer Rate" value={rate(k.explorerRate)} sub="≥3 pages · North Star" hero />
        <Kpi label="Avg journey depth" value={k.avgJourneyDepth != null ? `${k.avgJourneyDepth}` : "—"} sub="unique pages / session" />
        <Kpi label="Conversion" value={rate(k.conversionRate)} sub="session → subscribe" />
        <Kpi label="Sessions" value={fmtN(k.sessions)} sub="journeys analysed" />
        <Kpi label="Avg time in journey" value={fmtDur(k.avgDurationSec)} sub="entry → last page" />
        <Kpi label="Subscribers" value={fmtN(k.subscribers)} sub="converting sessions" />
      </div>

      <Panel title="Journey Funnel" hint="How far visitors get. Each step is the share of sessions reaching that depth — instantly shows exploring vs bouncing.">
        <Funnel steps={j.funnel} />
      </Panel>

      <Panel title="Visitor Flow" hint="Entry → second → third page → outcome. Thickness = volume. The shape of how people move through HalvingLens.">
        <Sankey nodes={j.sankey.nodes} links={j.sankey.links} />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Top Visitor Journeys" hint="The most common ordered paths, with how often each one converts.">
          <ol className="space-y-2.5">
            {j.topJourneys.map((jp, i) => (
              <JourneyRow key={i} jp={jp} rank={i + 1} />
            ))}
            {!j.topJourneys.length && <Empty>No journeys yet.</Empty>}
          </ol>
        </Panel>

        <Panel title="AI Founder Insights" hint="Deterministic, evidence-backed — journeys, not page counts. Each is derived from the numbers on this page.">
          <ul className="space-y-2.5">
            {j.insights.map((ins, i) => (
              <InsightRow key={i} ins={ins} />
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Landing Page Effectiveness" hint="Whether each entry point actually works — do arrivals explore, and do they subscribe?">
        <LandingTable rows={j.landings} />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Exit Analysis" hint="Where visitors stop exploring. High exit + shallow depth = a page that needs stronger onward links.">
          <ExitTable rows={j.exits} />
        </Panel>
        <Panel title="Discovery Matrix" hint="How each landing page naturally leads visitors onward — the most common second and third page.">
          <DiscoveryTable rows={j.discovery} />
        </Panel>
      </div>

      <Panel title="Internal Navigation Effectiveness" hint="After viewing a page, where do visitors go next? Inferred from the page sequence (not click tracking). Optimise cross-linking from what actually happens.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {j.transitions.map((t) => (
            <Transition key={t.path} t={t} />
          ))}
          {!j.transitions.length && <Empty>No transitions yet.</Empty>}
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="First Visit vs Returning" hint="Is HalvingLens becoming a habit? Deeper, higher-converting returning journeys say yes.">
          <div className="grid grid-cols-2 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
            {j.segments.map((s) => (
              <SegmentTile key={s.label} s={s} />
            ))}
          </div>
        </Panel>
        <Panel
          title="Acquisition Channel"
          hint="Which channels bring visitors — and which convert. Needs the referrer/UTM instrumentation shipped in Phase 1."
        >
          <Acquisition a={j.acquisition} />
        </Panel>
      </div>

      <p className="mt-8 pt-5 border-t border-white/[0.06] text-[11px] text-ink-500 max-w-3xl leading-relaxed">
        Live first-party journeys — no fabricated figures. A session is the ordered sequence of pages a visitor views; it
        &ldquo;converts&rdquo; when a signup fires within it. Depth, funnels, journeys, exits and transitions cover full
        history; acquisition channel and per-visitor returning behaviour are <span className="text-ink-400">collecting since {sinceFmt(j.dataSince)}</span>{" "}
        (Phase 1 instrumentation). Measure. Learn. Improve.
      </p>
    </Shell>
  );
}

// ── Funnel ───────────────────────────────────────────────────────────────────
function Funnel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(...steps.map((s) => s.count), 1);
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const w = (s.count / max) * 100;
        const isSub = i === steps.length - 1;
        return (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-44 shrink-0 text-[12px] text-ink-300">{s.label}</div>
            <div className="flex-1 h-7 rounded-lg bg-white/[0.03] overflow-hidden relative">
              <div
                className="h-full rounded-lg"
                style={{ width: `${Math.max(w, 3)}%`, background: isSub ? "rgba(61,220,151,0.45)" : "rgba(94,234,212,0.32)" }}
              />
              <div className="absolute inset-0 flex items-center px-3 gap-2">
                <span className="font-mono text-[12px] text-ink-100 tabular-nums">{fmtN(s.count)}</span>
                <span className="text-[11px] text-ink-400 tabular-nums">{s.pct}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sankey (self-contained SVG) ───────────────────────────────────────────────
function Sankey({ nodes, links }: { nodes: SankeyNode[]; links: SankeyLink[] }) {
  if (!nodes.length || !links.length) return <Empty>Not enough multi-page journeys yet to draw the flow.</Empty>;

  const W = 900;
  const H = 360;
  const PAD_Y = 12;
  const COL_X = [40, 320, 600, 860]; // x of each column's node bar
  const NODE_W = 12;
  const GAP = 10;

  const cols: SankeyNode[][] = [[], [], [], []];
  for (const n of nodes) if (n.col >= 0 && n.col <= 3) cols[n.col].push(n);

  // throughput per node = max(in, out)
  const inSum = new Map<string, number>();
  const outSum = new Map<string, number>();
  for (const l of links) {
    outSum.set(l.source, (outSum.get(l.source) ?? 0) + l.value);
    inSum.set(l.target, (inSum.get(l.target) ?? 0) + l.value);
  }
  const thru = (id: string) => Math.max(inSum.get(id) ?? 0, outSum.get(id) ?? 0);

  // layout each column: scale so the tallest column fits H
  type Box = { id: string; label: string; x: number; y: number; h: number; col: number };
  const boxes = new Map<string, Box>();
  let maxColTotal = 1;
  for (const c of cols) maxColTotal = Math.max(maxColTotal, c.reduce((a, n) => a + thru(n.id), 0));
  const usableH = H - PAD_Y * 2;
  for (let c = 0; c < 4; c++) {
    const list = [...cols[c]].sort((a, b) => thru(b.id) - thru(a.id));
    const total = list.reduce((a, n) => a + thru(n.id), 0) || 1;
    const gaps = Math.max(0, list.length - 1) * GAP;
    const scale = (usableH - gaps) / Math.max(total, maxColTotal ? total : 1);
    let y = PAD_Y + (usableH - (total * scale + gaps)) / 2;
    for (const n of list) {
      const h = Math.max(thru(n.id) * scale, 2);
      boxes.set(n.id, { id: n.id, label: n.label, x: COL_X[c], y, h, col: c });
      y += h + GAP;
    }
  }

  // link ribbons — accumulate offsets on each node's right/left edge
  const outOff = new Map<string, number>();
  const inOff = new Map<string, number>();
  const scaleFor = (id: string) => {
    const b = boxes.get(id);
    if (!b) return 0;
    return b.h / Math.max(thru(id), 1);
  };
  const palette = ["#5eead4", "#3ddc97", "#f5b942", "#8b9bd0", "#c78bd0", "#6fb3d0"];
  const ordered = [...links].sort((a, b) => {
    const ba = boxes.get(a.source),
      bb = boxes.get(b.source);
    return (ba?.y ?? 0) - (bb?.y ?? 0) || b.value - a.value;
  });

  const paths = ordered.map((l, i) => {
    const s = boxes.get(l.source);
    const t = boxes.get(l.target);
    if (!s || !t) return null;
    const sw = l.value * scaleFor(l.source);
    const tw = l.value * scaleFor(l.target);
    const so = outOff.get(l.source) ?? 0;
    const to = inOff.get(l.target) ?? 0;
    outOff.set(l.source, so + sw);
    inOff.set(l.target, to + tw);
    const x1 = s.x + NODE_W;
    const y1 = s.y + so + sw / 2;
    const x2 = t.x;
    const y2 = t.y + to + tw / 2;
    const mx = (x1 + x2) / 2;
    const color = palette[s.col === 0 ? i % palette.length : s.col];
    return (
      <path
        key={i}
        d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
        fill="none"
        stroke={color}
        strokeOpacity={0.22}
        strokeWidth={Math.max(sw, 1)}
      />
    );
  });

  const colTitle = ["Entry", "2nd page", "3rd page", "Outcome"];
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 680 }} role="img" aria-label="Visitor flow Sankey diagram">
        {COL_X.map((x, i) => (
          <text key={i} x={i === 3 ? x : x} y={10} fontSize="9" fill="#5a6677" textAnchor={i === 3 ? "end" : "start"} style={{ textTransform: "uppercase", letterSpacing: "0.12em" }}>
            {colTitle[i]}
          </text>
        ))}
        {paths}
        {[...boxes.values()].map((b) => (
          <g key={b.id}>
            <rect x={b.x} y={b.y} width={NODE_W} height={b.h} rx={2} fill={b.col === 3 ? "#3ddc97" : "#5eead4"} fillOpacity={0.8} />
            <text
              x={b.col === 3 ? b.x - 6 : b.x + NODE_W + 6}
              y={b.y + b.h / 2}
              fontSize="10.5"
              fill="#bfc7d2"
              textAnchor={b.col === 3 ? "end" : "start"}
              dominantBaseline="middle"
            >
              {b.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Top journeys ──────────────────────────────────────────────────────────────
function JourneyRow({ jp, rank }: { jp: JourneyPath; rank: number }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 w-5 text-[11px] font-mono text-ink-500 tabular-nums">{rank}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {jp.steps.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              <span className="text-[12px] text-ink-100">{s}</span>
              {(i < jp.steps.length - 1 || jp.truncated) && <span className="text-ink-600 text-[11px]">→</span>}
            </span>
          ))}
          {jp.truncated && <span className="text-[11px] text-ink-600">…</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-[12px] text-ink-100 tabular-nums">
          {jp.pct}% <span className="text-ink-500">· {fmtN(jp.count)}</span>
        </div>
        <div className="text-[10.5px] tabular-nums" style={{ color: (jp.conversionPct ?? 0) > 0 ? "#3ddc97" : "#5a6677" }}>
          {rate(jp.conversionPct)} convert
        </div>
      </div>
    </li>
  );
}

// ── Landing table ─────────────────────────────────────────────────────────────
function LandingTable({ rows }: { rows: LandingRow[] }) {
  if (!rows.length) return <Empty>No landing data yet.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px] min-w-[640px]">
        <thead>
          <tr className="text-ink-500 text-[10px] uppercase tracking-[0.12em] text-left">
            <th className="font-normal pb-2">Landing page</th>
            <th className="font-normal pb-2 text-right">Sessions</th>
            <th className="font-normal pb-2 text-right">Went deeper</th>
            <th className="font-normal pb-2 text-right">Subscribed</th>
            <th className="font-normal pb-2 text-right">Avg pages</th>
            <th className="font-normal pb-2 text-right">Avg time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.path} className="border-t border-white/[0.06]">
              <td className="py-2.5 text-ink-100">{r.label}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-200">{fmtN(r.sessions)}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-200">{rate(r.wentDeeperPct)}</td>
              <td className="py-2.5 text-right font-mono tabular-nums" style={{ color: (r.subscribedPct ?? 0) > 0 ? "#3ddc97" : undefined }}>
                {rate(r.subscribedPct)}
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-200">{r.avgPages ?? "—"}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-400">{fmtDur(r.avgDurationSec)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Exit table ────────────────────────────────────────────────────────────────
function ExitTable({ rows }: { rows: ExitRow[] }) {
  if (!rows.length) return <Empty>No exit data yet.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px] min-w-[420px]">
        <thead>
          <tr className="text-ink-500 text-[10px] uppercase tracking-[0.12em] text-left">
            <th className="font-normal pb-2">Exit page</th>
            <th className="font-normal pb-2 text-right">Exits</th>
            <th className="font-normal pb-2 text-right">Exit rate</th>
            <th className="font-normal pb-2 text-right">Depth</th>
            <th className="font-normal pb-2 text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.path} className="border-t border-white/[0.06]">
              <td className="py-2.5 text-ink-100">{r.label}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-200">{fmtN(r.exits)}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-300">{rate(r.exitRatePct)}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-400">{r.avgDepthBeforeExit ?? "—"}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-400">{fmtDur(r.avgTimeBeforeExitSec)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Discovery matrix ──────────────────────────────────────────────────────────
function DiscoveryTable({ rows }: { rows: DiscoveryRow[] }) {
  if (!rows.length) return <Empty>No discovery data yet.</Empty>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.landing} className="flex flex-wrap items-center gap-1.5 text-[12px]">
          <span className="text-ink-100">{r.landingLabel}</span>
          <span className="text-ink-600">→</span>
          <span className="text-ink-300">{r.secondLabel ?? "—"}</span>
          <span className="text-ink-600">→</span>
          <span className="text-ink-400">{r.thirdLabel ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}

// ── Transitions ───────────────────────────────────────────────────────────────
function Transition({ t }: { t: TransitionFrom }) {
  return (
    <div className="rounded-xl border border-white/[0.06] p-3.5">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-[12.5px] text-ink-100 truncate">{t.label}</span>
        <span className="text-[10.5px] text-ink-500 font-mono tabular-nums">{fmtN(t.views)} views</span>
      </div>
      <div className="space-y-1.5">
        {t.targets.map((tg) => (
          <div key={tg.path} className="flex items-center gap-2">
            <span className="text-ink-600 text-[11px]">→</span>
            <span className="flex-1 text-[11.5px] text-ink-300 truncate">{tg.label}</span>
            <span className="font-mono text-[11px] text-ink-200 tabular-nums">{tg.pct}%</span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06] mt-1">
          <span className="text-[11px] text-ink-600">■</span>
          <span className="flex-1 text-[11.5px] text-ink-500">No further navigation</span>
          <span className="font-mono text-[11px] text-ink-400 tabular-nums">{t.exitedPct}%</span>
        </div>
      </div>
    </div>
  );
}

// ── Segments ──────────────────────────────────────────────────────────────────
function SegmentTile({ s }: { s: SegmentDepth }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-3.5">
      <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-400">{s.label}</div>
      <div className="mt-1.5 font-mono text-[20px] tabular-nums leading-none text-ink-50">{s.avgDepth ?? "—"}</div>
      <div className="mt-1 text-[10px] text-ink-500">pages avg · {fmtN(s.sessions)} sessions · {rate(s.conversionPct)} convert</div>
    </div>
  );
}

// ── Acquisition ───────────────────────────────────────────────────────────────
function Acquisition({ a }: { a: AcquisitionState }) {
  if (a.collecting)
    return (
      <div className="rounded-xl border border-dashed border-white/[0.12] p-4">
        <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-600 border border-white/[0.1] rounded-full px-2 py-0.5 inline-block">
          Collecting
        </div>
        <p className="mt-2.5 text-[12.5px] text-ink-300 leading-relaxed">
          Channel attribution (referrer + UTM) is <span className="text-ink-100">collecting since {sinceFmt(a.since)}</span>. Journeys
          recorded before then have no channel, so this stays honest rather than showing a partial picture.
        </p>
        <p className="mt-1.5 text-[11.5px] text-ink-500">
          {fmtN(a.sessionsWithEntryContext)} session{a.sessionsWithEntryContext === 1 ? "" : "s"} with channel data so far — this widget fills in as more accrue.
        </p>
      </div>
    );
  const max = Math.max(...a.channels.map((c) => c.sessions), 1);
  return (
    <div className="space-y-2">
      {a.channels.map((c) => (
        <div key={c.label} className="flex items-center gap-3">
          <div className="w-28 shrink-0 text-[12px] text-ink-300 truncate">{c.label}</div>
          <div className="flex-1 h-5 rounded bg-white/[0.03] overflow-hidden">
            <div className="h-full rounded" style={{ width: `${Math.max((c.sessions / max) * 100, 3)}%`, background: "rgba(94,234,212,0.32)" }} />
          </div>
          <div className="w-24 shrink-0 text-right font-mono text-[11.5px] tabular-nums text-ink-200">
            {fmtN(c.sessions)} <span style={{ color: (c.conversionPct ?? 0) > 0 ? "#3ddc97" : "#5a6677" }}>· {rate(c.conversionPct)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────────────
function InsightRow({ ins }: { ins: JourneyInsight }) {
  const dot = ins.tone === "good" ? "bg-signal-green" : ins.tone === "warn" ? "bg-signal-amber" : "bg-ink-500";
  return (
    <li className="flex gap-2.5 text-[13px] leading-relaxed text-ink-200">
      <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${dot}`} />
      <span>{ins.text}</span>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-ink-500">{children}</p>;
}

function Kpi({ label, value, sub, hero }: { label: string; value: string; sub?: string; hero?: boolean }) {
  return (
    <div className={`px-4 py-3.5 ${hero ? "bg-accent/[0.06]" : "bg-[#0b0f15]"}`}>
      <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-400">{label}</div>
      <div className={`mt-1.5 font-mono text-[22px] tabular-nums leading-none ${hero ? "text-accent" : "text-ink-50"}`}>{value}</div>
      <div className="mt-1 min-h-[13px] text-[10px] text-ink-500 truncate">{sub ?? ""}</div>
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-4">
        <h2 className="text-[13px] font-medium text-ink-100">{title}</h2>
        {hint && <p className="mt-0.5 text-[11px] text-ink-500 leading-relaxed max-w-2xl">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Shell({ children, asOf }: { children: React.ReactNode; asOf?: string }) {
  return (
    <div className="space-y-5">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-3">Internal · Journeys</div>
        <h1 className="font-display text-[32px] lg:text-[40px] font-medium tracking-tightest text-ink-50">Visitor Journey Intelligence</h1>
        <p className="mt-3 text-[12.5px] text-ink-400">
          {asOf ? (
            <>
              how visitors discover the value of HalvingLens · as of <span className="text-ink-200 tabular-nums">{asOf} UTC</span> · live first-party journeys, no estimates.
            </>
          ) : (
            "The stories our visitors are living — not which pages got traffic."
          )}
        </p>
      </header>
      {children}
    </div>
  );
}
