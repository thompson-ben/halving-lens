import { cn } from "@/lib/cn";

const PALETTE = ["#5eead4", "#a78bfa", "#f5b942", "#5aa9ff", "#ff7eb9", "#3ddc97"];

function hashIndex(s: string, mod: number) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function TokenIcon({
  symbol,
  size = 28,
  className,
}: {
  symbol: string;
  size?: number;
  className?: string;
}) {
  const c1 = PALETTE[hashIndex(symbol, PALETTE.length)];
  const c2 = PALETTE[hashIndex(symbol + "x", PALETTE.length)];
  const initial = symbol.slice(0, 2);
  return (
    <div
      className={cn(
        "shrink-0 grid place-items-center rounded-full font-semibold text-ink-950",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
        fontSize: size * 0.38,
      }}
    >
      {initial}
    </div>
  );
}
