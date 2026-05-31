// Generates the Instagram avatar logo — a "C" as a cycle ring, in halving.lens
// brand colours (teal #5eead4 → violet #a78bfa on charcoal #05070a).
// Renders 1080x1080 PNGs (Instagram displays the avatar as a circle).
//   node scripts/brand-logo.mjs
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const TEAL = "#5eead4";
const VIOLET = "#a78bfa";
const BASE = "#05070a";

// A "C" built from an open cycle ring (gap on the right, like a C / a cycle that
// hasn't closed) with a halving-lens hexagon "lens" node sitting in the gap.
function svg({ bg = true } = {}) {
  const S = 1080;
  const cx = S / 2;
  const cy = S / 2;
  const r = 300; // ring radius
  const sw = 96; // ring stroke width

  // Open arc: start at +52° (upper right), sweep counter-clockwise ~256° around
  // to -52° (lower right), leaving an open mouth on the right = the "C".
  const a0 = (52 * Math.PI) / 180;
  const a1 = (-52 * Math.PI) / 180;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy - r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy - r * Math.sin(a1);
  // large-arc=1, sweep=0 to go the long way round (counter-clockwise visually).
  const arc = `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 1 0 ${x1.toFixed(1)} ${y1.toFixed(1)}`;

  // Hexagon lens node in the mouth of the C (right side), echoing the app mark.
  const hx = cx + r; // sits on the ring, right
  const hy = cy;
  const hr = 96; // hex radius
  const hexPts = Array.from({ length: 6 }, (_, i) => {
    const ang = (Math.PI / 180) * (60 * i - 30);
    return `${(hx + hr * Math.cos(ang)).toFixed(1)},${(hy + hr * Math.sin(ang)).toFixed(1)}`;
  }).join(" ");

  return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="${S}" y2="${S}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${TEAL}"/>
      <stop offset="100%" stop-color="${VIOLET}"/>
    </linearGradient>
    <radialGradient id="bgGrad" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#0c1118"/>
      <stop offset="100%" stop-color="${BASE}"/>
    </radialGradient>
  </defs>
  ${bg ? `<rect width="${S}" height="${S}" fill="url(#bgGrad)"/>` : ""}
  <!-- faint full cycle track behind the C -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${TEAL}" stroke-opacity="0.10" stroke-width="${sw}"/>
  <!-- the C / open cycle arc -->
  <path d="${arc}" fill="none" stroke="url(#g)" stroke-width="${sw}" stroke-linecap="round"/>
  <!-- hexagon lens node in the gap -->
  <polygon points="${hexPts}" fill="${BASE}" stroke="url(#g)" stroke-width="14"/>
  <circle cx="${hx}" cy="${hy}" r="34" fill="url(#g)"/>
  <circle cx="${hx}" cy="${hy}" r="13" fill="${BASE}"/>
</svg>`;
}

const variants = [
  { name: "instagram-logo-C.png", bg: true },
  { name: "instagram-logo-C-transparent.png", bg: false },
];

for (const v of variants) {
  const buf = Buffer.from(svg({ bg: v.bg }));
  await sharp(buf, { density: 384 }).png().toFile(`brand/${v.name}`);
  await writeFile(`brand/${v.name.replace(".png", ".svg")}`, svg({ bg: v.bg }));
  console.log("wrote brand/" + v.name);
}
