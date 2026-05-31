import { Download } from "lucide-react";
import { cn } from "@/lib/cn";

// Downloads the live /og share card (also used for social unfurls). Plain
// anchor — no client JS, no extra dependency.
export function ShareCardButton({ className }: { className?: string }) {
  return (
    <a
      href="/og"
      download="halving-lens.png"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[11px] text-ink-300 hover:text-ink-100 hover:border-accent/30 transition-colors",
        className,
      )}
    >
      <Download size={12} strokeWidth={1.8} />
      Share image
    </a>
  );
}
