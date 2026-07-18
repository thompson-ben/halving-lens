import type { ResearchBadge } from "@/lib/researchBadges";

// Renders a row of editorial badges. Presentational only — badge selection lives
// in lib/researchBadges.ts so it stays deterministic and testable.

const TONE: Record<ResearchBadge["tone"], { border: string; bg: string; color: string }> = {
  gold: { border: "rgba(217,185,106,0.35)", bg: "rgba(217,185,106,0.10)", color: "#d9b96a" },
  teal: { border: "rgba(94,201,183,0.35)", bg: "rgba(94,201,183,0.10)", color: "#5ec9b7" },
  violet: { border: "rgba(167,139,250,0.35)", bg: "rgba(167,139,250,0.10)", color: "#a78bfa" },
  dim: { border: "rgba(255,255,255,0.10)", bg: "rgba(255,255,255,0.03)", color: "#9aa1ac" },
};

export function ResearchBadges({ badges, className = "" }: { badges: ResearchBadge[]; className?: string }) {
  if (!badges.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {badges.map((b) => {
        const t = TONE[b.tone];
        return (
          <span
            key={b.key}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]"
            style={{ borderColor: t.border, background: t.bg, color: t.color }}
          >
            <span aria-hidden className="not-italic">{b.emoji}</span>
            {b.label}
          </span>
        );
      })}
    </div>
  );
}
