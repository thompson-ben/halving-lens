import { format } from "date-fns";
import Link from "next/link";
import { DataBadge } from "@/components/DataBadge";
import { ShareTrigger } from "@/components/ShareTrigger";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { SnapshotPresenterMode } from "@/components/SnapshotPresenterMode";
import { metricChange, type MetricChange } from "@/lib/metricChange";
import { snapshotWhatChanged, snapshotContext, snapshotWatchItems, snapshotCyclePosition } from "@/lib/snapshot";
import { cycleSummary } from "@/lib/cycleSummary";
import { selectChartOfWeek } from "@/lib/chartOfWeek";
import { latestFindings } from "@/lib/findings";
import { SOURCE } from "@/lib/btcData";
import { fmtUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bitcoin Market Snapshot — where the cycle stands today — halvinglens.com",
  description:
    "The current state of the Bitcoin cycle in one screen: price, Market Health, sentiment, accumulation conditions, ETF demand and cycle position — plus what changed this week and how today compares with history. Historical context, not prediction.",
  alternates: { canonical: "https://halvinglens.com/snapshot" },
  openGraph: {
    title: "Bitcoin Market Snapshot — halvinglens.com",
    description: "Where Bitcoin stands right now, what changed over the past week, and where today sits in history.",
    url: "https://halvinglens.com/snapshot",
    type: "website",
  },
};

const DATA_STATUS: Record<string, "live" | "live-derived" | "coming-soon"> = { live: "live", mixed: "live-derived", synthetic: "coming-soon" };

// ── small presentation helpers ───────────────────────────────────────────────
const TONE: Record<"good" | "bad" | "neutral", string> = { good: "text-accent", bad: "text-signal-red", neutral: "text-ink-300" };
const ARROW: Record<"up" | "down" | "flat", string> = { up: "↑", down: "↓", flat: "→" };
const FLAG_TONE: Record<"good" | "bad" | "neutral" | "flag", string> = {
  good: "text-accent",
  bad: "text-signal-red",
  neutral: "text-ink-300",
  flag: "text-signal-amber",
};

