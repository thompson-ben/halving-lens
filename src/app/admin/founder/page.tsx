import Link from "next/link";
import { AdminLogin } from "@/components/AdminLogin";
import { Sparkline } from "@/components/Sparkline";
import { adminConfigured, isAdmin } from "@/lib/adminAuth";
import {
  DEFAULT_RANGE,
  FOUNDER_RANGES,
  founderTrends,
  type FounderKpi,
  type FounderRange,
  type Verdict,
} from "@/lib/founderIntelligence";
import { journeyAnalytics } from "@/lib/journeyAnalytics";
import { releasesBetween } from "@/lib/releases";

export const dynamic = "force-dynamic";
export const metadata = { title: "Founder Intelligence — halvinglens.com", robots: { index: false } };

// Founder Intelligence — the one-page answer to "is HalvingLens actually
// getting better?". Trend-first: every KPI is current value + change vs the
// previous window + a sparkline; cumulative totals are secondary; major
// releases are annotated on the hero trend so product work can be read
// against business outcomes. Deep dashboards stay authoritative — every
// section links out rather than duplicating.

const VERDICT_STYLE: Record<Verdict, { color: string; label: string }> = {
  better: { color: "#3ddc97", label: "better" },
  flat: { color: "#8893a4", label: "flat" },
  worse: { color: "#ff5d5d", label: "worse" },
  insufficient: { color: "#6f7c8e", label: "awaiting data" },
};

