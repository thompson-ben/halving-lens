import { BtcPriceChart } from "@/components/BtcPriceChart";
import { CycleChartExperience } from "@/components/CycleChartExperience";
import { DataBadge } from "@/components/DataBadge";
import { LastUpdated, dailyCloseSource } from "@/components/LastUpdated";
import { priceStats } from "@/lib/btcPrice";
import { priceContext } from "@/lib/priceContext";
import { fmtPct, fmtUsd } from "@/lib/format";

export const metadata = {
  title: "Bitcoin Price",
  description:
    "Live Bitcoin price in historical context — today's price against its 200-day moving average and realized price, across ranges from 24 hours to all time.",
  alternates: { canonical: "/price" },
};

export default function PricePage() {
  const s = priceStats();
  const ctx = priceContext();

  return (
    <div className="space-y-10">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">Bitcoin price</span>
          <DataBadge status="live" source={dailyCloseSource()} />
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

      {/* Price in Context (PR129) — price against its long-term trend (200d MA)
          and the network's cost basis (realized price). Context, not TA. */}
      <section>
        <div className="mb-4">
          <h2 className="font-display text-[20px] sm:text-[24px] font-medium tracking-tight-2 text-ink-100">
            Price in Context
          </h2>
          <p className="text-[12px] text-ink-400 mt-1">
            Today&apos;s price against its long-term trend and the network&apos;s average cost basis
            — what the level means, not just where it is.
          </p>
        </div>

        {ctx.summary && (
          <p className="mb-4 text-[13.5px] text-ink-200 leading-relaxed max-w-2xl">{ctx.summary}</p>
        )}

        <div className="card p-4 sm:p-7 relative">
          <BtcPriceChart height={360} />
          <div className="watermark">halvinglens.com · price in context</div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
          <Stat label="24h change" value={s.change24h != null ? fmtPct(s.change24h, 1) : "—"} tone={s.change24h} />
          <Stat label="7d change" value={s.change7d != null ? fmtPct(s.change7d, 1) : "—"} tone={s.change7d} />
          <Stat
            label="vs 200-day avg"
            value={ctx.vsMa200Pct != null ? fmtPct(ctx.vsMa200Pct, 1) : "—"}
            tone={ctx.vsMa200Pct}
            sub={ctx.vsMa200Pct == null ? undefined : ctx.vsMa200Pct >= 0 ? "Above trend" : "Below trend"}
          />
          <Stat
            label="vs realized price"
            value={ctx.vsRealizedPct != null ? fmtPct(ctx.vsRealizedPct, 1) : "—"}
            tone={ctx.vsRealizedPct}
            sub={ctx.vsRealizedPct == null ? undefined : ctx.vsRealizedPct >= 0 ? "Above cost basis" : "Below cost basis"}
          />
        </div>

        <p className="mt-4 text-[11.5px] text-ink-500 leading-relaxed max-w-2xl">
          The 1D view pulls live hourly data on demand. 1W–1Y use daily closes from the data sync,
          and the full-history view uses the weekly cycle series back to 2012. The headline price and
          24h/7d figures are daily closes as of the last sync. The 200-day moving average is computed
          from the same daily closes (recovered from the Mayer-multiple series on the all-time view),
          and realized price comes from the live on-chain feed — it is drawn only across the window
          that feed covers, so the line starts where the real data starts.
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

function Stat({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone?: number | null;
  sub?: string;
}) {
  const color =
    tone == null ? "text-ink-100" : tone >= 0 ? "text-signal-green" : "text-signal-red";
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className={`mt-1.5 font-mono text-[16px] tabular-nums ${color}`}>{value}</div>
      {sub && <div className="mt-1 text-[10px] text-ink-400">{sub}</div>}
    </div>
  );
}
