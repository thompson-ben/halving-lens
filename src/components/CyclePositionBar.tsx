import type { HeatLevel } from "@/lib/cycleSummary";

// Signature visual: a cycle "thermometer" — Cool → Mid → Warm → Elevated →
// Euphoria — with a marker at today's heat. Mobile-first, pure CSS, no JS.
// Used in the hero and the scorecard so the read is instant.

const ZONES: { key: HeatLevel; label: string; color: string }[] = [
  { key: "cool", label: "Cool", color: "#5aa9ff" },
  { key: "neutral", label: "Mid", color: "#5eead4" },
  { key: "heating", label: "Warm", color: "#3ddc97" },
  { key: "elevated", label: "Elevated", color: "#f5b942" },
  { key: "euphoria", label: "Euphoria", color: "#ff5d5d" },
];

export function CyclePositionBar({
  heat,
  percentile,
  showLabels = true,
  height = "md",
}: {
  heat: HeatLevel;
  percentile?: number | null; // 0-100 position along the bar; falls back to zone centre
  showLabels?: boolean;
  height?: "sm" | "md";
}) {
  const idx = ZONES.findIndex((z) => z.key === heat);
  const markerPct =
    percentile != null ? Math.min(100, Math.max(0, percentile)) : (idx + 0.5) * 20;
  const barH = height === "sm" ? "h-2" : "h-2.5";

  return (
    <div>
      <div className="relative">
        <div className={`flex ${barH} rounded-full overflow-hidden`}>
          {ZONES.map((z) => (
            <div key={z.key} className="flex-1" style={{ background: z.color, opacity: 0.85 }} />
          ))}
        </div>
        {/* Today marker */}
        <div
          className="absolute -top-1.5 -translate-x-1/2"
          style={{ left: `${markerPct}%` }}
          aria-hidden
        >
          <div
            className={`${height === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} rounded-full bg-ink-50 ring-2 ring-ink-950`}
            style={{ boxShadow: "0 0 12px rgba(255,255,255,0.55)" }}
          />
        </div>
      </div>

      {showLabels && (
        <div className="mt-2.5 flex justify-between text-[10px] font-mono tracking-wide">
          {ZONES.map((z, i) => (
            <span
              key={z.key}
              className={i === idx ? "text-ink-100 font-medium" : "text-ink-500"}
            >
              {z.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
