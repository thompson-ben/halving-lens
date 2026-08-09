// A restrained micro-scale for the dashboard's instrument surfaces (CD4).
//
// Purely decorative: every scale is aria-hidden and always sits beside
// text stating the same fact — meaning is never carried by the visual or
// its colour alone. This component declares NO thresholds of its own:
// segmented scales receive their band table from the module that owns it
// (SCORE_BANDS, ACCUMULATION_BANDS); fill/marker scales encode only the
// bare canonical value they are given.

export interface ScaleSegment {
  /** Fraction of the track this band occupies, from its own table. */
  width: number;
  /** The band's own published colour. */
  color: string;
}

export function BandScale({
  value,
  max = 100,
  segments,
  mode = "marker",
}: {
  value: number;
  max?: number;
  /** Canonical band segments (owning module's table). Omit for a plain track. */
  segments?: ScaleSegment[];
  /** Plain-track treatment: "fill" grows to the value; "marker" pins it. */
  mode?: "fill" | "marker";
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  if (segments) {
    return (
      <div aria-hidden className="relative flex h-1 rounded-full overflow-hidden">
        {segments.map((s, i) => (
          <div key={i} className="h-full opacity-30" style={{ width: `${s.width}%`, backgroundColor: s.color }} />
        ))}
        <div className="absolute top-0 h-full w-[3px] rounded-full bg-ink-50" style={{ left: `calc(${pct}% - 1.5px)` }} />
      </div>
    );
  }

  if (mode === "fill") {
    return (
      <div aria-hidden className="h-1 rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full bg-accent/60" style={{ width: `${pct}%` }} />
      </div>
    );
  }

  return (
    <div aria-hidden className="relative h-1 rounded-full bg-white/[0.07]">
      <div className="absolute top-0 h-full w-[3px] rounded-full bg-ink-50" style={{ left: `calc(${pct}% - 1.5px)` }} />
    </div>
  );
}
