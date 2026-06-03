import { BtcPriceChart } from "@/components/BtcPriceChart";
import { CycleChartExperience } from "@/components/CycleChartExperience";
import { DataBadge } from "@/components/DataBadge";
import { LastUpdated } from "@/components/LastUpdated";
import { priceStats } from "@/lib/btcPrice";
import { fmtPct, fmtUsd } from "@/lib/format";

export const metadata = {
  title: "Bitcoin price — halvinglens.com",
};

export default function PricePage() {
  const s = priceStats();

  return (
    <div className="space-y-10">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">Bitcoin price</span>
          <DataBadge status="live" source="daily close" />
        </div>

        <div className="flex items-end gap-4 flex-wrap">
          <span className="font-display text-[44px] sm:text-[56px] font-medium tracking-tightest text-ink-50 tabular-nums leading-none">
            {fmtUsd(s.current)}
          </span>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <ChangePill label="24h" pct={s.change24h} />
            <ChangePill label="7d" pct={s.change7d} />
          </div>
        </div>

        <div className="mt-3">
          <LastUpdated prefix="As of" />
        </div>
      </header>

      {/* Signature experience — answer-first cycle context, not a generic price chart */}
      <CycleChartExperience />

      {/* Price history — the conventional price/range chart, demoted below */}
      <section>
        <div className="mb-4">
          <h2 className="font-display text-[20px] sm:text-[24px] font-medium tracking-tight-2 text-ink-100">
            Price history
          </h2>
          <p className="text-[12px] text-ink-400 mt-1">
            The conventional view, for reference — pan across ranges from 24 hours to all time.
          </p>
        </div>
        <div className="card p-4 sm:p-7 relative">
          <BtcPriceChart height={360} />
          <div className="watermark">halvinglens.com · btc price</div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
          <Stat label="24h change" value={s.change24h != null ? fmtPct(s.change24h, 1) : "—"} tone={s.change24h} />
          <Stat label="7d change" value={s.change7d != null ? fmtPct(s.change7d, 1) : "—"} tone={s.change7d} />
          <Stat label="All-time high" value={fmtUsd(s.ath, { compact: true })} />
          <Stat label="From ATH" value={fmtPct(s.fromAthPct, 1)} tone={s.fromAthPct} />
        </div>

        <p className="mt-4 text-[11.5px] text-ink-500 leading-relaxed max-w-2xl">
          The 1D view pulls live hourly data on demand. 1W–1Y use daily closes from the data sync,
          and the full-history view uses the weekly cycle series back to 2012. The headline price and
          24h/7d figures are daily closes as of the last sync.
        </p>
      </section>
    </div>
  );
}

function ChangePill({ label, pct }: { label: string; pct: number | null }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[12.5px] font-mono tabular-nums ${
        up ? "text-signal-green bg-signal-green/10" : "text-signal-red bg-signal-red/10"
      }`}
    >
      {up ? "▲" : "▼"} {fmtPct(pct, 1)}
      <span className="text-ink-400 ml-0.5">{label}</span>
    </span>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: number | null }) {
  const color =
    tone == null ? "text-ink-100" : tone >= 0 ? "text-signal-green" : "text-signal-red";
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className={`mt-1.5 font-mono text-[16px] tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
