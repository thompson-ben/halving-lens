import type { Chain } from "@/lib/types";
import { CHAIN_COLOR, CHAIN_LABEL } from "@/lib/mockData";

export function ChainBadge({ chain, size = "sm" }: { chain: Chain; size?: "sm" | "xs" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border border-white/5 bg-white/[0.02] ${
        size === "xs" ? "px-1.5 py-0.5 text-[9.5px]" : "px-1.5 py-0.5 text-[10px]"
      } uppercase tracking-wider text-ink-300`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CHAIN_COLOR[chain] }} />
      {CHAIN_LABEL[chain]}
    </span>
  );
}
