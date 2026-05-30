import { format } from "date-fns";
import { DataBadge } from "@/components/DataBadge";
import { OnchainLthChart } from "@/components/OnchainLthChart";
import { AdoptionChart } from "@/components/AdoptionChart";
import { SPOT, TODAY } from "@/lib/btcData";
import { metricBySlug, zoneFor } from "@/lib/metrics";
import { fmtNum, fmtUsd } from "@/lib/format";
import {
  ADOPTION_AVAILABLE,
  adoptionRead,
  adoptionVsPrice,
  currentValue,
  LTH_AVAILABLE,
  lthAroundExtremes,
  lthMarkers,
  lthRead,
  lthVsPrice,
  ONCHAIN_ANY,
  ONCHAIN_SOURCE,
  ONCHAIN_UPDATED,
} from "@/lib/onchain";

export const metadata = {
  title: "On-chain — halving.lens",
};

const ZONE_TEXT: Record<string, string> = {
  bottom: "text-signal-blue",
  accumulation: "text-signal-green",
  neutral: "text-ink-200",
  bullish: "text-signal-green",
  euphoria: "text-signal-amber",
  top: "text-signal-red",
};

const OSCILLATORS = [
  { key: "mvrvZscore", slug: "mvrv-z-score" },
  { key: "nupl", slug: "nupl" },
  { key: "sopr", slug: "sopr" },
  { key: "reserveRisk", slug: "reserve-risk" },
];

export default function OnchainPage() {
  return (
    <div className="space-y-12">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">On-chain</span>
          <DataBadge
            status={ONCHAIN_ANY ? "live-derived" : "coming-soon"}
            source={ONCHAIN_ANY ? ONCHAIN_SOURCE ?? undefined : undefined}
          />
        </div>
        <h1 className="font-display text-[34px] sm:text-[40px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          What the blockchain itself is saying.
        </h1>
        <p className="mt-5 text-[15px] lg:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          On-chain data reads conviction directly from the network — how coins are valued against
          their cost basis, how long-term holders behave, and how the user base keeps growing.
        </p>
      </header>

      {ONCHAIN_ANY ? <LiveOnchain /> : <ComingSoonOnchain />}
    </div>
  );
}

