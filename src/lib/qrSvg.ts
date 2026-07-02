// Branded QR code as a self-contained SVG string. Server-only (uses the `qrcode`
// encoder). Encodes a HalvingLens short link and presents it the way a premium
// brand would: the scannable code stays dark-on-light for maximum reliability
// (error-correction level H, so the centre logo never breaks a scan), wrapped in
// a dark branded frame with the wordmark and short URL.
//
// Reliability notes: modules are plain squares (no rounding) and the quiet zone
// is preserved, so this scans on every phone camera. The centre logo occludes
// well under the ~30% recovery budget of EC level H.

import QRCode from "qrcode";

const GOLD = "#d9b96a";
const INK = "#0b0f15"; // module colour (dark) — high contrast on the light panel
const PANEL = "#f4f1ea"; // warm off-white code panel (brand ink-50)
const CARD = "#0a0c10"; // dark brand card
const CARD_HI = "#13161d";
const BORDER = "#23272f";
const SUB = "#8c919c";

export interface QrOptions {
  framed?: boolean; // include the dark brand frame + wordmark + caption (default true)
  caption?: string; // small line under the code, e.g. the short URL or campaign name
  size?: number; // target pixel size of the code panel (default 640)
  logo?: boolean; // draw the centre HalvingLens diamond (default true)
}

// Escape text for safe inclusion in SVG.
function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function qrSvg(url: string, opts: QrOptions = {}): string {
  const { framed = true, caption, size = 640, logo = true } = opts;

  // Encode. Level H gives ~30% recovery — the budget the centre logo spends.
  const qr = QRCode.create(url, { errorCorrectionLevel: "H" });
  const count = qr.modules.size;
  const data = qr.modules.data; // 1 = dark module
  const quiet = 4; // quiet-zone modules on each side (required for reliable scans)
  const dim = count + quiet * 2;

  // Draw in a `dim`×`dim` module grid; the outer viewBox scales to pixels.
  const px = size;
  const cell = px / dim;

  // Centre logo knockout region (in modules), sized to stay within EC-H budget.
  const logoModules = logo ? Math.round(count * 0.22) : 0;
  const logoStart = Math.floor((count - logoModules) / 2);
  const logoEnd = logoStart + logoModules;

  // Build the dark modules as a single path for a compact, crisp SVG.
  let d = "";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!data[r * count + c]) continue;
      // Skip the centre so the logo knockout is clean.
      if (logo && r >= logoStart && r < logoEnd && c >= logoStart && c < logoEnd) continue;
      const x = (c + quiet) * cell;
      const y = (r + quiet) * cell;
      // +0.5px overlap kills hairline seams between rects at some zoom levels.
      d += `M${fmt(x)} ${fmt(y)}h${fmt(cell + 0.5)}v${fmt(cell + 0.5)}h${fmt(-(cell + 0.5))}z`;
    }
  }

  const codePanel = `
    <rect x="0" y="0" width="${px}" height="${px}" rx="${fmt(px * 0.06)}" fill="${PANEL}"/>
    <path d="${d}" fill="${INK}" shape-rendering="crispEdges"/>
    ${logo ? centreLogo(px) : ""}`;

  if (!framed) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}" role="img" aria-label="QR code">${codePanel}</svg>`;
  }

  // Framed presentation: dark card, wordmark, code panel, caption.
  const pad = Math.round(px * 0.11);
  const headerH = Math.round(px * 0.2);
  const footerH = caption ? Math.round(px * 0.14) : Math.round(px * 0.06);
  const W = px + pad * 2;
  const H = headerH + px + footerH + pad;
  const wordSize = Math.round(px * 0.052);
  const capSize = Math.round(px * 0.04);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="HalvingLens QR code">
  <rect x="0" y="0" width="${W}" height="${H}" rx="${fmt(px * 0.05)}" fill="${CARD}"/>
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${fmt(px * 0.05)}" fill="none" stroke="${BORDER}" stroke-width="1.5"/>
  <g transform="translate(${pad}, ${Math.round(headerH * 0.42)})">
    <text x="0" y="0" fill="#f4f1ea" font-family="-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-weight="700" font-size="${wordSize}" letter-spacing="${fmt(wordSize * 0.16)}">
      <tspan fill="${GOLD}">◆</tspan>  HALVINGLENS
    </text>
    <text x="0" y="${Math.round(wordSize * 1.5)}" fill="${SUB}" font-family="-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-weight="400" font-size="${fmt(wordSize * 0.62)}" letter-spacing="${fmt(wordSize * 0.05)}">Scan to open</text>
  </g>
  <g transform="translate(${pad}, ${headerH})">${codePanel}</g>
  ${caption ? `<text x="${W / 2}" y="${headerH + px + Math.round(footerH * 0.62)}" text-anchor="middle" fill="${SUB}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${capSize}">${esc(caption)}</text>` : ""}
</svg>`;
}

// The HalvingLens diamond mark on a light knockout, centred over the code.
function centreLogo(px: number): string {
  const s = px * 0.2; // knockout square side
  const o = (px - s) / 2;
  const cx = px / 2;
  const cy = px / 2;
  const r = s * 0.34;
  return `
    <rect x="${fmt(o)}" y="${fmt(o)}" width="${fmt(s)}" height="${fmt(s)}" rx="${fmt(s * 0.24)}" fill="${CARD}"/>
    <rect x="${fmt(o + 2)}" y="${fmt(o + 2)}" width="${fmt(s - 4)}" height="${fmt(s - 4)}" rx="${fmt(s * 0.2)}" fill="none" stroke="${GOLD}" stroke-width="${fmt(px * 0.006)}" opacity="0.7"/>
    <path d="M${fmt(cx)} ${fmt(cy - r)} L${fmt(cx + r)} ${fmt(cy)} L${fmt(cx)} ${fmt(cy + r)} L${fmt(cx - r)} ${fmt(cy)} Z" fill="${GOLD}"/>`;
}

// Trim floats to 2dp to keep the SVG small.
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
