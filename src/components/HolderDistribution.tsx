import type { HolderBucket } from "@/lib/types";
import { fmtNum, fmtPct } from "@/lib/format";

const BUCKET_COLORS = ["#ff5d5d", "#f5b942", "#5aa9ff", "#5eead4", "#a78bfa", "#3ddc97"];

export function HolderDistribution({ buckets }: { buckets: HolderBucket[] }) {
  const total = buckets.reduce((acc, b) => acc + b.pctSupply, 0) || 1;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[13.5px] font-medium text-ink-100">Holder distribution</h3>
          <div className="text-[11px] text-ink-400 mt-0.5">
            Where every token actually sits — by wallet rank
          </div>
        </div>
        <div className="text-[11px] text-ink-300">
          <span className="font-mono">{fmtNum(buckets.reduce((a, b) => a + b.wallets, 0))}</span>
          <span className="text-ink-400 ml-1">holders</span>
        </div>
      </div>

      <div className="h-3 w-full rounded-full overflow-hidden flex bg-white/[0.03]">
        {buckets.map((b, i) => (
          <div
            key={b.label}
            className="h-full"
            style={{
              width: `${(b.pctSupply / total) * 100}%`,
              backgroundColor: BUCKET_COLORS[i % BUCKET_COLORS.length],
              opacity: 0.85,
            }}
            title={`${b.label}: ${fmtPct(b.pctSupply * 100, 1, false)}`}
          />
        ))}
      </div>

      <ul className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5">
        {buckets.map((b, i) => (
          <li key={b.label} className="flex items-center gap-2 text-[12px]">
            <span
              className="w-2 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: BUCKET_COLORS[i % BUCKET_COLORS.length] }}
            />
            <span className="text-ink-300 flex-1 truncate">{b.label}</span>
            <span className="font-mono text-ink-100 tabular-nums">
              {fmtPct(b.pctSupply * 100, 1, false)}
            </span>
            <span className="font-mono text-ink-400 tabular-nums text-[11px]">
              {fmtNum(b.wallets, { compact: true })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
