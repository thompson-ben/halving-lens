import { cn } from "@/lib/cn";
import type { MetricDef, Zone } from "@/lib/metrics";
import { zoneFor, ZONE_TONE } from "@/lib/metrics";

const TONE_FILL: Record<NonNullable<ReturnType<typeof zoneFor>["zone"]>, string> = {
  bottom: "#5aa9ff",
  accumulation: "#3ddc97",
  neutral: "#586475",
  bullish: "#5eead4",
  euphoria: "#f5b942",
  top: "#ff5d5d",
};

const ZONE_TEXT: Record<Zone, string> = {
  bottom: "text-signal-blue",
  accumulation: "text-signal-green",
  neutral: "text-ink-300",
  bullish: "text-signal-green",
  euphoria: "text-signal-amber",
  top: "text-signal-red",
};

/**
 * Horizontal banded gauge for a metric. Renders the band ranges as a
 * gradient stack and a marker for the current value.
 */
export function MetricGauge({
  metric,
  value,
  height = 8,
  domainMin,
  domainMax,
}: {
  metric: MetricDef;
  value: number;
  height?: number;
  domainMin?: number;
  domainMax?: number;
}) {
  const lo = domainMin ?? metric.yMin ?? metric.bands[0].max;
  const hi = domainMax ?? metric.yMax ?? metric.bands[metric.bands.length - 1].min + 2;
  const range = hi - lo || 1;

  // Build segments for each band that overlaps the domain.
  const segments = metric.bands
    .map((b) => {
      const start = Math.max(lo, b.min);
      const end = Math.min(hi, b.max);
      if (end <= start) return null;
      return {
        leftPct: ((start - lo) / range) * 100,
        widthPct: ((end - start) / range) * 100,
        color: TONE_FILL[b.zone],
        zone: b.zone,
      };
    })
    .filter(Boolean) as Array<{ leftPct: number; widthPct: number; color: string; zone: Zone }>;

  const valuePct = Math.max(0, Math.min(100, ((value - lo) / range) * 100));
  const { zone, label } = zoneFor(metric, value);

  return (
    <div>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 rounded-full overflow-hidden bg-white/[0.03]">
          {segments.map((s, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0"
              style={{
                left: `${s.leftPct}%`,
                width: `${s.widthPct}%`,
                background: s.color,
                opacity: 0.55,
              }}
            />
          ))}
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full ring-2 ring-ink-950"
          style={{
            left: `${valuePct}%`,
            width: height + 6,
            height: height + 6,
            background: TONE_FILL[zone],
            boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 0 12px ${TONE_FILL[zone]}66`,
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-2 text-[11px]">
        <span className="text-ink-400">
          {metric.bands[0].label} <span className="text-ink-600">·</span>
        </span>
        <span className={cn("font-medium", ZONE_TEXT[zone])}>{label}</span>
        <span className="text-ink-400">
          <span className="text-ink-600">·</span> {metric.bands[metric.bands.length - 1].label}
        </span>
      </div>
    </div>
  );
}
