import { HalvingCountdown } from "@/components/HalvingCountdown";
import { HALVING_EVENTS } from "@/lib/data/types";

export const metadata = {
  title: "The Halving",
  description:
    "The Bitcoin halving explained: what it changes, every past halving with dates and block heights, and a live countdown to the next one.",
  alternates: { canonical: "/halving" },
};

// Dates and block heights come from the canonical HALVING_EVENTS authority
// (UTC calendar date of the halving block) — this page keeps no independent
// date record of its own.

// UTC-safe date formatting: `format(new Date(iso))` renders in the server's
// local timezone, which can shift a UTC date across midnight. The halving
// dates ARE UTC dates, so format them from the ISO parts directly.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtUtcDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
const HALVINGS_PAST = [
  { ...HALVING_EVENTS[2], before: 50, after: 25 },
  { ...HALVING_EVENTS[3], before: 25, after: 12.5 },
  { ...HALVING_EVENTS[4], before: 12.5, after: 6.25 },
  { ...HALVING_EVENTS[5], before: 6.25, after: 3.125 },
];
const HALVING_NEXT = { label: "~2028", block: 1_050_000, before: 3.125, after: 1.5625 };

export default function HalvingPage() {
  return (
    <div className="space-y-12">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-4">Halving</div>
        <h1 className="font-display text-[34px] sm:text-[40px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Bitcoin&apos;s four-year clock.
        </h1>
        <p className="mt-5 text-[15px] lg:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          Every 210,000 blocks — roughly four years — the reward miners earn per block is cut in
          half. It&apos;s the event that paces Bitcoin&apos;s supply and, historically, its cycles.
        </p>
      </header>

      <HalvingCountdown />

      <section className="card p-6 lg:p-8">
        <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100 mb-3">
          What actually happens?
        </h2>
        <p className="text-[14px] text-ink-300 leading-relaxed max-w-3xl">
          Nothing dramatic at the moment itself — one block is mined, and from the next block on,
          miners receive half as much new BTC. The effect is slow and structural: the flow of new
          supply hitting the market halves overnight, and keeps halving every cycle until the last
          coin is mined around 2140. With demand unchanged, less new supply has historically
          preceded the cycle&apos;s expansion phase — though that&apos;s a pattern from only a few
          cycles, not a guarantee.
        </p>
      </section>

      <section>
        <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100 mb-5">
          Every halving so far
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400 border-b border-white/[0.04]">
                <th className="px-5 py-4 font-medium">Date (UTC)</th>
                <th className="px-3 py-4 font-medium text-right">Block</th>
                <th className="px-3 py-4 font-medium text-right">Reward</th>
                <th className="px-3 py-4 font-medium text-right">New BTC / day</th>
              </tr>
            </thead>
            <tbody>
              {HALVINGS_PAST.map((h) => (
                <tr key={h.blockHeight} className="row-hover border-b border-white/[0.03]">
                  <td className="px-5 py-4 text-ink-100 font-medium">
                    {fmtUtcDate(h.date)}
                  </td>
                  <td className="px-3 py-4 text-right font-mono tabular-nums text-ink-300">
                    {h.blockHeight.toLocaleString()}
                  </td>
                  <td className="px-3 py-4 text-right font-mono tabular-nums text-ink-200">
                    {h.before} → {h.after} BTC
                  </td>
                  <td className="px-3 py-4 text-right font-mono tabular-nums text-ink-300">
                    {Math.round(h.after * 144).toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-accent/[0.04]">
                <td className="px-5 py-4 text-accent font-medium">
                  {HALVING_NEXT.label} <span className="text-[10px] uppercase tracking-[0.16em]">next</span>
                </td>
                <td className="px-3 py-4 text-right font-mono tabular-nums text-accent/80">
                  {HALVING_NEXT.block.toLocaleString()}
                </td>
                <td className="px-3 py-4 text-right font-mono tabular-nums text-accent/80">
                  {HALVING_NEXT.before} → {HALVING_NEXT.after} BTC
                </td>
                <td className="px-3 py-4 text-right font-mono tabular-nums text-accent/80">
                  {Math.round(HALVING_NEXT.after * 144).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11.5px] text-ink-500">
          Dates are UTC — the calendar date containing each halving block. Block 840,000 was mined
          at 00:09:27 UTC on 20 April 2024.
        </p>
      </section>
    </div>
  );
}
