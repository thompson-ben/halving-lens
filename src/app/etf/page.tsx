import { TrendingUp, Layers, CalendarClock, LineChart } from "lucide-react";
import { format } from "date-fns";
import { DataBadge } from "@/components/DataBadge";
import { EtfFlowChart } from "@/components/EtfFlowChart";
import { ETF, etfStats } from "@/lib/etf";
import { fmtUsd } from "@/lib/format";

const PLANNED = [
  {
    icon: TrendingUp,
    name: "Daily net flow",
    detail: "How much money moved into or out of all US spot Bitcoin ETFs each day.",
  },
  {
    icon: LineChart,
    name: "Cumulative flow",
    detail: "The running total since launch — the size of the structural demand sink.",
  },
  {
    icon: CalendarClock,
    name: "Biggest inflow & outflow days",
    detail: "The standout days, and what was happening to price around them.",
  },
  {
    icon: Layers,
    name: "Flow vs. price",
    detail: "Whether ETF demand is leading, lagging, or diverging from BTC price.",
  },
];

export default function EtfPage() {
  return (
    <div className="space-y-12 lg:space-y-14">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">ETF flow</span>
          <DataBadge status={ETF.connected ? "live" : "coming-soon"} source={ETF.source ?? undefined} />
        </div>
        <h1 className="font-display text-[34px] sm:text-[40px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          The demand that didn&apos;t exist last cycle.
        </h1>
        <p className="mt-5 text-[15px] lg:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          US spot Bitcoin ETFs launched in 2024 — for the first time, large, regulated buyers can
          hold Bitcoin through a normal brokerage. This is the structural demand that didn&apos;t
          exist in 2012, 2016 or 2020.
        </p>
      </header>

      {ETF.connected ? <LiveEtf /> : <ComingSoonEtf />}
    </div>
  );
}

function LiveEtf() {
  const s = etfStats();
  return (
    <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Fact
          label="Latest net flow"
          value={s.latest ? fmtUsd(s.latest.netFlow, { compact: true }) : "—"}
          tone={s.latest?.netFlow}
          sub={s.latest ? format(new Date(s.latest.date), "d MMM yyyy") : undefined}
        />
        <Fact label="Cumulative since launch" value={fmtUsd(s.cumulative, { compact: true })} tone={s.cumulative} />
        <Fact
          label="Biggest inflow day"
          value={s.biggestInflow ? fmtUsd(s.biggestInflow.netFlow, { compact: true }) : "—"}
          tone={1}
          sub={s.biggestInflow ? format(new Date(s.biggestInflow.date), "d MMM yyyy") : undefined}
        />
        <Fact
          label="Biggest outflow day"
          value={s.biggestOutflow ? fmtUsd(s.biggestOutflow.netFlow, { compact: true }) : "—"}
          tone={-1}
          sub={s.biggestOutflow ? format(new Date(s.biggestOutflow.date), "d MMM yyyy") : undefined}
        />
      </section>

      <section className="card p-4 sm:p-7 relative">
        <div className="mb-5">
          <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100">
            Daily net flow &amp; cumulative total
          </h2>
          <p className="text-[12px] text-ink-400 mt-1">All US spot Bitcoin ETFs.</p>
        </div>
        <EtfFlowChart points={ETF.points} height={380} />
        <div className="watermark">halving.lens · etf flow</div>
      </section>

      <p className="text-[11.5px] text-ink-500 leading-relaxed max-w-2xl">
        Source: {ETF.source}
        {ETF.fetchedAt ? ` · updated ${format(new Date(ETF.fetchedAt), "d MMM yyyy")}` : ""}.
      </p>
    </>
  );
}

function ComingSoonEtf() {
  return (
    <>
      <section className="card-glow p-6 lg:p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <h2 className="font-display text-[20px] lg:text-[24px] font-medium tracking-tight-2 text-ink-100 leading-snug">
            Why ETF flows matter to the cycle
          </h2>
          <p className="mt-3.5 text-[14px] text-ink-300 leading-relaxed">
            Unlike previous Bitcoin cycles, the current cycle includes spot Bitcoin ETF demand — a
            structural source of buying that did not exist in 2012, 2016 or 2020. It&apos;s a leading
            candidate to explain why this cycle has so far been flatter and cooler than the classic
            four-year pattern — though it&apos;s still early, and this is context, not a forecast.
          </p>
        </div>
        <div className="watermark">halving.lens · etf flow</div>
      </section>

      <section>
        <div className="mb-6">
          <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">
            What you&apos;ll see here
          </h2>
          <p className="text-[12.5px] text-ink-400 mt-1.5 max-w-xl">
            We won&apos;t show estimated ETF numbers. These panels switch on with real data once the
            source is connected.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PLANNED.map((f) => (
            <div key={f.name} className="card p-6">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] text-accent shrink-0">
                  <f.icon size={15} strokeWidth={1.8} />
                </span>
                <div>
                  <div className="text-[13.5px] font-medium text-ink-100">{f.name}</div>
                  <p className="mt-1.5 text-[12.5px] text-ink-300 leading-relaxed">{f.detail}</p>
                </div>
              </div>
              <div className="mt-5 h-20 rounded-lg border border-dashed border-white/[0.07] bg-white/[0.01] flex items-center justify-center">
                <span className="text-[11px] text-ink-500">Live data coming soon</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6 lg:p-7">
        <h3 className="text-[12.5px] font-medium text-ink-100 mb-4 uppercase tracking-[0.16em]">
          Data transparency
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-[12.5px]">
          <div>
            <dt className="text-ink-400 uppercase tracking-[0.16em] text-[10px]">Status</dt>
            <dd className="text-ink-200 mt-1">Connecting — not live yet</dd>
          </div>
          <div>
            <dt className="text-ink-400 uppercase tracking-[0.16em] text-[10px]">Planned source</dt>
            <dd className="text-ink-200 mt-1">{ETF.plannedSource}</dd>
          </div>
          <div>
            <dt className="text-ink-400 uppercase tracking-[0.16em] text-[10px]">Coverage</dt>
            <dd className="text-ink-200 mt-1">All US spot BTC ETFs · daily</dd>
          </div>
        </dl>
        <p className="mt-5 text-[12px] text-ink-500 leading-relaxed">
          Until a live source is connected, this page shows no flow figures rather than estimated
          ones. Trust matters more than looking complete.
        </p>
      </section>
    </>
  );
}

function Fact({ label, value, tone, sub }: { label: string; value: string; tone?: number | null; sub?: string }) {
  const color =
    tone == null ? "text-ink-100" : tone >= 0 ? "text-signal-green" : "text-signal-red";
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className={`mt-1.5 font-mono text-[16px] tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10.5px] text-ink-500 mt-1">{sub}</div>}
    </div>
  );
}