export default async function FounderPage({ searchParams }: { searchParams?: { range?: string } }) {
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

  const range: FounderRange = FOUNDER_RANGES.includes(Number(searchParams?.range) as FounderRange)
    ? (Number(searchParams?.range) as FounderRange)
    : DEFAULT_RANGE;
  const [fi, j] = await Promise.all([founderTrends(range), journeyAnalytics()]);

  if (!fi.configured)
    return (
      <Shell>
        <p className="text-[14px] text-ink-300 max-w-xl">
          Supabase isn&apos;t configured yet — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. Trends appear as events accrue.
        </p>
      </Shell>
    );

  const measurable = fi.kpis.filter((k) => k.verdict !== "insufficient");
  const improved = measurable.filter((k) => k.verdict === "better").length;
  const flat = measurable.filter((k) => k.verdict === "flat").length;
  const worse = measurable.filter((k) => k.verdict === "worse").length;
  const awaiting = fi.kpis.length - measurable.length;
  const releases = releasesBetween(fi.windowFrom, fi.generatedAt);
  const topOpps = j.configured ? j.opportunities.slice(0, 3) : [];

  return (
    <Shell asOf={fi.generatedAt.slice(0, 16).replace("T", " ") + " UTC"}>
      {/* Range toggle */}
      <div className="flex items-center gap-2">
        {FOUNDER_RANGES.map((r) => (
          <Link
            key={r}
            href={`/admin/founder?range=${r}`}
            className={`px-3 py-1.5 rounded-lg text-[12.5px] border transition-colors ${
              r === range ? "border-accent/40 bg-accent/[0.08] text-accent" : "border-white/[0.08] text-ink-400 hover:text-ink-200"
            }`}
          >
            {r} days
          </Link>
        ))}
        <span className="ml-2 text-[11.5px] text-ink-500">vs the previous {range} days</span>
      </div>

      {/* Verdict header */}
      <section className="card-glow p-6">
        <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500">Is HalvingLens getting better?</div>
        <p className="mt-2 font-display text-[24px] sm:text-[30px] text-ink-50 tracking-tight-2">
          {measurable.length === 0
            ? "Not enough data yet to say."
            : `${improved} of ${measurable.length} measurable signals improved.`}
        </p>
        <p className="mt-1.5 text-[12.5px] text-ink-400">
          {flat} flat · {worse} worse · {awaiting} awaiting data — last {range} days vs the {range} before.
        </p>
      </section>

      {/* KPI grid — current value + change + sparkline, every one */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fi.kpis.map((k) => (
          <KpiCard key={k.key} k={k} />
        ))}
        <div className="card p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Email engagement</div>
          {fi.email.enabled ? (
            <div className="mt-2 space-y-1 text-[13px] text-ink-200">
              <div>Opens {fi.email.opened.toLocaleString()} <Delta cur={fi.email.opened} prev={fi.email.prevOpened} /></div>
              <div>Clicks {fi.email.clicked.toLocaleString()} <Delta cur={fi.email.clicked} prev={fi.email.prevClicked} /></div>
            </div>
          ) : (
            <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">
              Open/click tracking isn&apos;t enabled: set RESEND_WEBHOOK_SECRET, register the webhook in Resend, and switch
              on open &amp; click tracking. Deliverability events flow already.
            </p>
          )}
        </div>
      </section>

      {/* Hero trend — signups/day, releases annotated */}
      <section className="card p-6">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500">New subscribers per day</div>
          <div className="text-[11px] text-ink-500">releases marked in gold</div>
        </div>
        <div className="mt-4">
          <TrendChart values={fi.signupsByDay} windowFrom={fi.windowFrom} rangeDays={range} releases={releases} />
        </div>
        {releases.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {releases.map((r) => (
              <span key={r.label + r.date} className="text-[11px] text-ink-400" title={r.detail}>
                <span className="text-[#d9b96a]">◆</span> {r.date.slice(5)} {r.label}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Traffic + landing conversion */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500 mb-3">Where sessions come from</div>
          {fi.traffic.length === 0 && <p className="text-[12.5px] text-ink-500">No entry-context data in this window.</p>}
          <div className="space-y-2">
            {fi.traffic.map((t) => (
              <div key={t.bucket} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-ink-200">{t.label}</span>
                <span className="text-ink-400 tabular-nums">
                  {t.sharePct}% · {t.current.toLocaleString()} <Delta cur={t.current} prev={t.previous} />
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500 mb-3">Where subscribers sign up</div>
          {fi.landings.length === 0 && <p className="text-[12.5px] text-ink-500">No signups in this window yet.</p>}
          <div className="space-y-2">
            {fi.landings.map((l) => (
              <div key={l.path} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-ink-200">{l.label}</span>
                <span className="text-ink-400 tabular-nums">
                  {l.signups} <Delta cur={l.signups} prev={l.prevSignups} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Growth backlog strip — the deep engine, not a duplicate */}
      <section className="card p-5">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Biggest growth opportunities</div>
          <Link href="/admin/journeys" className="text-[12px] text-accent">full backlog →</Link>
        </div>
        {topOpps.length === 0 && <p className="text-[12.5px] text-ink-500">The journey engine has no opportunities to show yet.</p>}
        <div className="space-y-2">
          {topOpps.map((o) => (
            <div key={o.path} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="text-ink-200">{o.label}</span>
              <span className="text-[11.5px] text-ink-400">{o.lifecycleNote}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Cumulative — deliberately secondary */}
      <p className="text-[12px] text-ink-500">
        All-time subscribers: <span className="text-ink-300 tabular-nums">{fi.totals.subscribersAllTime.toLocaleString()}</span>
        {fi.truncated && " · Note: the page-view window hit its fetch cap; session numbers may undercount."}
      </p>
    </Shell>
  );
}

function KpiCard({ k }: { k: FounderKpi }) {
  const v = VERDICT_STYLE[k.verdict];
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-500">{k.label}</div>
          <div className="mt-1.5 font-display text-[26px] text-ink-50 tabular-nums leading-none">
            {k.unit === "pct" ? `${k.current}%` : k.current.toLocaleString()}
          </div>
          <div className="mt-1.5 text-[11.5px] tabular-nums" style={{ color: v.color }}>
            {k.changePct != null ? `${k.changePct > 0 ? "+" : ""}${k.changePct}%` : "—"} · {v.label}
          </div>
        </div>
        <Sparkline data={k.spark} width={88} height={30} />
      </div>
      {k.note && <div className="mt-2 text-[10.5px] text-ink-600">{k.note}</div>}
    </div>
  );
}

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0) return <span className="text-ink-600">(prev 0)</span>;
  const pct = Math.round(((cur - prev) / prev) * 100);
  return (
    <span style={{ color: pct > 10 ? "#3ddc97" : pct < -10 ? "#ff5d5d" : "#8893a4" }}>
      ({pct > 0 ? "+" : ""}{pct}%)
    </span>
  );
}

// Hero trend with release annotations — server SVG, deterministic.
function TrendChart({
  values,
  windowFrom,
  rangeDays,
  releases,
}: {
  values: number[];
  windowFrom: string;
  rangeDays: number;
  releases: { date: string; label: string }[];
}) {
  const W = 800;
  const H = 170;
  const PAD = { top: 14, right: 10, bottom: 22, left: 30 };
  const max = Math.max(1, ...values);
  const x = (i: number) => PAD.left + (values.length > 1 ? (i / (values.length - 1)) * (W - PAD.left - PAD.right) : 0);
  const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const startMs = Date.parse(`${windowFrom}T00:00:00Z`);
  const dayIndex = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - startMs) / 86_400_000);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`New subscribers per day over the last ${rangeDays} days, with product releases marked`}>
      {[0, max].map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" />
          <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize={10} fill="#525c6b">{v}</text>
        </g>
      ))}
      {releases.map((r) => {
        const i = dayIndex(r.date);
        if (i < 0 || i >= values.length) return null;
        return (
          <g key={r.label + r.date}>
            <line x1={x(i)} x2={x(i)} y1={PAD.top} y2={H - PAD.bottom} stroke="#d9b96a" strokeOpacity={0.5} strokeDasharray="3 3" />
            <circle cx={x(i)} cy={PAD.top} r={3} fill="#d9b96a">
              <title>{r.label}</title>
            </circle>
          </g>
        );
      })}
      <path d={line} fill="none" stroke="#5eead4" strokeWidth={1.8} strokeLinejoin="round" />
      <text x={PAD.left} y={H - 6} fontSize={10} fill="#525c6b">{windowFrom}</text>
      <text x={W - PAD.right} y={H - 6} fontSize={10} fill="#525c6b" textAnchor="end">today</text>
    </svg>
  );
}

function Shell({ children, asOf }: { children: React.ReactNode; asOf?: string }) {
  return (
    <div className="space-y-6">
      <header>
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent">Founder Intelligence</div>
        <h1 className="mt-2 font-display text-[28px] lg:text-[34px] text-ink-50 tracking-tight-2">
          Is HalvingLens getting better?
        </h1>
        {asOf && <p className="mt-1 text-[11.5px] text-ink-500">as of {asOf}</p>}
      </header>
      {children}
    </div>
  );
}