function Spark({ values, tone }: { values: number[]; tone: "good" | "bad" | "neutral" }) {
  if (values.length < 2) return null;
  const w = 108,
    h = 30,
    pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const rng = max - min || 1;
  const hex = tone === "good" ? "#5eead4" : tone === "bad" ? "#ff5d5d" : "#5a6677";
  const pts = values
    .map((v, i) => `${(pad + (i / (values.length - 1)) * (w - 2 * pad)).toFixed(1)},${(pad + (1 - (v - min) / rng) * (h - 2 * pad)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden>
      <polyline points={pts} fill="none" stroke={hex} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
    </svg>
  );
}

function Delta({ label, c }: { label: string; c?: MetricChange["changes"][number] }) {
  if (!c || !c.available) return <div className="text-[11px] text-ink-600">{label} —</div>;
  return (
    <div className="text-[12px]" title={c.asOfLabel ? `vs ${c.asOfLabel}` : undefined}>
      <span className="text-ink-500">{label} </span>
      <span className={`tabular-nums ${TONE[c.good]}`}>
        {ARROW[c.dir]} {c.pctLabel ?? c.absLabel}
      </span>
    </div>
  );
}

function MetricCard({ m, big = false }: { m: MetricChange; big?: boolean }) {
  const sparkTone: "good" | "bad" | "neutral" = m.status === "improving" ? "good" : m.status === "weakening" ? "bad" : "neutral";
  const c1 = m.changes.find((c) => c.period === 1);
  const c7 = m.changes.find((c) => c.period === 7);
  return (
    <div className="card p-4 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500">{m.name}</span>
        {m.band && <span className="text-[10.5px] px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-ink-300">{m.band.label}</span>}
      </div>
      <div className={`mt-2 font-display ${big ? "text-[40px]" : "text-[32px]"} leading-none text-ink-50 tabular-nums`}>{m.currentLabel}</div>
      <div className="mt-3 flex items-center gap-4">
        <Delta label={m.frequency === "trading-day" ? "Latest" : "1d"} c={c1} />
        <Delta label={m.frequency === "trading-day" ? "7d net" : "7d"} c={c7} />
      </div>
      <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
        <span className="text-[10.5px] text-ink-500 leading-tight">{m.percentileLabel ?? (m.band ? m.band.label : "")}</span>
        <Spark values={m.spark} tone={sparkTone} />
      </div>
    </div>
  );
}

export default function SnapshotPage({ searchParams }: { searchParams: { presenter?: string } }) {
  const presenter = searchParams?.presenter === "true";
  const s = cycleSummary();
  const price = metricChange("price");
  const health = metricChange("market_health");
  const sentiment = metricChange("sentiment");
  const accumulation = metricChange("accumulation");
  const etf = metricChange("etf_flow");
  const pos = snapshotCyclePosition();
  const changed = snapshotWhatChanged(5);
  const ctx = snapshotContext();
  const watch = snapshotWatchItems();
  const cotw = selectChartOfWeek();
  const finding = latestFindings(1)[0];

  const asOf = SOURCE.fetchedAt ? format(new Date(SOURCE.fetchedAt), "d MMM yyyy, HH:mm 'UTC'") : "—";
  const gainMult = (1 + pos.gainFromHalving / 100).toFixed(1);
  const c1p = price.changes.find((c) => c.period === 1);
  const c7p = price.changes.find((c) => c.period === 7);

  return (
    <div className={presenter ? "space-y-10 max-w-5xl mx-auto" : "space-y-12 lg:space-y-14"}>
      {presenter && <SnapshotPresenterMode />}

      {/* ── Hero ── */}
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">Market Snapshot</span>
          <DataBadge status={DATA_STATUS[SOURCE.mode] ?? "live-derived"} source={`Snapshot as of ${asOf}`} />
          {!presenter && <ShareTrigger />}
        </div>
        <h1 className={`font-display font-medium tracking-tightest text-ink-50 leading-[1.04] ${presenter ? "text-[44px] sm:text-[60px]" : "text-[34px] sm:text-[42px] lg:text-[54px]"}`}>
          Bitcoin Market Snapshot
        </h1>
        <p className={`mt-4 text-ink-300 max-w-2xl leading-relaxed ${presenter ? "text-[18px]" : "text-[15px] lg:text-[15.5px]"}`}>
          The current state of the Bitcoin cycle, what changed and where today sits in history.
        </p>

        {/* Hero stat strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <HeroStat label="Bitcoin price" value={fmtUsd(s.price)} sub={c1p?.pctLabel ? `${c1p.pctLabel} 24h` : undefined} subTone={c1p?.good} />
          <HeroStat label="This week" value={c7p?.pctLabel ?? "—"} valTone={c7p?.good} />
          <HeroStat label="Cycle day" value={`Day ${pos.cycleDay}`} sub={`${pos.progressPct}% through`} />
          <HeroStat label="Since halving" value={`${gainMult}×`} sub={`${Math.round(pos.drawdownFromAth)}% from high`} />
        </div>
      </header>

      {/* ── Primary scoreboard ── */}
      <section>
        <SectionHead n="01" title="The scoreboard" note="The core HalvingLens readings, at a glance." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard m={price} />
          <CyclePositionCard gainMult={gainMult} pos={pos} />
          <MetricCard m={health} />
          <MetricCard m={sentiment} />
          <MetricCard m={accumulation} />
          <MetricCard m={etf} />
        </div>
      </section>

      {/* ── What changed this week ── */}
      <section>
        <SectionHead n="02" title="What changed this week?" note="The most meaningful developments of the past seven days." />
        <div className="card p-5 sm:p-6">
          {changed.length === 0 ? (
            <p className="text-[14px] text-ink-400">A quiet week — no material shifts across the core readings.</p>
          ) : (
            <ul className="space-y-3">
              {changed.map((c, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className={`mt-1.5 text-[12px] ${FLAG_TONE[c.tone]}`} aria-hidden>
                    {c.tone === "flag" ? "◆" : "•"}
                  </span>
                  <span className="text-[14.5px] text-ink-100 leading-snug">{c.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── Historical context ── */}
      <section>
        <SectionHead n="03" title="Where today sits in history" note="Descriptive context — not a forecast." />
        <div className="card p-5 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ContextStat label="Closest match" value={ctx.match ?? "—"} sub={ctx.similarity != null ? `${ctx.similarity}% similar` : undefined} />
            <ContextStat label="Accumulation" value={`${ctx.accPercentile}%`} sub="more attractive than of weeks" />
            <ContextStat label="Drawdown rank" value={ctx.drawdownPercentile != null ? `${ctx.drawdownPercentile}th` : "—"} sub="of tracked days" />
            <ContextStat label="Market Health" value={ctx.healthPercentile != null ? `${ctx.healthPercentile}th` : (health.band?.label ?? "—")} sub="percentile" />
          </div>
          <p className="mt-5 pt-4 border-t border-white/[0.06] text-[14px] text-ink-200 leading-relaxed">{ctx.summary}</p>
        </div>
      </section>

      {/* ── Chart of the week ── */}
      <section>
        <SectionHead n="04" title="Chart of the week" note="The single chart worth looking at right now." />
        <Link href={cotw.link} className="card card-interactive p-5 sm:p-6 block">
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent">Chart of the week</div>
          <div className="mt-2 font-display text-[24px] sm:text-[28px] text-ink-50 leading-tight">{cotw.title}</div>
          <p className="mt-2 text-[13.5px] text-ink-300 leading-relaxed max-w-2xl">{cotw.why[0]}</p>
          <p className="mt-3 text-[12.5px] text-ink-400 leading-relaxed max-w-2xl">{cotw.context}</p>
          <span className="mt-3 inline-block text-[12.5px] text-accent">View the live chart →</span>
        </Link>
      </section>

      {/* ── Research corner ── */}
      {finding && (
        <section>
          <SectionHead n="05" title="Research corner" note="This week's finding from the research library." />
          <Link href={`/research/findings/${finding.slug}`} className="card card-interactive p-5 sm:p-6 block">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-accent/25 text-accent">{finding.id}</span>
              <span className="text-[11px] text-ink-500">{finding.datePublished}</span>
            </div>
            <div className="mt-2 font-display text-[20px] sm:text-[23px] text-ink-50 leading-tight">{finding.title}</div>
            <p className="mt-2 text-[13.5px] text-ink-300 leading-relaxed max-w-2xl">{finding.headline}</p>
            <span className="mt-3 inline-block text-[12.5px] text-accent">Read the research →</span>
          </Link>
        </section>
      )}

      {/* ── What we're watching ── */}
      <section>
        <SectionHead n="06" title="What we're watching" note="Objective signals to monitor next week — observations, not predictions." />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {watch.map((w, i) => (
            <div key={i} className="card p-5">
              <div className="text-[14px] font-medium text-ink-50 leading-snug">{w.title}</div>
              <div className="mt-2 text-[12px] text-accent">{w.current}</div>
              <p className="mt-2 text-[12.5px] text-ink-400 leading-relaxed">{w.why}</p>
              <div className="mt-3 pt-3 border-t border-white/[0.06] text-[11.5px] text-ink-500">
                <span className="text-ink-400">Meaningful change: </span>
                {w.trigger}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[11px] text-ink-600 pt-2">
        Every figure traces to the live HalvingLens data and updates automatically. Historical context. Not prediction. Not financial advice.
      </p>

      {presenter ? (
        <div className="pt-4">
          <Link href="/snapshot" className="text-[12px] text-ink-500 hover:text-ink-300">
            ← Exit presenter mode
          </Link>
        </div>
      ) : (
        <FeedbackWidget section="snapshot" contentType="page" />
      )}
    </div>
  );
}

// ── local components ─────────────────────────────────────────────────────────
function SectionHead({ n, title, note }: { n: string; title: string; note: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] font-mono text-ink-600">{n}</span>
        <h2 className="font-display text-[22px] sm:text-[26px] text-ink-50 tracking-tight-2">{title}</h2>
      </div>
      <p className="mt-1 ml-8 text-[12.5px] text-ink-500">{note}</p>
    </div>
  );
}

function HeroStat({ label, value, sub, valTone, subTone }: { label: string; value: string; sub?: string; valTone?: "good" | "bad" | "neutral"; subTone?: "good" | "bad" | "neutral" }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-500">{label}</div>
      <div className={`mt-1.5 text-[22px] font-display tabular-nums ${valTone ? TONE[valTone] : "text-ink-50"}`}>{value}</div>
      {sub && <div className={`text-[11px] tabular-nums ${subTone ? TONE[subTone] : "text-ink-500"}`}>{sub}</div>}
    </div>
  );
}

function ContextStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink-500">{label}</div>
      <div className="mt-1 text-[19px] font-display text-ink-50 tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-[10.5px] text-ink-500 leading-tight">{sub}</div>}
    </div>
  );
}

function CyclePositionCard({ gainMult, pos }: { gainMult: string; pos: ReturnType<typeof snapshotCyclePosition> }) {
  return (
    <div className="card p-4 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500">Cycle Position</span>
        <span className="text-[10.5px] px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-ink-300">{pos.phaseLabel}</span>
      </div>
      <div className="mt-2 font-display text-[32px] leading-none text-ink-50 tabular-nums">Day {pos.cycleDay}</div>
      <div className="mt-3 flex items-center gap-4 text-[12px]">
        <span className="text-ink-500">
          Since halving <span className="text-accent tabular-nums">{gainMult}×</span>
        </span>
        <span className="text-ink-500">
          From high <span className="text-signal-red tabular-nums">{Math.round(pos.drawdownFromAth)}%</span>
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-white/[0.06] text-[10.5px] text-ink-500">{pos.progressPct}% through the four-year cycle</div>
    </div>
  );
}
