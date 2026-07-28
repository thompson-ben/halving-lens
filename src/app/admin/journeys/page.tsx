import {
  journeyAnalytics,
  type JourneyPath,
  type LandingRow,
  type ExitRow,
  type ExitOutcomes,
  type ConversionPageRow,
  type TimeToSubscribe,
  type TransitionFrom,
  type DiscoveryRow,
  type SegmentDepth,
  type JourneyInsight,
  type FunnelStep,
  type AcquisitionState,
  type ValueDiscovery,
  type GrowthOpportunity,
  type PageHealthRow,
  type Wins,
  type PeriodComparison,
  type PeriodMetrics,
  type MorningSummary,
  type Confidence,
} from "@/lib/journeyAnalytics";
import { JourneySankey } from "@/components/JourneySankey";
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
// Minutes as a founder-legible span. Sub-minute conversions read as seconds.
function fmtMins(min: number | null): string {
  if (min == null) return "—";
  if (min < 1) return `${Math.round(min * 60)}s`;
  return `${min} min`;
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

      {/* 1 · The 20-second read — what happened today */}
      <MorningSummaryPanel s={j.morningSummary} />

      {/* 2 · North Star: did visitors discover the value + the journey KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Kpi label="Value Discovery" value={rate(j.valueDiscovery.reachedPct)} sub="reached flagship · North Star" hero />
        <Kpi label="Explorer Rate" value={rate(k.explorerRate)} sub="≥3 pages" />
        <Kpi label="Conversion" value={rate(k.conversionRate)} sub="session → subscribe" />
        <Kpi label="Sessions" value={fmtN(k.sessions)} sub="journeys analysed" />
        <Kpi label="Avg journey depth" value={k.avgJourneyDepth != null ? `${k.avgJourneyDepth}` : "—"} sub="unique pages / session" />
        <Kpi label="Subscribers" value={fmtN(k.subscribers)} sub="converting sessions" />
      </div>

      <Panel
        title="Value Discovery Rate"
        hint="The real North Star: did visitors reach our best work (a flagship page) before deciding? Those who do convert far more often — so widening this funnel is the biggest lever on growth."
      >
        <ValueDiscoveryWidget v={j.valueDiscovery} />
      </Panel>

      {/* 3 · What should I improve next — ranked by impact */}
      <Panel
        title="Biggest Growth Opportunities"
        hint="The daily backlog, ranked by modeled impact — monthly lost visitors × how many we could plausibly route onward × the rate flagship-reachers convert. An estimate to prioritise by, not a promise."
      >
        <Opportunities items={j.opportunities} />
      </Panel>

      {/* 4 · Why it happened + what's working */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="AI Founder Insights" hint="Categorised for a daily operating report: act now, keep watching, or protect what works. Every line is evidence-backed and gated by confidence.">
          <CategorisedInsights insights={j.insights} />
        </Panel>
        <Panel title="What's Working" hint="Celebrate — and replicate. The wins worth protecting and copying onto weaker pages.">
          <WinsPanel wins={j.wins} />
        </Panel>
      </div>

      {/* 5 · Is optimisation working — period over period */}
      <Panel title="Trend — Period over Period" hint="Are the changes we ship actually moving the numbers? Improvements in green, deterioration in red.">
        <Comparisons rows={j.comparisons} />
      </Panel>

      {/* 6 · Which pages are healthy, which need work */}
      <Panel title="Page Health" hint="A composite score per page — subscribe rate, onward navigation, exit quality, journey depth and engagement. Which pages are pulling their weight, and which need work.">
        <PageHealthTable rows={j.pageHealth} />
      </Panel>

      {/* 7 · Where people get stuck — did they achieve the goal first? */}
      <Panel
        title="Exit Outcomes"
        hint="Every session ends in an exit — but not every exit is a loss. A subscriber leaving is success; a member browsing is neutral; only a visitor who left without subscribing is a problem. Lost visitors is the number to reduce."
      >
        <ExitOutcomesWidget o={j.exitOutcomes} since={sinceFmt(j.dataSince)} />
      </Panel>

      <Panel title="Visitor Flow" hint="Entry → second → third page → outcome. Thickness = volume. Click any node to trace the journeys through it — or click Subscribed to see every converting path.">
        <JourneySankey nodes={j.sankey.nodes} links={j.sankey.links} />
      </Panel>

      <Panel title="Journey Funnel" hint="How far visitors get. Each step is the share of sessions reaching that depth — instantly shows exploring vs bouncing.">
        <Funnel steps={j.funnel} />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Best Converting Journeys" hint="Not the most common — the highest-converting ordered paths (min sample applied). These are the navigation patterns worth actively encouraging.">
          <ol className="space-y-2.5">
            {j.bestJourneys.map((jp, i) => (
              <JourneyRow key={i} jp={jp} rank={i + 1} />
            ))}
            {!j.bestJourneys.length && <Empty>Not enough converting journeys yet to rank — appears as conversions accrue.</Empty>}
          </ol>
        </Panel>
        <Panel title="Subscribers by Conversion Page" hint="Which page actually did the persuading — where the signup fired. Arguably more useful than where they landed: this is the content that converts.">
          <ConversionPages rows={j.conversionPages} />
        </Panel>
      </div>

      <Panel title="Top Visitor Journeys" hint="The most common ordered paths, with how often each one converts.">
        <ol className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2.5">
          {j.topJourneys.map((jp, i) => (
            <JourneyRow key={i} jp={jp} rank={i + 1} />
          ))}
          {!j.topJourneys.length && <Empty>No journeys yet.</Empty>}
        </ol>
      </Panel>

      <Panel title="Time to Subscribe" hint="How much journey a visitor needs before converting. Front-load the case for subscribing within these first pages rather than deeper in.">
        <TimeToSubscribeWidget t={j.timeToSubscribe} />
      </Panel>

      <Panel title="Landing Page Effectiveness" hint="Whether each entry point actually works — do arrivals explore, and do they subscribe?">
        <LandingTable rows={j.landings} />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Exit Analysis" hint="Not just where visitors leave — whether they left having subscribed. High exits with a low subscribe-before-exit % are the genuine lost opportunities.">
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
        (Phase 1 instrumentation). Growth-opportunity impact is a <span className="text-ink-400">modeled estimate</span> — monthly lost visitors ×
        onward headroom × the rate flagship-reachers convert — for prioritising, not a promise. Measure. Learn. Improve.
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
// Success % (subscribed before exit) is what tells an acceptable exit from a lost
// opportunity — colour-graded so the leaks jump out.
function successColor(p: number | null): string {
  if (p == null) return "#5a6677";
  if (p >= 20) return "#3ddc97"; // healthy
  if (p >= 8) return "#f5b942"; // middling
  return "#ff5d5d"; // leaking
}
function ExitTable({ rows }: { rows: ExitRow[] }) {
  if (!rows.length) return <Empty>No exit data yet.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px] min-w-[520px]">
        <thead>
          <tr className="text-ink-500 text-[10px] uppercase tracking-[0.12em] text-left">
            <th className="font-normal pb-2">Exit page</th>
            <th className="font-normal pb-2 text-right">Exits</th>
            <th className="font-normal pb-2 text-right">Subscribed</th>
            <th className="font-normal pb-2 text-right">Lost</th>
            <th className="font-normal pb-2 text-right">Success</th>
            <th className="font-normal pb-2 text-right">Depth</th>
            <th className="font-normal pb-2 text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.path} className="border-t border-white/[0.06]">
              <td className="py-2.5 text-ink-100">{r.label}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-200">{fmtN(r.exits)}</td>
              <td className="py-2.5 text-right font-mono tabular-nums" style={{ color: r.subscribed > 0 ? "#3ddc97" : "#5a6677" }}>
                {fmtN(r.subscribed)}
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums" style={{ color: r.lost > 0 ? "#c98b93" : "#5a6677" }}>
                {fmtN(r.lost)}
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums font-medium" style={{ color: successColor(r.successPct) }}>
                {rate(r.successPct)}
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-400">{r.avgDepthBeforeExit ?? "—"}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-400">{fmtDur(r.avgTimeBeforeExitSec)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Exit outcomes — the founder KPI ─────────────────────────────────────────
function ExitOutcomesWidget({ o, since }: { o: ExitOutcomes; since: string }) {
  if (!o.total) return <Empty>No sessions yet.</Empty>;
  const tiles = [
    { label: "Successful exits", value: o.successfulPct, count: o.successful, color: "#3ddc97", note: "subscribed before leaving" },
    { label: "Returning members", value: o.neutralPct, count: o.neutral, color: "#f5b942", note: "already subscribed — just browsing" },
    { label: "Lost visitors", value: o.lostPct, count: o.lost, color: "#ff5d5d", note: "left without subscribing" },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        {tiles.map((t) => (
          <div key={t.label} className="bg-[#0b0f15] px-4 py-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
              <span className="text-[10px] uppercase tracking-[0.14em] text-ink-400">{t.label}</span>
            </div>
            <div className="mt-2 font-mono text-[30px] tabular-nums leading-none" style={{ color: t.color }}>
              {rate(t.value)}
            </div>
            <div className="mt-1.5 text-[11px] text-ink-500">
              {fmtN(t.count)} session{t.count === 1 ? "" : "s"} · {t.note}
            </div>
          </div>
        ))}
      </div>
      {/* Split bar — the whole visitor population at a glance */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
        <div style={{ width: `${o.successfulPct ?? 0}%`, background: "#3ddc97" }} />
        <div style={{ width: `${o.neutralPct ?? 0}%`, background: "#f5b942" }} />
        <div style={{ width: `${o.lostPct ?? 0}%`, background: "#ff5d5d" }} />
      </div>
      {!o.memberDetection && (
        <p className="text-[11px] text-ink-500 leading-relaxed">
          Returning-member detection links a visit back to an earlier signup via the anonymous visitor id, which is{" "}
          <span className="text-ink-400">collecting since {since}</span>. Until enough has accrued, members browsing before then can&apos;t be told
          apart from lost visitors, so they currently count as lost — the split sharpens over time.
        </p>
      )}
    </div>
  );
}

// ── Conversion attribution ────────────────────────────────────────────────────
function ConversionPages({ rows }: { rows: ConversionPageRow[] }) {
  if (!rows.length) return <Empty>No subscriptions attributed to a page yet.</Empty>;
  const max = Math.max(...rows.map((r) => r.subscribers), 1);
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.path} className="flex items-center gap-3">
          <div className="w-36 shrink-0 text-[12px] text-ink-200 truncate">{r.label}</div>
          <div className="flex-1 h-5 rounded bg-white/[0.03] overflow-hidden">
            <div className="h-full rounded" style={{ width: `${Math.max((r.subscribers / max) * 100, 3)}%`, background: "rgba(61,220,151,0.4)" }} />
          </div>
          <div className="w-20 shrink-0 text-right font-mono text-[11.5px] tabular-nums text-ink-100">
            {fmtN(r.subscribers)} <span className="text-ink-500">· {rate(r.pct)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Time to subscribe ───────────────────────────────────────────────────────
function TimeToSubscribeWidget({ t }: { t: TimeToSubscribe }) {
  if (!t.converters) return <Empty>No conversions yet to measure time-to-subscribe.</Empty>;
  const tiles = [
    { label: "Avg pages", value: t.avgPages != null ? `${t.avgPages}` : "—", sub: "before subscribing" },
    { label: "Median pages", value: t.medianPages != null ? `${t.medianPages}` : "—", sub: "typical visitor" },
    { label: "Avg time", value: fmtMins(t.avgMinutes), sub: "entry → subscribe" },
    { label: "Median time", value: fmtMins(t.medianMinutes), sub: "typical visitor" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
      {tiles.map((tl) => (
        <div key={tl.label} className="bg-[#0b0f15] px-4 py-3.5">
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-400">{tl.label}</div>
          <div className="mt-1.5 font-mono text-[22px] tabular-nums leading-none text-ink-50">{tl.value}</div>
          <div className="mt-1 text-[10px] text-ink-500 truncate">{tl.sub}</div>
        </div>
      ))}
      <div className="col-span-2 lg:col-span-4 bg-[#0b0f15] px-4 py-2 text-[10.5px] text-ink-500 border-t border-white/[0.04]">
        Based on {fmtN(t.converters)} converting session{t.converters === 1 ? "" : "s"} — pages counted up to the moment the signup fired.
      </div>
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

// ── Morning summary — the 20-second read ─────────────────────────────────────
function MorningSummaryPanel({ s }: { s: MorningSummary }) {
  return (
    <section className="card-glow p-5 sm:p-6">
      <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-3">Today&apos;s journey summary</div>
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mb-3.5">
        <span className="text-[15px] text-ink-200">
          <span className="font-mono text-ink-50 text-[18px]">{fmtN(s.sessions)}</span> journeys
        </span>
        <span className="text-[15px] text-ink-200">
          <span className="font-mono text-ink-50 text-[18px]">{fmtN(s.subscribers)}</span> subscribers
          {s.conversionPct != null && <span className="text-signal-green"> ({s.conversionPct}%)</span>}
        </span>
      </div>
      {s.bullets.length ? (
        <ul className="space-y-1.5">
          {s.bullets.map((b, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-300">
              <span className="text-accent mt-0.5">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-ink-500">Summary appears once enough journeys have accrued.</p>
      )}
    </section>
  );
}

// ── Value Discovery Rate ─────────────────────────────────────────────────────
function ValueDiscoveryWidget({ v }: { v: ValueDiscovery }) {
  if (!v.sessions) return <Empty>No sessions yet.</Empty>;
  const steps = [
    { label: "Sessions", value: fmtN(v.sessions), sub: "all journeys", pct: 100 },
    { label: "Reached flagship", value: rate(v.reachedPct), sub: `${fmtN(v.reached)} sessions`, pct: v.reachedPct ?? 0 },
    { label: "…then subscribed", value: rate(v.convReachedPct), sub: `${fmtN(v.subscribersReached)} subscribers`, pct: v.convReachedPct ?? 0 },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((st, i) => (
          <div key={st.label} className="relative rounded-xl border border-white/[0.06] bg-[#0b0f15] px-4 py-3.5">
            <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-400">{st.label}</div>
            <div className={`mt-1.5 font-mono text-[26px] tabular-nums leading-none ${i === 1 ? "text-accent" : "text-ink-50"}`}>{st.value}</div>
            <div className="mt-1 text-[10.5px] text-ink-500">{st.sub}</div>
            {i < steps.length - 1 && <div className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 text-ink-600 text-[16px] z-10">→</div>}
          </div>
        ))}
      </div>

      {/* The lift — the whole argument for guiding people into flagship content */}
      <div className="rounded-xl border border-white/[0.06] p-4 flex flex-wrap items-center gap-x-8 gap-y-2">
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-400">Reached flagship</div>
          <div className="font-mono text-[20px] text-signal-green tabular-nums">{rate(v.convReachedPct)}<span className="text-[12px] text-ink-500"> convert</span></div>
        </div>
        <div>
          <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-400">Never reached flagship</div>
          <div className="font-mono text-[20px] text-ink-300 tabular-nums">{rate(v.convNotReachedPct)}<span className="text-[12px] text-ink-500"> convert</span></div>
        </div>
        {v.liftX != null && (
          <div className="ml-auto text-right">
            <div className="font-mono text-[24px] text-accent tabular-nums leading-none">{v.liftX}×</div>
            <div className="text-[10.5px] text-ink-500">more likely to subscribe</div>
          </div>
        )}
      </div>
      <p className="text-[11px] text-ink-500 leading-relaxed">
        Flagship pages: {v.flagshipLabels.join(" · ")}. Reaching one is what &ldquo;discovering the value&rdquo; means — the strongest predictor of a subscribe.
      </p>
    </div>
  );
}

// ── Growth opportunities — the ranked backlog ────────────────────────────────
const OPP_STYLE: Record<GrowthOpportunity["level"], { dot: string; label: string }> = {
  high: { dot: "#ff5d5d", label: "High impact" },
  medium: { dot: "#f5b942", label: "Medium impact" },
  healthy: { dot: "#3ddc97", label: "Healthy" },
};
// Recommendation lifecycle (PR150) — the dashboard recognises shipped work:
// implemented journeys aren't re-recommended, they're evaluated.
const LIFECYCLE_STYLE: Record<GrowthOpportunity["lifecycle"], { color: string; label: string }> = {
  not_implemented: { color: "#6f7c8e", label: "Not implemented" },
  collecting: { color: "#f5b942", label: "Implemented · collecting evidence" },
  monitoring: { color: "#5eead4", label: "Monitoring effectiveness" },
};

function Opportunities({ items }: { items: GrowthOpportunity[] }) {
  if (!items.length) return <Empty>No clear optimisation opportunities right now — or not enough data yet to model impact.</Empty>;
  return (
    <div className="space-y-3">
      {items.map((o) => {
        const st = OPP_STYLE[o.level];
        return (
          <div key={o.path} className="rounded-xl border border-white/[0.06] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: st.dot }} />
                <span className="text-[14px] text-ink-50 font-medium truncate">{o.label}</span>
                <ConfidenceBadge c={o.confidence} />
              </div>
              {o.level !== "healthy" && (
                <div className="shrink-0 text-right">
                  <div className="font-mono text-[18px] tabular-nums leading-none" style={{ color: st.dot }}>+{o.estSubsPerMonth}</div>
                  <div className="text-[9.5px] text-ink-500 uppercase tracking-wide">subs/mo (est.)</div>
                </div>
              )}
            </div>
            <p className="mt-2 text-[12.5px] text-ink-400 leading-relaxed">{o.evidence}</p>
            <p className="mt-1.5 text-[12.5px] text-ink-200 leading-relaxed">
              <span className="text-ink-500">Recommendation: </span>{o.recommendation}
            </p>
            <div className="mt-2 flex items-start gap-2">
              <span
                className="shrink-0 text-[9.5px] uppercase tracking-[0.1em] px-2 py-0.5 rounded-full border"
                style={{ color: LIFECYCLE_STYLE[o.lifecycle].color, borderColor: `${LIFECYCLE_STYLE[o.lifecycle].color}44` }}
              >
                {LIFECYCLE_STYLE[o.lifecycle].label}
              </span>
              <span className="text-[11px] text-ink-500 leading-relaxed">{o.lifecycleNote}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Categorised AI insights ──────────────────────────────────────────────────
const INSIGHT_GROUPS: { key: JourneyInsight["category"]; title: string; icon: string; color: string }[] = [
  { key: "action", title: "Immediate action", icon: "🚨", color: "#ff5d5d" },
  { key: "monitor", title: "Monitor", icon: "⚠️", color: "#f5b942" },
  { key: "good", title: "Working well", icon: "✅", color: "#3ddc97" },
];
function CategorisedInsights({ insights }: { insights: JourneyInsight[] }) {
  if (!insights.length) return <Empty>Insights appear as traffic accrues.</Empty>;
  return (
    <div className="space-y-4">
      {INSIGHT_GROUPS.map((g) => {
        const rows = insights.filter((i) => i.category === g.key);
        if (!rows.length) return null;
        return (
          <div key={g.key}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[12px]">{g.icon}</span>
              <span className="text-[10.5px] uppercase tracking-[0.16em]" style={{ color: g.color }}>{g.title}</span>
            </div>
            <ul className="space-y-2">
              {rows.map((ins, i) => (
                <li key={i} className="text-[13px] leading-relaxed text-ink-200">
                  <span>{ins.text}</span>
                  {(ins.impact || ins.confidence) && (
                    <span className="ml-1.5 inline-flex items-center gap-1.5 align-middle">
                      {ins.impact && <span className="text-[11px] text-signal-green font-mono">{ins.impact}</span>}
                      {ins.confidence && <ConfidenceBadge c={ins.confidence} />}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ── Wins ──────────────────────────────────────────────────────────────────────
function WinsPanel({ wins }: { wins: Wins }) {
  const items: { icon: string; label: string; value: string; sub?: string }[] = [];
  if (wins.topConvertingPage) items.push({ icon: "🏆", label: "Highest converting page", value: `${wins.topConvertingPage.label} · ${wins.topConvertingPage.pct}%`, sub: `${fmtN(wins.topConvertingPage.sample)} sessions` });
  if (wins.bestOnward) items.push({ icon: "🧭", label: "Best onward navigation", value: `${wins.bestOnward.label} · ${wins.bestOnward.pct}%`, sub: "navigate deeper" });
  if (wins.strongestJourney) items.push({ icon: "⭐", label: "Most converting journey", value: wins.strongestJourney.steps.join(" → "), sub: `${rate(wins.strongestJourney.conversionPct)} of ${fmtN(wins.strongestJourney.count)}` });
  if (wins.biggestImprovement) items.push({ icon: "📈", label: "Biggest improvement (7d)", value: `${wins.biggestImprovement.metric}`, sub: `${wins.biggestImprovement.from ?? 0}% → ${wins.biggestImprovement.to ?? 0}%` });
  if (!items.length) return <Empty>Wins appear as journeys and conversions accrue.</Empty>;
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.label} className="flex items-start gap-3 rounded-xl border border-white/[0.06] px-3.5 py-2.5">
          <span className="text-[15px] mt-0.5">{it.icon}</span>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink-500">{it.label}</div>
            <div className="text-[13px] text-ink-100 truncate">{it.value}</div>
            {it.sub && <div className="text-[11px] text-ink-500">{it.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Period comparisons ───────────────────────────────────────────────────────
// Direction each metric should move to be "good" (lost% is the exception).
const METRIC_ROWS: { key: keyof PeriodMetrics; label: string; kind: "pct" | "num" | "depth"; goodUp: boolean }[] = [
  { key: "valueDiscoveryRate", label: "Value Discovery", kind: "pct", goodUp: true },
  { key: "explorerRate", label: "Explorer Rate", kind: "pct", goodUp: true },
  { key: "conversionRate", label: "Conversion", kind: "pct", goodUp: true },
  { key: "lostPct", label: "Lost visitors", kind: "pct", goodUp: false },
  { key: "subscribers", label: "Subscribers", kind: "num", goodUp: true },
];
function Comparisons({ rows }: { rows: PeriodComparison[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {rows.map((cmp) => (
        <div key={cmp.label} className="rounded-xl border border-white/[0.06] p-4">
          <div className="text-[11.5px] text-ink-200 font-medium mb-1">{cmp.label}</div>
          <div className="text-[10.5px] text-ink-500 mb-3">{fmtN(cmp.current.sessions)} vs {fmtN(cmp.previous.sessions)} sessions</div>
          {cmp.current.sessions === 0 && cmp.previous.sessions === 0 ? (
            <p className="text-[11.5px] text-ink-500">No data in this window yet.</p>
          ) : (
            <div className="space-y-1.5">
              {METRIC_ROWS.map((m) => (
                <CompareRow key={m.key} label={m.label} prev={cmp.previous[m.key]} cur={cmp.current[m.key]} kind={m.kind} goodUp={m.goodUp} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
function CompareRow({ label, prev, cur, kind, goodUp }: { label: string; prev: number | null; cur: number | null; kind: "pct" | "num" | "depth"; goodUp: boolean }) {
  const fmt = (v: number | null) => (v == null ? "—" : kind === "pct" ? `${v}%` : `${v}`);
  const delta = cur != null && prev != null ? cur - prev : null;
  const eps = kind === "num" ? 0.5 : 0.05;
  const dir = delta == null || Math.abs(delta) < eps ? "flat" : delta > 0 ? "up" : "down";
  const good = dir === "flat" ? "flat" : (dir === "up") === goodUp ? "good" : "bad";
  const color = good === "good" ? "#3ddc97" : good === "bad" ? "#ff5d5d" : "#5a6677";
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  return (
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <span className="text-ink-400">{label}</span>
      <span className="flex items-center gap-1.5 font-mono tabular-nums">
        <span className="text-ink-500">{fmt(prev)}</span>
        <span style={{ color }}>{arrow}</span>
        <span className="text-ink-100">{fmt(cur)}</span>
      </span>
    </div>
  );
}

// ── Page health ──────────────────────────────────────────────────────────────
function healthColor(band: PageHealthRow["band"]): string {
  return band === "healthy" ? "#3ddc97" : band === "ok" ? "#f5b942" : "#ff5d5d";
}
function PageHealthTable({ rows }: { rows: PageHealthRow[] }) {
  if (!rows.length) return <Empty>No pages with enough traffic to score yet.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px] min-w-[620px]">
        <thead>
          <tr className="text-ink-500 text-[10px] uppercase tracking-[0.12em] text-left">
            <th className="font-normal pb-2">Page</th>
            <th className="font-normal pb-2 w-40">Health</th>
            <th className="font-normal pb-2 text-right">Subscribe</th>
            <th className="font-normal pb-2 text-right">Onward</th>
            <th className="font-normal pb-2 text-right">Exit success</th>
            <th className="font-normal pb-2 text-right">Depth</th>
            <th className="font-normal pb-2 text-right">Conf.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.path} className="border-t border-white/[0.06]">
              <td className="py-2.5 text-ink-100">{r.label}</td>
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden max-w-[90px]">
                    <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: healthColor(r.band) }} />
                  </div>
                  <span className="font-mono tabular-nums text-[13px]" style={{ color: healthColor(r.band) }}>{r.score}</span>
                </div>
              </td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-200">{rate(r.subscribeRatePct)}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-200">{rate(r.onwardPct)}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-400">{rate(r.exitSuccessPct)}</td>
              <td className="py-2.5 text-right font-mono tabular-nums text-ink-400">{r.avgDepth ?? "—"}</td>
              <td className="py-2.5 text-right"><ConfidenceBadge c={r.confidence} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────────────
const CONF_STYLE: Record<Confidence, { label: string; color: string; bg: string }> = {
  high: { label: "High", color: "#3ddc97", bg: "rgba(61,220,151,0.12)" },
  medium: { label: "Med", color: "#f5b942", bg: "rgba(245,185,66,0.12)" },
  low: { label: "Low", color: "#9aa6b4", bg: "rgba(154,166,180,0.12)" },
};
function ConfidenceBadge({ c }: { c: Confidence }) {
  const s = CONF_STYLE[c];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9.5px] uppercase tracking-wide shrink-0" style={{ color: s.color, background: s.bg }} title={`${s.label} confidence (based on sample size)`}>
      {s.label}
    </span>
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
              the growth operating system · as of <span className="text-ink-200 tabular-nums">{asOf} UTC</span> · live first-party journeys; impact figures are labelled estimates.
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
