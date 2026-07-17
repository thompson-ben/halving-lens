// The HalvingLens "Aperture" brand mark as a standalone SVG string (transparent
// background), so the favicon, Apple touch icon and PWA icons all render the
// exact same gem. `full` includes the rounded tile; `glyph` is just the gem for
// compositing onto a full-bleed background (Apple / maskable icons).

const GRAD = `<defs><linearGradient id="hl" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5eead4"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs>`;
const GEM = `<path d="M16 4.4 L26.4 10.2 V21.8 L16 27.6 L5.6 21.8 V10.2 Z" fill="url(#hl)"/><circle cx="16" cy="16" r="4.4" fill="#0b0f15"/><circle cx="16" cy="16" r="1.7" fill="#5eead4"/>`;

export const BRAND_INK = "#0b0f15";

// Just the gem (transparent bg) — composite onto your own background.
export function markGlyphSvg(px: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${px}" height="${px}">${GRAD}${GEM}</svg>`;
}

export function markGlyphDataUri(px: number): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(markGlyphSvg(px))}`;
}