function LiveOnchain() {
  const read = LTH_AVAILABLE ? lthRead() : null;
  const adoption = ADOPTION_AVAILABLE ? adoptionRead() : null;
  const realized = currentValue("realizedPrice");
  const spot = SPOT?.price ?? TODAY.price;

  return (
    <>
      {/* Live readings */}
      <section>
        <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100 mb-4">
          Live on-chain readings
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
          {OSCILLATORS.map((o) => {
            const v = currentValue(o.key);
            const m = metricBySlug(o.slug);
            if (v == null || !m) return null;
            const z = zoneFor(m, v);
            return (
              <div key={o.key} className="bg-[#0b0f15] px-4 py-4">
                <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{m.short}</div>
                <div className="mt-1.5 font-mono text-[18px] text-ink-50 tabular-nums">
                  {v.toFixed(m.decimals)}
                </div>
                <div className={`text-[11px] mt-0.5 ${ZONE_TEXT[z.zone] ?? "text-ink-300"}`}>{z.label}</div>
              </div>
            );
          })}
          {realized != null && (
            <div className="bg-[#0b0f15] px-4 py-4">
              <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">Realized price</div>
              <div className="mt-1.5 font-mono text-[18px] text-ink-50 tabular-nums">
                {fmtUsd(realized, { compact: true })}
              </div>
              <div className={`text-[11px] mt-0.5 ${spot >= realized ? "text-signal-green" : "text-signal-red"}`}>
                Market in {spot >= realized ? "profit" : "loss"}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* LTH vs cycle */}
      {read && <LthSection read={read} />}

      {/* Adoption */}
      {adoption && <AdoptionSection adoption={adoption} />}

      <p className="text-[11.5px] text-ink-500 leading-relaxed max-w-2xl">
        Source: {ONCHAIN_SOURCE}
        {ONCHAIN_UPDATED ? ` · updated ${format(new Date(ONCHAIN_UPDATED), "d MMM yyyy")}` : ""}. History,
        not advice.
      </p>
    </>
  );
}

function LthSection({ read }: { read: NonNullable<ReturnType<typeof lthRead>> }) {
  const ex = lthAroundExtremes(90);
  const data = lthVsPrice();
  const markers = lthMarkers();
  const fmtBtc = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M BTC` : `${Math.round(v).toLocaleString()} BTC`);
  const sign = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
  const tone = (v: number | null) => (v == null ? "text-ink-100" : v >= 0 ? "text-signal-green" : "text-signal-red");

  return (
    <section className="space-y-5">
      <div className="card-glow p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-center">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.18em] text-ink-400 mb-2">
              Long-term holder supply
            </div>
            <div className="font-display text-[36px] font-medium tracking-tightest text-ink-50 tabular-nums leading-none">
              {fmtBtc(read.current)}
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span
                className={`text-[14px] font-medium ${
                  read.trend === "accumulating"
                    ? "text-signal-green"
                    : read.trend === "distributing"
                      ? "text-signal-red"
                      : "text-ink-300"
                }`}
              >
                {read.trend === "accumulating" ? "Accumulating" : read.trend === "distributing" ? "Distributing" : "Holding steady"}
              </span>
              {read.pct90 != null && <span className={`font-mono text-[12px] ${tone(read.pct90)}`}>{sign(read.pct90)} · 90d</span>}
            </div>
          </div>
          <div>
            <h2 className="font-display text-[20px] lg:text-[24px] font-medium tracking-tight-2 text-ink-100 leading-snug">
              Do strong hands buy bottoms and sell tops?
            </h2>
            <p className="mt-3 text-[14px] text-ink-300 leading-relaxed">{read.summary}</p>
          </div>
        </div>
        <div className="watermark">halving.lens · on-chain</div>
      </div>

      {(ex.beforeHighsAvg != null || ex.beforeLowsAvg != null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-6">
            <div className="text-[10px] uppercase tracking-[0.16em] text-ink-400">LTH supply into cycle highs</div>
            <div className={`mt-2 font-display text-[30px] font-medium tracking-tight-2 tabular-nums ${tone(ex.beforeHighsAvg)}`}>
              {ex.beforeHighsAvg != null ? sign(ex.beforeHighsAvg) : "—"}
            </div>
            <p className="mt-2 text-[12px] text-ink-400">
              Change over the {ex.window}d before {ex.highsCount} cycle high{ex.highsCount === 1 ? "" : "s"} in the data
              window — holders typically distributing.
            </p>
          </div>
          <div className="card p-6">
            <div className="text-[10px] uppercase tracking-[0.16em] text-ink-400">LTH supply into cycle lows</div>
            <div className={`mt-2 font-display text-[30px] font-medium tracking-tight-2 tabular-nums ${tone(ex.beforeLowsAvg)}`}>
              {ex.beforeLowsAvg != null ? sign(ex.beforeLowsAvg) : "—"}
            </div>
            <p className="mt-2 text-[12px] text-ink-400">
              Change over the {ex.window}d before {ex.lowsCount} cycle low{ex.lowsCount === 1 ? "" : "s"} in the data
              window — holders typically accumulating.
            </p>
          </div>
        </div>
      )}

      <div className="card p-4 sm:p-7 relative">
        <h3 className="font-display text-[18px] font-medium tracking-tight-2 text-ink-100 mb-4">
          Long-term holder supply vs price
        </h3>
        <OnchainLthChart data={data} markers={markers} height={380} />
        <div className="watermark">halving.lens · LTH supply</div>
      </div>
    </section>
  );
}

function AdoptionSection({ adoption }: { adoption: NonNullable<ReturnType<typeof adoptionRead>> }) {
  const data = adoptionVsPrice();
  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">
          Adoption keeps compounding
        </h2>
        <p className="text-[12.5px] text-ink-400 mt-1.5 max-w-2xl">
          The address base vs price — adoption has historically grown through bull and bear markets
          alike.
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Fact label="Addresses" value={fmtNum(adoption.current, { compact: true })} />
        <Fact
          label="Growth · 1yr"
          value={adoption.yoyPct != null ? `${adoption.yoyPct >= 0 ? "+" : ""}${adoption.yoyPct.toFixed(1)}%` : "—"}
          tone={adoption.yoyPct}
        />
        <Fact
          label="Projected · +1yr"
          value={adoption.projOneYear != null ? fmtNum(adoption.projOneYear, { compact: true }) : "—"}
          sub="if the pace holds"
        />
      </div>
      <div className="card p-4 sm:p-7 relative">
        <AdoptionChart data={data} height={340} />
        <div className="watermark">halving.lens · adoption</div>
      </div>
      <p className="text-[12.5px] text-ink-300 leading-relaxed max-w-2xl">{adoption.summary}</p>
    </section>
  );
}

function Fact({ label, value, tone, sub }: { label: string; value: string; tone?: number | null; sub?: string }) {
  const color = tone == null ? "text-ink-50" : tone >= 0 ? "text-signal-green" : "text-signal-red";
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className={`mt-1.5 font-mono text-[18px] tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10.5px] text-ink-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function ComingSoonOnchain() {
  const planned = [
    "Long-term holder supply vs cycle highs and lows",
    "Address growth / adoption curve vs price",
    "MVRV Z-Score, NUPL, SOPR (valuation & profit-taking)",
    "Realized Price and Reserve Risk",
  ];
  return (
    <>
      <section className="card-glow p-6 lg:p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <h2 className="font-display text-[20px] lg:text-[24px] font-medium tracking-tight-2 text-ink-100 leading-snug">
            Connecting on-chain data
          </h2>
          <p className="mt-3.5 text-[14px] text-ink-300 leading-relaxed">
            On-chain cost-basis, holder and adoption data is being wired from{" "}
            <span className="text-ink-100">BGeometrics / bitcoin-data.com</span>. Once connected, the
            panels below switch on with real data — no estimated figures in the meantime.
          </p>
        </div>
        <div className="watermark">halving.lens · on-chain</div>
      </section>
      <section className="card p-6 lg:p-7">
        <h3 className="text-[12.5px] font-medium text-ink-100 mb-4 uppercase tracking-[0.16em]">What&apos;s coming</h3>
        <ul className="space-y-2.5">
          {planned.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[13px] text-ink-300">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent/60 shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
