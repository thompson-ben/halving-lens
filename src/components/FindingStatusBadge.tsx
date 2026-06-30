import { FINDING_STATUS_META, type FindingStatus } from "@/lib/findings";

// Small lifecycle badge for a Research Finding (Active / Updated / Superseded /
// Archived / Deprecated). The permanent Research ID never changes; this conveys
// the finding's current standing — the institutional-journal touch.

const TONE: Record<"green" | "gold" | "dim", string> = {
  green: "border-signal-green/30 text-signal-green bg-signal-green/[0.08]",
  gold: "border-[#4a3f23] text-[#d9b96a] bg-[#d9b96a]/[0.08]",
  dim: "border-white/[0.12] text-ink-400 bg-white/[0.03]",
};

export function FindingStatusBadge({ status, className = "" }: { status: FindingStatus; className?: string }) {
  const meta = FINDING_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-[0.12em] ${TONE[meta.tone]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {meta.label}
    </span>
  );
}
