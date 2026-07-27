// HalvingLens Social Design System — tokens and archetype primitives for the
// 1080×1350 carousel cards (Satori-rendered; flex-only, no canvas).
//
// The brand lives in the chrome, typography, colour and spacing; the LAYOUT
// belongs to each pack's story. These tokens are the shared part. The type
// scale is the hierarchy engine: adjacent tiers differ by ≥1.7×, hero-to-body
// by ≥5×, so a slide's one hero element dominates by construction.
//
// First consumer: the Four Reference Prices carousel (archetypes STATEMENT →
// SCALE → BIG NUMBER → CTA). Other packs migrate incrementally.

export const T = {
  // Colour (mirrors the house palette used across cardTemplates)
  bg: "linear-gradient(165deg, #0d1219 0%, #0a0e14 58%, #070a0f 100%)",
  ink: "#f3f6fa",
  inkDim: "#9aa6b4",
  inkFaint: "#6f7c8e",
  accent: "#5eead4",
  hairline: "rgba(255,255,255,0.09)",
  green: "#3ddc97",
  red: "#ff5d5d",
  // Reference-series identity tokens — identical to every other framework
  // surface, so recognition compounds across site, email and social.
  series: {
    market: "#5eead4",
    trend: "#8893a4",
    holders: "#f5b942",
    miners: "#a78bfa",
  },
  // Type scale
  sans: "Inter",
  display: "Fraunces",
  type: {
    hero: 236, // one per carousel — the poster slide's numeral
    headline: 78, // the statement tier (Fraunces)
    insight: 38, // the ONE supporting line per slide
    body: 30,
    meta: 24, // tracked caps, ink-faint
  },
  // Spacing (8px grid)
  margin: 96,
  heroGap: 120, // mandatory emptiness between hero block and support block
} as const;

// A dashed/dotted horizontal rule, Satori-safe (no SVG strokeDasharray):
// rendered as a repeating-linear-gradient strip.
export function ruleStyle(color: string, variant: "solid" | "dashed" | "dotted"): Record<string, string | number> {
  if (variant === "solid") return { display: "flex", height: 3, background: color, borderRadius: 2 };
  const on = variant === "dashed" ? 16 : 5;
  const off = variant === "dashed" ? 12 : 9;
  return {
    display: "flex",
    height: 3,
    borderRadius: 2,
    backgroundImage: `repeating-linear-gradient(90deg, ${color} 0px, ${color} ${on}px, transparent ${on}px, transparent ${on + off}px)`,
  };
}

// Caps label + value fact row — the quiet supporting tier of BIG NUMBER slides.
export function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingTop: 22, paddingBottom: 22, borderTop: `1px solid ${T.hairline}` }}>
      <div style={{ display: "flex", fontSize: T.type.meta, letterSpacing: 3, color: T.inkFaint, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", fontSize: 34, fontWeight: 600, color: T.ink }}>{value}</div>
    </div>
  );
}
